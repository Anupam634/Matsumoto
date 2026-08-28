import {
  assignRanks,
  clampLimit,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  percentileFor,
  periodStart,
  rankBadgeFor,
  resolvePeriod,
  supportsPeriod,
} from './leaderboard.engine';

const DAY = 24 * 3_600_000;

describe('periods', () => {
  const now = new Date('2026-08-28T12:00:00.000Z');

  it('has no lower bound for the all-time board', () => {
    expect(periodStart('ALL_TIME', now)).toBeNull();
  });

  it('windows the week and month boards', () => {
    expect(periodStart('WEEK', now)!.getTime()).toBe(now.getTime() - 7 * DAY);
    expect(periodStart('MONTH', now)!.getTime()).toBe(now.getTime() - 30 * DAY);
  });

  it('ignores a period on balance, which is a snapshot not a flow', () => {
    expect(supportsPeriod('BALANCE')).toBe(false);
    expect(resolvePeriod('BALANCE', 'WEEK')).toBe('ALL_TIME');
  });

  it('keeps the period on the accumulating categories', () => {
    expect(resolvePeriod('EARNINGS', 'WEEK')).toBe('WEEK');
    expect(resolvePeriod('REFERRALS', 'MONTH')).toBe('MONTH');
  });
});

describe('assignRanks', () => {
  it('numbers a strictly descending board 1..n', () => {
    expect(assignRanks([90, 80, 70])).toEqual([1, 2, 3]);
  });

  it('gives ties the same rank and skips the gap after them', () => {
    expect(assignRanks([100, 90, 90, 80])).toEqual([1, 2, 2, 4]);
  });

  it('handles an all-tied board and an empty one', () => {
    expect(assignRanks([5, 5, 5])).toEqual([1, 1, 1]);
    expect(assignRanks([])).toEqual([]);
  });

  it('agrees with the "miners ahead + 1" rule used for the caller', () => {
    const values = [100, 90, 90, 80];
    const ranks = assignRanks(values);
    values.forEach((v, i) => {
      const ahead = values.filter((other) => other > v).length;
      expect(ranks[i]).toBe(ahead + 1);
    });
  });
});

describe('rankBadgeFor', () => {
  it('medals the podium only', () => {
    expect(rankBadgeFor(1).medal).toBe('🥇');
    expect(rankBadgeFor(2).medal).toBe('🥈');
    expect(rankBadgeFor(3).medal).toBe('🥉');
    expect(rankBadgeFor(4).medal).toBe('');
  });

  it('bands the rest of the field', () => {
    expect(rankBadgeFor(10).label).toBe('Top 10');
    expect(rankBadgeFor(11).label).toBe('Top 100');
    expect(rankBadgeFor(100).label).toBe('Top 100');
    expect(rankBadgeFor(101).label).toBe('Ranked');
  });

  it('treats a missing rank as unranked', () => {
    expect(rankBadgeFor(0).label).toBe('Unranked');
  });
});

describe('percentileFor', () => {
  it('reports the top of the field as 1%', () => {
    expect(percentileFor(1, 1000)).toBe(1);
  });

  it('scales through the field', () => {
    expect(percentileFor(500, 1000)).toBe(50);
    expect(percentileFor(1000, 1000)).toBe(100);
  });

  it('is null when unranked or the board is empty', () => {
    expect(percentileFor(0, 100)).toBeNull();
    expect(percentileFor(1, 0)).toBeNull();
    expect(percentileFor(5, 4)).toBeNull();
  });
});

describe('clampLimit', () => {
  it('falls back to the default when absent or not a number', () => {
    expect(clampLimit(undefined)).toBe(DEFAULT_LIMIT);
    expect(clampLimit(NaN)).toBe(DEFAULT_LIMIT);
  });

  it('clamps into the servable range', () => {
    expect(clampLimit(0)).toBe(1);
    expect(clampLimit(-20)).toBe(1);
    expect(clampLimit(10_000)).toBe(MAX_LIMIT);
    expect(clampLimit(25.7)).toBe(25);
  });
});
