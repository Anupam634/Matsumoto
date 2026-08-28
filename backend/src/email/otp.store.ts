import { Logger } from '@nestjs/common';
import Redis from 'ioredis';

export type OtpPurpose = 'signup' | 'forgot_password' | 'login_2fa';

export interface OtpRecord {
  code: string;
  expiresAt: number;
  purpose: OtpPurpose;
}

/**
 * Where pending verification codes live.
 *
 * Codes were previously held in a plain in-process Map, so every restart
 * invalidated whatever users were mid-signup with, and a second instance
 * would never see the first one's codes. Redis fixes both — but the box may
 * not have one, so an unset REDIS_URL keeps exactly the old behaviour
 * instead of taking sign-ups down.
 */
export interface OtpStore {
  put(email: string, record: OtpRecord): Promise<void>;
  take(email: string): Promise<OtpRecord | null>;
  drop(email: string): Promise<void>;
  /**
   * Record a send against `email`'s allowance. Returns false when the
   * address has already had `max` codes inside `windowMs` — which stops an
   * attacker mail-bombing someone else's inbox through the signup form.
   */
  allowSend(email: string, max: number, windowMs: number): Promise<boolean>;
}

const key = (email: string) => `otp:${email}`;
const sendKey = (email: string) => `otp:sends:${email}`;

export class MemoryOtpStore implements OtpStore {
  private readonly codes = new Map<string, OtpRecord>();
  private readonly sends = new Map<string, number[]>();

  async put(email: string, record: OtpRecord) {
    this.codes.set(email, record);
  }

  async take(email: string) {
    const record = this.codes.get(email) ?? null;
    if (record && Date.now() > record.expiresAt) {
      this.codes.delete(email);
      return null;
    }
    return record;
  }

  async drop(email: string) {
    this.codes.delete(email);
  }

  async allowSend(email: string, max: number, windowMs: number) {
    const now = Date.now();
    const recent = (this.sends.get(email) ?? []).filter(
      (at) => now - at < windowMs,
    );
    if (recent.length >= max) {
      this.sends.set(email, recent);
      return false;
    }
    recent.push(now);
    this.sends.set(email, recent);
    return true;
  }
}

export class RedisOtpStore implements OtpStore {
  constructor(private readonly redis: Redis) {}

  async put(email: string, record: OtpRecord) {
    const ttlMs = Math.max(1, record.expiresAt - Date.now());
    await this.redis.set(key(email), JSON.stringify(record), 'PX', ttlMs);
  }

  async take(email: string) {
    const raw = await this.redis.get(key(email));
    if (!raw) return null;
    const record = JSON.parse(raw) as OtpRecord;
    if (Date.now() > record.expiresAt) {
      await this.drop(email);
      return null;
    }
    return record;
  }

  async drop(email: string) {
    await this.redis.del(key(email));
  }

  async allowSend(email: string, max: number, windowMs: number) {
    // INCR then set the expiry on first use: a fixed window is coarser than
    // a sliding one but needs a single round trip and cannot leak keys.
    const count = await this.redis.incr(sendKey(email));
    if (count === 1) {
      await this.redis.pexpire(sendKey(email), windowMs);
    }
    return count <= max;
  }
}

/**
 * Redis in front, memory behind.
 *
 * `createOtpStore` only ever guarded the *constructor*, and ioredis does not
 * connect there — it connects lazily and rejects the first command. So a
 * REDIS_URL pointing at a Redis that is down (or gone, or refusing auth)
 * left every command rejecting, and because nothing between here and the
 * controller catches it, sign-up, 2FA login and password reset all answered
 * a bare 500. Losing code persistence is bad; losing authentication
 * entirely is worse.
 *
 * A failed command demotes the store to memory for `retryAfterMs`, then one
 * request is allowed to try Redis again. Codes issued either side of a
 * switch do not carry across, so a user mid-signup may have to ask for a new
 * one — the same thing a restart already does to them.
 */
export class FailSoftOtpStore implements OtpStore {
  private readonly memory = new MemoryOtpStore();
  private degraded = false;
  private nextProbeAt = 0;

  constructor(
    private readonly primary: OtpStore,
    private readonly logger: Logger,
    private readonly retryAfterMs = 60_000,
  ) {}

  private async run<T>(
    op: string,
    onPrimary: (store: OtpStore) => Promise<T>,
    onMemory: (store: OtpStore) => Promise<T>,
  ): Promise<T> {
    if (this.degraded && Date.now() < this.nextProbeAt) {
      return onMemory(this.memory);
    }

    try {
      const result = await onPrimary(this.primary);
      if (this.degraded) {
        this.degraded = false;
        this.logger.log('Redis is answering again — verification codes are back in Redis.');
      }
      return result;
    } catch (err) {
      // Logged once per outage, not once per request: a Redis that is down
      // is down for every caller, and this runs on an unauthenticated route.
      if (!this.degraded) {
        this.logger.error(
          `OTP store ${op} failed (${(err as Error).message}) — holding verification codes in memory until Redis recovers.`,
        );
      }
      this.degraded = true;
      this.nextProbeAt = Date.now() + this.retryAfterMs;
      return onMemory(this.memory);
    }
  }

  put(email: string, record: OtpRecord) {
    return this.run(
      'put',
      (s) => s.put(email, record),
      (s) => s.put(email, record),
    );
  }

  take(email: string) {
    return this.run(
      'take',
      (s) => s.take(email),
      (s) => s.take(email),
    );
  }

  drop(email: string) {
    return this.run(
      'drop',
      (s) => s.drop(email),
      (s) => s.drop(email),
    );
  }

  allowSend(email: string, max: number, windowMs: number) {
    return this.run(
      'allowSend',
      (s) => s.allowSend(email, max, windowMs),
      (s) => s.allowSend(email, max, windowMs),
    );
  }
}

/**
 * Build the store the environment can actually support. A Redis that fails
 * to connect falls back rather than throwing: losing code persistence is
 * bad, losing sign-up entirely is worse.
 */
export function createOtpStore(logger: Logger): OtpStore {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    logger.warn(
      'REDIS_URL is not set — verification codes are held in memory and will not survive a restart.',
    );
    return new MemoryOtpStore();
  }

  try {
    const redis = new Redis(url, {
      // Fail the command instead of parking it: with the offline queue on
      // and retries stacked, a signup spent six seconds waiting on a Redis
      // that was never going to answer before it could fall back.
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2_000,
    });
    redis.on('error', (err) =>
      logger.error(`Redis error for the OTP store: ${err.message}`),
    );
    logger.log('Verification codes are stored in Redis.');
    return new FailSoftOtpStore(new RedisOtpStore(redis), logger);
  } catch (err) {
    logger.error(
      `Could not open Redis (${(err as Error).message}) — falling back to in-memory verification codes.`,
    );
    return new MemoryOtpStore();
  }
}
