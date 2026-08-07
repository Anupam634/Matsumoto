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

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.maxPerDevice = Number(config.get('MAX_ACCOUNTS_PER_DEVICE') ?? 3);
    this.maxPerIp = Number(config.get('MAX_ACCOUNTS_PER_IP') ?? 5);
  }

  /** Distinct user ids that have ever been seen on a device / IP. */
  private async accountsOn(where: {
    fingerprint?: string;
    lastIp?: string;
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
