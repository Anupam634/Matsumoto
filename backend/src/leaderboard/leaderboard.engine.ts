/**
 * Pure helpers for the miner leaderboard.
 *
 * Deterministic and side-effect free so they can be unit tested without a
 * database — the service layer does the querying, this file decides what a
 * category/period *means* and how a rank is labelled.
 */

/** What miners are ranked by. */
export type LeaderboardCategory = 'EARNINGS' | 'BALANCE' | 'REFERRALS';

/** The window a category is measured over. */
export type LeaderboardPeriod = 'ALL_TIME' | 'MONTH' | 'WEEK';

export const LEADERBOARD_CATEGORIES: LeaderboardCategory[] = [
  'EARNINGS',
  'BALANCE',
  'REFERRALS',
];

export const LEADERBOARD_PERIODS: LeaderboardPeriod[] = [
  'ALL_TIME',
  'MONTH',
  'WEEK',
];

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

const DAY_MS = 24 * 3_600_000;

/**
 * Current balance is a snapshot, not a flow: "points held in the last 7
 * days" is not a quantity that exists. Only the two accumulating
 * categories can be windowed; a period asked for on BALANCE is ignored
 * (and the response says so, rather than silently mislabelling the board).
 */
export function supportsPeriod(category: LeaderboardCategory): boolean {
  return category !== 'BALANCE';
}

export function resolvePeriod(
  category: LeaderboardCategory,
  requested: LeaderboardPeriod,
): LeaderboardPeriod {
  return supportsPeriod(category) ? requested : 'ALL_TIME';
}

/** Inclusive lower bound for a period, or null for the unbounded board. */
export function periodStart(
  period: LeaderboardPeriod,
  now: Date = new Date(),
): Date | null {
  switch (period) {
    case 'WEEK':
      return new Date(now.getTime() - 7 * DAY_MS);
    case 'MONTH':
      return new Date(now.getTime() - 30 * DAY_MS);
    default:
      return null;
  }
}

export interface RankBadge {
  /** Short label for the rank band. */
  label: string;
  /** Medal for the podium, empty for everyone else. */
  medal: string;
}

/** Cosmetic band for a 1-based rank. Rank 0 or below is treated as unranked. */
export function rankBadgeFor(rank: number): RankBadge {
  if (rank === 1) return { label: 'Champion', medal: '🥇' };
  if (rank === 2) return { label: 'Runner-up', medal: '🥈' };
  if (rank === 3) return { label: 'Third', medal: '🥉' };
  if (rank >= 4 && rank <= 10) return { label: 'Top 10', medal: '' };
  if (rank >= 11 && rank <= 100) return { label: 'Top 100', medal: '' };
  if (rank > 100) return { label: 'Ranked', medal: '' };
  return { label: 'Unranked', medal: '' };
}

/**
 * Where a rank sits in the field, as a percentile from the top (1 = best).
 * Null when the miner is unranked or the board is empty — a percentile of
 * nothing is not 100%.
 */
export function percentileFor(rank: number, total: number): number | null {
  if (rank < 1 || total < 1 || rank > total) return null;
  return Math.max(1, Math.round((rank / total) * 100));
}

/** Clamp a caller-supplied page size into the range the API will serve. */
export function clampLimit(limit: number | undefined): number {
  if (!Number.isFinite(limit ?? NaN)) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(limit as number)));
}

/**
 * Standard competition ranking for an already descending-sorted list of
 * values: ties share the better rank and the next distinct value skips the
 * gap (100, 90, 90, 80 → 1, 2, 2, 4).
 *
 * The same rule is what "miners ahead of you + 1" produces on the full
 * field, so a caller's own rank and the rank printed next to them in the
 * top list always agree.
 */
export function assignRanks(sortedDescValues: number[]): number[] {
  let currentRank = 0;
  let previous = Number.NaN;
  return sortedDescValues.map((value, index) => {
    if (index === 0 || value !== previous) {
      currentRank = index + 1;
      previous = value;
    }
    return currentRank;
  });
}
