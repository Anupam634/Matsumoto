import {
  effectiveRateMilli,
  referralTierFor,
  accrueMilli,
  canClaim,
  pointsToToken,
  BASE_RATE_MILLI,
} from './mining.engine';

const H = 3_600_000;

describe('referralTierFor', () => {
  it('maps invite counts to the SPEC tiers', () => {
    expect(referralTierFor(0).multiplier).toBe(1);
    expect(referralTierFor(3).multiplier).toBe(3);
    expect(referralTierFor(6).multiplier).toBe(4);
    expect(referralTierFor(20).multiplier).toBe(5);
    expect(referralTierFor(30).multiplier).toBe(6);
    expect(referralTierFor(31).multiplier).toBe(8);
  });
  it('clamps above the top band to the highest tier', () => {
    expect(referralTierFor(99999).multiplier).toBe(8);
  });
});

describe('effectiveRateMilli', () => {
  const future = new Date(Date.now() + 10 * 24 * H);

  it('is the base rate with no boosters and no referrals', () => {
    expect(effectiveRateMilli({ boosters: [], inviteCount: 0 })).toBe(
      BASE_RATE_MILLI,
    );
  });

  it('a single $1 booster yields 2.9/hr (matches client spec)', () => {
    const rate = effectiveRateMilli({
      boosters: [{ rateBonusMilli: 2000, expiresAt: future }],
      inviteCount: 0,
    });
    expect(rate).toBe(2900); // 2.9 points/hr
  });

  it('stacks boosters additively then applies referral multiplier', () => {
    const rate = effectiveRateMilli({
      boosters: [
        { rateBonusMilli: 2000, expiresAt: future },
        { rateBonusMilli: 2000, expiresAt: future },
      ],
      inviteCount: 3, // ×3
    });
    // (900 + 2000 + 2000) × 3 = 14700
    expect(rate).toBe(14700);
  });

  it('ignores expired boosters', () => {
    const past = new Date(Date.now() - H);
    const rate = effectiveRateMilli({
      boosters: [{ rateBonusMilli: 2000, expiresAt: past }],
      inviteCount: 0,
    });
    expect(rate).toBe(BASE_RATE_MILLI);
  });
});

describe('accrueMilli', () => {
  it('collects a full window on first tap', () => {
    expect(accrueMilli({ rateMilli: 900, lastMineAt: null })).toBe(900 * 24);
  });

  it('caps accrual at the 24h window', () => {
    const lastMineAt = new Date(Date.now() - 50 * H); // 50h ago
    expect(accrueMilli({ rateMilli: 900, lastMineAt })).toBe(900 * 24);
  });

  it('accrues proportionally within the window', () => {
    const lastMineAt = new Date(Date.now() - 5 * H);
    expect(accrueMilli({ rateMilli: 900, lastMineAt })).toBe(900 * 5);
  });
});

describe('canClaim', () => {
  it('allows the first claim', () => {
    expect(canClaim({ lastMineAt: null })).toBe(true);
  });
  it('blocks before cooldown, allows after', () => {
    expect(canClaim({ lastMineAt: new Date(Date.now() - 23 * H) })).toBe(false);
    expect(canClaim({ lastMineAt: new Date(Date.now() - 25 * H) })).toBe(true);
  });
});

describe('pointsToToken', () => {
  it('converts at 3 points = 1 token', () => {
    expect(pointsToToken(300_000)).toBe(100); // 300 points -> 100 token
  });
});
