import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';

/**
 * Anti-abuse guards required by SPEC §7: multi-accounting, same-IP farms,
 * same-device farms and fake (self-)referrals.
 *
 * The signals live in the DeviceFingerprint table; this service is the only
 * place that decides what counts as abuse, so thresholds can be tuned in one
 * spot (env-configurable).
 */
@Injectable()
export class AntiabuseService {
  private readonly logger = new Logger(AntiabuseService.name);
  private readonly maxPerDevice: number;
  private readonly maxPerIp: number;
  private readonly maxPerSubnet: number;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.maxPerDevice = Number(config.get('MAX_ACCOUNTS_PER_DEVICE') ?? 3);
    this.maxPerIp = Number(config.get('MAX_ACCOUNTS_PER_IP') ?? 5);
    // 0 disables it. Off by default: a /24 can be one household or a whole
    // mobile carrier behind NAT, so the right number depends on the audience.
    this.maxPerSubnet = Number(config.get('MAX_ACCOUNTS_PER_SUBNET') ?? 0);
  }

  /**
   * The /24 an IPv4 address sits in, as a `startsWith` prefix. Null for
   * anything that is not plain IPv4 — an IPv6 caller has more addresses than
   * a prefix count could ever bound, so it is left to the other checks.
   */
  private subnetPrefix(ip: string): string | null {
    const parts = ip.trim().split('.');
    if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p))) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}.`;
  }

  /** Distinct user ids that have ever been seen on a device / IP. */
  private async accountsOn(where: {
    fingerprint?: string;
    lastIp?: string | { startsWith: string };
  }): Promise<string[]> {
    const rows = await this.prisma.deviceFingerprint.findMany({
      where,
      select: { userId: true },
      distinct: ['userId'],
    });
    return rows.map((r) => r.userId);
  }

  /**
   * Called before a new account is created. Throws when the device or IP has
   * already reached its account cap.
   */
  async assertSignupAllowed(signals: {
    fingerprint?: string;
    ip?: string;
  }): Promise<void> {
    if (signals.fingerprint) {
      const ids = await this.accountsOn({ fingerprint: signals.fingerprint });
      if (ids.length >= this.maxPerDevice) {
        this.logger.warn(
          `signup blocked: device ${signals.fingerprint} already has ${ids.length} accounts`,
        );
        throw new ForbiddenException(
          'This device has reached the maximum number of accounts.',
        );
      }
    }
    if (signals.ip) {
      const ids = await this.accountsOn({ lastIp: signals.ip });
      if (ids.length >= this.maxPerIp) {
        this.logger.warn(
          `signup blocked: ip ${signals.ip} already has ${ids.length} accounts`,
        );
        throw new ForbiddenException(
          'Too many accounts have been created from this network.',
        );
      }

      // Farms spread across neighbouring addresses of one rented range —
      // 154.16.137.131, .132, .195, .221 — which keeps every single address
      // under the per-IP cap. Counting the whole /24 is what catches that.
      const prefix = this.maxPerSubnet > 0 ? this.subnetPrefix(signals.ip) : null;
      if (prefix) {
        const subnetIds = await this.accountsOn({ lastIp: { startsWith: prefix } });
        if (subnetIds.length >= this.maxPerSubnet) {
          this.logger.warn(
            `signup blocked: subnet ${prefix}0/24 already has ${subnetIds.length} accounts`,
          );
          throw new ForbiddenException(
            'Too many accounts have been created from this network.',
          );
        }
      }
    }
  }

  /**
   * A referral is treated as fake when the referrer has been seen on the same
   * device or IP as the new user. The signup still succeeds — we just refuse
   * to credit the referral, which is what actually pays out (SPEC §2).
   */
  async isSelfReferral(
    referrerId: string,
    signals: { fingerprint?: string; ip?: string },
  ): Promise<boolean> {
    const or: Array<Record<string, string>> = [];
    if (signals.fingerprint) or.push({ fingerprint: signals.fingerprint });
    if (signals.ip) or.push({ lastIp: signals.ip });
    if (or.length === 0) return false;

    const hit = await this.prisma.deviceFingerprint.findFirst({
      where: { userId: referrerId, OR: or },
      select: { id: true },
    });
    return hit !== null;
  }

  /** Record (or refresh) the device/IP a user was last seen on. */
  async recordDevice(
    userId: string,
    signals: { fingerprint?: string; ip?: string },
  ): Promise<void> {
    const fingerprint = signals.fingerprint ?? 'unknown';
    const existing = await this.prisma.deviceFingerprint.findFirst({
      where: { userId, fingerprint },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.deviceFingerprint.update({
        where: { id: existing.id },
        data: { lastIp: signals.ip, seenAt: new Date() },
      });
      return;
    }
    await this.prisma.deviceFingerprint.create({
      data: { userId, fingerprint, lastIp: signals.ip },
    });
  }
}
