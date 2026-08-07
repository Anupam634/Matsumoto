/**
 * Pure reward-math for the Matsumoto mining engine.
 *
 * Everything here is deterministic and side-effect free so it can be unit
 * tested in isolation. All point values flow as MILLI-POINTS (integer,
 * 1 point = 1000 milli) to avoid floating-point drift in balances.
 *
 * Rules mirror SPEC.md §2. If a number changes, change it in SPEC.md too.
 */

export const MILLI = 1000;
export const BASE_RATE_MILLI = 900; // 0.9 points/hour

/** Referral multiplier tiers, keyed by number of invited users (SPEC §2). */
export interface ReferralTier {
  minInvites: number;
  maxInvites: number;
  level: number;
  multiplier: number;
}

export const REFERRAL_TIERS: ReferralTier[] = [
  { minInvites: 0, maxInvites: 0, level: 1, multiplier: 1 },
  { minInvites: 1, maxInvites: 5, level: 2, multiplier: 3 },
  { minInvites: 6, maxInvites: 10, level: 3, multiplier: 4 },
  { minInvites: 11, maxInvites: 20, level: 4, multiplier: 5 },
  { minInvites: 21, maxInvites: 30, level: 5, multiplier: 6 },
  { minInvites: 31, maxInvites: 2000, level: 6, multiplier: 8 },
];

export function referralTierFor(inviteCount: number): ReferralTier {
  const n = Math.max(0, Math.floor(inviteCount));
  const tier = REFERRAL_TIERS.find(
    (t) => n >= t.minInvites && n <= t.maxInvites,
  );
  // Above the top band we clamp to the highest tier rather than falling back.
  return tier ?? REFERRAL_TIERS[REFERRAL_TIERS.length - 1];
}

export interface ActiveBooster {
  /** rate bonus this booster adds, in milli-points/hour (e.g. $1 => +2000). */
  rateBonusMilli: number;
  expiresAt: Date;
}

/**
 * Effective mining rate in milli-points/hour.
 *
 * Model (SPEC §2, default until client confirms §9 #1):
 *   rate = (base + Σ active booster bonuses) × referralMultiplier
 *
 * A single $1 booster: (900 + 2000) × 1 = 2900 milli = 2.9/hr  ✓ matches client.
 * Boosters are additive and stackable; expired ones are ignored.
 */
export function effectiveRateMilli(params: {
  boosters: ActiveBooster[];
  inviteCount: number;
  now?: Date;
}): number {
  const now = params.now ?? new Date();
  const bonus = params.boosters
    .filter((b) => b.expiresAt.getTime() > now.getTime())
    .reduce((sum, b) => sum + b.rateBonusMilli, 0);
  const base = BASE_RATE_MILLI + bonus;
  const mult = referralTierFor(params.inviteCount).multiplier;
  return base * mult;
}

/**
 * Points accrued for an elapsed period, capped at the 24h claim window.
 *
 * The user must tap "Mine" once per 24h; accrual only counts up to
 * `claimWindowHours` since the last tap (default 24). This is the
 * "offline earnings" a tap collects.
 */
export function accrueMilli(params: {
  rateMilli: number;
  lastMineAt: Date | null;
  now?: Date;
  claimWindowHours?: number;
}): number {
  const now = params.now ?? new Date();
  const windowH = params.claimWindowHours ?? 24;
  if (!params.lastMineAt) {
    // First-ever tap collects one full window's worth.
    return Math.floor(params.rateMilli * windowH);
  }
  const elapsedMs = now.getTime() - params.lastMineAt.getTime();
  const elapsedH = Math.max(0, elapsedMs / 3_600_000);
  const cappedH = Math.min(elapsedH, windowH);
  return Math.floor(params.rateMilli * cappedH);
}

/** Whether the 24h cooldown has elapsed so the user may tap "Mine" again. */
export function canClaim(params: {
  lastMineAt: Date | null;
  now?: Date;
  cooldownHours?: number;
}): boolean {
  if (!params.lastMineAt) return true;
  const now = params.now ?? new Date();
  const cooldown = (params.cooldownHours ?? 24) * 3_600_000;
  return now.getTime() - params.lastMineAt.getTime() >= cooldown;
}

/** Convert milli-points to mainnet $Matsumoto (3 points = 1 token). */
export function pointsToToken(
  milliPoints: bigint | number,
  pointsPerToken = 3,
): number {
  const points = Number(milliPoints) / MILLI;
  return points / pointsPerToken;
}
