import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { TtlCache } from '../common/ttl-cache';

/**
 * Security settings an operator can change from the admin panel.
 *
 * Each one has an environment variable of the same name, which stays the
 * default. A value saved from the panel is stored in AppSetting and wins over
 * the env until it is reset — which is the fix for the Security tab that used
 * to show these numbers in an editable form, report "saved", and change
 * nothing: the caps were read once from the env at boot, so whatever the
 * operator typed reverted to the env value on the next page load.
 */
interface IntDef {
  key: string;
  kind: 'int';
  min: number;
  max: number;
  fallback: number;
}
interface BoolDef {
  key: string;
  kind: 'bool';
  fallback: boolean;
}

export const SECURITY_SETTINGS = {
  /** Accounts one device fingerprint may open (SPEC §7). */
  maxAccountsPerDevice: { key: 'MAX_ACCOUNTS_PER_DEVICE', kind: 'int', min: 1, max: 1_000, fallback: 3 },
  /** Accounts one IP address may open. */
  maxAccountsPerIp: { key: 'MAX_ACCOUNTS_PER_IP', kind: 'int', min: 1, max: 100_000, fallback: 5 },
  /** Accounts one IPv4 /24 may open; 0 turns the check off. */
  maxAccountsPerSubnet: { key: 'MAX_ACCOUNTS_PER_SUBNET', kind: 'int', min: 0, max: 1_000_000, fallback: 0 },
  /**
   * Refuse withdrawals from accounts without an authenticator app. Off by
   * default: turning it on stops every miner who has not set one up from
   * withdrawing until they do.
   */
  requireTotpForWithdrawal: { key: 'REQUIRE_TOTP_FOR_WITHDRAWAL', kind: 'bool', fallback: false },
} satisfies Record<string, IntDef | BoolDef>;

export type SecuritySettingName = keyof typeof SECURITY_SETTINGS;

export interface EffectiveSecuritySettings {
  maxAccountsPerDevice: number;
  maxAccountsPerIp: number;
  maxAccountsPerSubnet: number;
  requireTotpForWithdrawal: boolean;
}

export interface SecuritySettingView {
  value: number | boolean;
  /** Where `value` came from: the admin panel, the env, or the built-in default. */
  source: 'admin' | 'env' | 'default';
  /** What the setting falls back to when the panel override is reset. */
  defaultValue: number | boolean;
  min?: number;
  max?: number;
  updatedAt: Date | null;
  updatedBy: string | null;
}

export type SecuritySettingsView = Record<SecuritySettingName, SecuritySettingView>;

/** `null` resets a setting to its env default. */
export type SecuritySettingsPatch = Partial<Record<SecuritySettingName, number | boolean | null>>;

type Row = { key: string; value: string; updatedAt: Date; updatedBy: string | null };

function parse(def: IntDef | BoolDef, raw: string | undefined): number | boolean | undefined {
  if (raw === undefined || raw.trim() === '') return undefined;
  if (def.kind === 'bool') {
    const v = raw.trim().toLowerCase();
    if (v === 'true') return true;
    if (v === 'false') return false;
    return undefined;
  }
  const n = Number(raw);
  return Number.isInteger(n) && n >= def.min && n <= def.max ? n : undefined;
}

/**
 * Short, because a change made in the panel should land within seconds on
 * every instance; the instance that saved it drops its copy at once.
 */
const CACHE_TTL_MS = 10_000;

@Injectable()
export class SecuritySettingsService {
  private readonly logger = new Logger(SecuritySettingsService.name);
  private readonly cache = new TtlCache(CACHE_TTL_MS, 2);
  private warnedUnreadable = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Rows for every setting. A database that cannot answer (the table not
   * created yet, the pool exhausted) yields none, so the env values apply —
   * an unreadable settings table must not take sign-up down with it.
   */
  private rows(): Promise<Map<string, Row>> {
    return this.cache.wrap('rows', async () => {
      try {
        const rows = await this.prisma.appSetting.findMany({
          where: { key: { in: Object.values(SECURITY_SETTINGS).map((d) => d.key) } },
        });
        this.warnedUnreadable = false;
        return new Map(rows.map((r) => [r.key, r]));
      } catch (err) {
        if (!this.warnedUnreadable) {
          this.warnedUnreadable = true;
          this.logger.error(
            `Could not read security settings (${err instanceof Error ? err.message : err}) — using the env values.`,
          );
        }
        return new Map<string, Row>();
      }
    });
  }

  private resolve(name: SecuritySettingName, rows: Map<string, Row>): SecuritySettingView {
    const def: IntDef | BoolDef = SECURITY_SETTINGS[name];
    const envValue = parse(def, this.config.get<string>(def.key));
    const defaultValue = envValue ?? def.fallback;
    const row = rows.get(def.key);
    const saved = row ? parse(def, row.value) : undefined;
    return {
      value: saved ?? defaultValue,
      source: saved !== undefined ? 'admin' : envValue !== undefined ? 'env' : 'default',
      defaultValue,
      ...(def.kind === 'int' ? { min: def.min, max: def.max } : {}),
      updatedAt: saved !== undefined ? row!.updatedAt : null,
      updatedBy: saved !== undefined ? row!.updatedBy : null,
    };
  }

  async view(): Promise<SecuritySettingsView> {
    const rows = await this.rows();
    const names = Object.keys(SECURITY_SETTINGS) as SecuritySettingName[];
    return Object.fromEntries(names.map((n) => [n, this.resolve(n, rows)])) as SecuritySettingsView;
  }

  /** The values the rest of the API enforces. */
  async effective(): Promise<EffectiveSecuritySettings> {
    const view = await this.view();
    return {
      maxAccountsPerDevice: view.maxAccountsPerDevice.value as number,
      maxAccountsPerIp: view.maxAccountsPerIp.value as number,
      maxAccountsPerSubnet: view.maxAccountsPerSubnet.value as number,
      requireTotpForWithdrawal: view.requireTotpForWithdrawal.value as boolean,
    };
  }

  /**
   * Save panel overrides. Validated against the same bounds the env values
   * are, and all-or-nothing: one bad field rejects the whole request rather
   * than saving half of what the operator pressed Save on.
   */
  async update(patch: SecuritySettingsPatch, updatedBy: string): Promise<SecuritySettingsView> {
    const writes: { key: string; value: string | null }[] = [];

    for (const [name, value] of Object.entries(patch) as [SecuritySettingName, unknown][]) {
      const def: IntDef | BoolDef | undefined = SECURITY_SETTINGS[name];
      if (!def || value === undefined) continue;
      if (value === null) {
        writes.push({ key: def.key, value: null });
        continue;
      }
      if (def.kind === 'bool') {
        if (typeof value !== 'boolean') {
          throw new BadRequestException(`${name} must be true or false.`);
        }
        writes.push({ key: def.key, value: String(value) });
      } else {
        if (typeof value !== 'number' || !Number.isInteger(value) || value < def.min || value > def.max) {
          throw new BadRequestException(`${name} must be a whole number from ${def.min} to ${def.max}.`);
        }
        writes.push({ key: def.key, value: String(value) });
      }
    }

    await this.prisma.$transaction(
      writes.map((w) =>
        w.value === null
          ? this.prisma.appSetting.deleteMany({ where: { key: w.key } })
          : this.prisma.appSetting.upsert({
              where: { key: w.key },
              create: { key: w.key, value: w.value, updatedBy },
              update: { value: w.value, updatedBy },
            }),
      ),
    );
    this.cache.invalidate();
    return this.view();
  }
}
