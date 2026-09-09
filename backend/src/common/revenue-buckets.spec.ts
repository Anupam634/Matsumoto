import {
  bucketKey,
  bucketLabel,
  bucketStart,
  startOfUtcDay,
} from './revenue-buckets';

const at = (iso: string) => new Date(iso);

describe('startOfUtcDay', () => {
  it('drops the time of day without shifting the date', () => {
    expect(startOfUtcDay(at('2026-09-09T23:59:59.999Z')).toISOString()).toBe(
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('does not return the caller a date it can mutate in place', () => {
    const source = at('2026-09-09T12:00:00Z');
    startOfUtcDay(source).setUTCDate(1);
    expect(source.toISOString()).toBe('2026-09-09T12:00:00.000Z');
  });
});

describe('bucketStart — daily', () => {
  it('buckets an instant onto its own UTC day', () => {
    expect(bucketStart(at('2026-09-09T18:30:00Z'), 'daily', 0).toISOString()).toBe(
      '2026-09-09T00:00:00.000Z',
    );
  });

  it('steps back across a month boundary', () => {
    expect(bucketStart(at('2026-09-02T10:00:00Z'), 'daily', -4).toISOString()).toBe(
      '2026-08-29T00:00:00.000Z',
    );
  });

  it('steps back across a year boundary', () => {
    expect(bucketStart(at('2026-01-01T00:00:00Z'), 'daily', -1).toISOString()).toBe(
      '2025-12-31T00:00:00.000Z',
    );
  });
});

describe('bucketStart — weekly', () => {
  // 2026-09-09 is a Wednesday, so its ISO week opened on Monday the 7th.
  it('rewinds a midweek day to its Monday', () => {
    expect(bucketStart(at('2026-09-09T18:30:00Z'), 'weekly', 0).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z',
    );
  });

  it('treats Sunday as the end of the week it began, not the start of a new one', () => {
    // 2026-09-13 is a Sunday; getUTCDay() calls that 0, which is exactly the
    // case a naive `day - getUTCDay()` gets wrong.
    expect(bucketStart(at('2026-09-13T23:00:00Z'), 'weekly', 0).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z',
    );
  });

  it('leaves a Monday where it is', () => {
    expect(bucketStart(at('2026-09-07T00:00:00Z'), 'weekly', 0).toISOString()).toBe(
      '2026-09-07T00:00:00.000Z',
    );
  });

  it('steps whole weeks backwards', () => {
    expect(bucketStart(at('2026-09-09T18:30:00Z'), 'weekly', -2).toISOString()).toBe(
      '2026-08-24T00:00:00.000Z',
    );
  });
});

describe('bucketStart — monthly', () => {
  it('buckets an instant onto the first of its month', () => {
    expect(bucketStart(at('2026-09-09T18:30:00Z'), 'monthly', 0).toISOString()).toBe(
      '2026-09-01T00:00:00.000Z',
    );
  });

  it('rolls into the previous year rather than an invalid month', () => {
    expect(bucketStart(at('2026-01-15T00:00:00Z'), 'monthly', -3).toISOString()).toBe(
      '2025-10-01T00:00:00.000Z',
    );
  });

  it('steps back a full year of buckets without drifting', () => {
    expect(bucketStart(at('2026-09-09T00:00:00Z'), 'monthly', -11).toISOString()).toBe(
      '2025-10-01T00:00:00.000Z',
    );
  });

  it('does not skip February when stepping back from a 31-day month', () => {
    expect(bucketStart(at('2026-03-31T00:00:00Z'), 'monthly', -1).toISOString()).toBe(
      '2026-02-01T00:00:00.000Z',
    );
  });
});

describe('bucketKey', () => {
  it('keys days and weeks by date, months by year-month', () => {
    const day = at('2026-09-09T00:00:00Z');
    expect(bucketKey(day, 'daily')).toBe('2026-09-09');
    expect(bucketKey(at('2026-09-07T00:00:00Z'), 'weekly')).toBe('2026-09-07');
    expect(bucketKey(at('2026-09-01T00:00:00Z'), 'monthly')).toBe('2026-09');
  });

  it('gives an instant and its bucket start the same key', () => {
    const instant = at('2026-09-09T18:30:00Z');
    expect(bucketKey(bucketStart(instant, 'daily', 0), 'daily')).toBe('2026-09-09');
  });
});

describe('bucketLabel', () => {
  it('labels each grain distinguishably', () => {
    expect(bucketLabel(at('2026-09-09T00:00:00Z'), 'daily')).toBe('Sep 09');
    expect(bucketLabel(at('2026-09-07T00:00:00Z'), 'weekly')).toBe('Wk Sep 07');
    expect(bucketLabel(at('2026-09-01T00:00:00Z'), 'monthly')).toBe('Sep 2026');
  });
});

describe('a laid-out run of buckets', () => {
  // How the service builds an axis: `count` buckets ending with the current one.
  const run = (from: string, grain: 'daily' | 'weekly' | 'monthly', count: number) =>
    Array.from({ length: count }, (_, i) =>
      bucketKey(bucketStart(at(from), grain, -(count - 1 - i)), grain),
    );

  it('ends on the bucket holding "now" and has no gaps or repeats', () => {
    for (const grain of ['daily', 'weekly', 'monthly'] as const) {
      const keys = run('2026-01-05T09:00:00Z', grain, 12);
      expect(keys).toHaveLength(12);
      expect(new Set(keys).size).toBe(12);
      expect(keys[keys.length - 1]).toBe(
        bucketKey(bucketStart(at('2026-01-05T09:00:00Z'), grain, 0), grain),
      );
      expect([...keys].sort()).toEqual(keys);
    }
  });
});
