import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TtlCache } from '../common/ttl-cache';
import { maskIdentity } from '../common/mask-identity';
import {
  assignRanks,
  clampLimit,
  LeaderboardCategory,
  LeaderboardPeriod,
  percentileFor,
  periodStart,
  rankBadgeFor,
  resolvePeriod,
  supportsPeriod,
} from './leaderboard.engine';

const MILLI = 1000;
/** A miner counts as "mining" if they tapped within the last 24h. */
const ACTIVE_WINDOW_MS = 24 * 3_600_000;
/**
 * Boards are read on every dashboard visit but change slowly, so each
 * distinct query is memoised briefly. Short enough that a fresh claim shows
 * up within half a minute, long enough that a traffic spike does not turn
 * into one full aggregate per page view.
 */
const CACHE_TTL_MS = 30_000;

/** Raw ranking row before user details are attached. */
interface RankedRow {
  userId: string;
  value: number;
}

/** A caller's standing in the full field, independent of the top list. */
interface OwnStanding {
  rank: number | null;
  value: number;
  totalRanked: number;
}

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The `me:` keys carry a user id, so the key space grows with the number of
   * distinct callers rather than with the number of boards. TtlCache caps it
   * and dedupes concurrent loads of the same key.
   */
  private readonly cache = new TtlCache(CACHE_TTL_MS, 5_000);

  /** Memoise an expensive aggregate for CACHE_TTL_MS. */
  private memo<T>(key: string, load: () => Promise<T>): Promise<T> {
    return this.cache.wrap(key, load);
  }

  /**
   * Public leaderboard plus the caller's own standing.
   *
   * Blocked accounts are excluded everywhere — from the board, from the
   * ranked total, and from the "miners ahead of you" count — so a banned
   * farm cannot push honest miners down the table.
   */
  async getLeaderboard(
    userId: string,
    params: {
      category?: LeaderboardCategory;
      period?: LeaderboardPeriod;
      limit?: number;
    } = {},
  ) {
    const category = params.category ?? 'EARNINGS';
    const period = resolvePeriod(category, params.period ?? 'ALL_TIME');
    const limit = clampLimit(params.limit);
    const since = periodStart(period) ?? new Date(0);

    const [rows, standing] = await Promise.all([
      this.memo(`board:${category}:${period}:${limit}`, () =>
        this.topRows(category, since, limit),
      ),
      this.memo(`me:${category}:${period}:${userId}`, () =>
        this.ownStanding(category, since, userId),
      ),
    ]);

    const users = await this.hydrate(rows.map((r) => r.userId));
    const ranks = assignRanks(rows.map((r) => r.value));
    const now = Date.now();

    const entries = rows.map((row, i) => {
      const user = users.get(row.userId);
      const rank = ranks[i];
      return {
        rank,
        id: row.userId,
        displayName: maskIdentity({
          id: row.userId,
          email: user?.email ?? null,
        }),
        countryCode: user?.countryCode ?? 'GLOBAL',
        value: row.value,
        badge: rankBadgeFor(rank),
        isCurrentUser: row.userId === userId,
        isMiningActive: !!(
          user?.lastMineAt && now - user.lastMineAt.getTime() <= ACTIVE_WINDOW_MS
        ),
        joinedAt: user?.createdAt.toISOString() ?? null,
      };
    });

    return {
      category,
      period,
      /** False when the period was ignored because the metric is a snapshot. */
      periodSupported: supportsPeriod(category),
      unit: category === 'REFERRALS' ? 'miners' : 'points',
      totalRanked: standing.totalRanked,
      generatedAt: new Date().toISOString(),
      entries,
      me: {
        rank: standing.rank,
        value: standing.value,
        percentile:
          standing.rank === null
            ? null
            : percentileFor(standing.rank, standing.totalRanked),
        badge: rankBadgeFor(standing.rank ?? 0),
        /** Whether the caller already appears in `entries`. */
        inTopList: entries.some((e) => e.isCurrentUser),
      },
    };
  }

  // ───────────────────────── top-N rows ─────────────────────────

  private topRows(
    category: LeaderboardCategory,
    since: Date,
    limit: number,
  ): Promise<RankedRow[]> {
    if (category === 'BALANCE') return this.topByBalance(limit);
    if (category === 'REFERRALS') return this.topByReferrals(since, limit);
    return this.topByEarnings(since, limit);
  }

  /**
   * Lifetime (or windowed) earnings: the sum of every *credit* in the
   * ledger. Debits are excluded so cashing out does not erase what a miner
   * demonstrably earned — the same rule the dashboard's lifetime figure uses.
   */
  private async topByEarnings(since: Date, limit: number) {
    const grouped = await this.prisma.ledgerEntry.groupBy({
      by: ['userId'],
      where: {
        deltaMilli: { gt: 0 },
        createdAt: { gte: since },
        user: { isBlocked: false },
      },
      _sum: { deltaMilli: true },
      orderBy: { _sum: { deltaMilli: 'desc' } },
      take: limit,
    });
    return grouped.map((g) => ({
      userId: g.userId,
      value: Number(g._sum.deltaMilli ?? 0n) / MILLI,
    }));
  }

  private async topByBalance(limit: number) {
    const users = await this.prisma.user.findMany({
      where: { isBlocked: false, pointsBalance: { gt: 0 } },
      orderBy: { pointsBalance: 'desc' },
      take: limit,
      select: { id: true, pointsBalance: true },
    });
    return users.map((u) => ({
      userId: u.id,
      value: Number(u.pointsBalance) / MILLI,
    }));
  }

  private async topByReferrals(since: Date, limit: number) {
    const grouped = await this.prisma.user.groupBy({
      by: ['referredById'],
      where: {
        referredById: { not: null },
        createdAt: { gte: since },
        referredBy: { is: { isBlocked: false } },
      },
      _count: { _all: true },
      orderBy: { _count: { referredById: 'desc' } },
      take: limit,
    });
    return grouped
      .filter((g): g is typeof g & { referredById: string } =>
        Boolean(g.referredById),
      )
      .map((g) => ({ userId: g.referredById, value: g._count._all }));
  }

  // ──────────────────── the caller's own rank ───────────────────

  /**
   * The caller's value and rank across the *whole* field, not just the
   * page returned above — a miner ranked 4,000th still gets a real number.
   *
   * Ranking over an aggregate has no Prisma equivalent (grouping cannot be
   * counted or offset), so the two aggregate categories rank in SQL rather
   * than pulling every group into memory to count them.
   */
  private ownStanding(
    category: LeaderboardCategory,
    since: Date,
    userId: string,
  ): Promise<OwnStanding> {
    if (category === 'BALANCE') return this.balanceStanding(userId);
    if (category === 'REFERRALS') return this.referralStanding(since, userId);
    return this.earningsStanding(since, userId);
  }

  private async balanceStanding(userId: string): Promise<OwnStanding> {
    const me = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pointsBalance: true, isBlocked: true },
    });
    const balance = me?.pointsBalance ?? 0n;
    const [totalRanked, ahead] = await Promise.all([
      this.prisma.user.count({
        where: { isBlocked: false, pointsBalance: { gt: 0 } },
      }),
      this.prisma.user.count({
        where: { isBlocked: false, pointsBalance: { gt: balance } },
      }),
    ]);
    return {
      totalRanked,
      value: Number(balance) / MILLI,
      rank: this.rankOf({
        ahead,
        value: Number(balance),
        blocked: me?.isBlocked ?? true,
      }),
    };
  }

  private async earningsStanding(
    since: Date,
    userId: string,
  ): Promise<OwnStanding> {
    const [row] = await this.prisma.$queryRaw<
      { total_ranked: number; my_total: bigint; ahead: number }[]
    >`
      WITH totals AS (
        SELECT l."userId" AS id, SUM(l."deltaMilli")::bigint AS total
        FROM "LedgerEntry" l
        JOIN "User" u ON u."id" = l."userId"
        WHERE l."deltaMilli" > 0
          AND l."createdAt" >= ${since}
          AND u."isBlocked" = false
        GROUP BY l."userId"
      ), mine AS (
        SELECT COALESCE((SELECT total FROM totals WHERE id = ${userId}), 0) AS total
      )
      SELECT
        (SELECT COUNT(*) FROM totals)::int AS total_ranked,
        (SELECT total FROM mine)::bigint AS my_total,
        (SELECT COUNT(*) FROM totals WHERE total > (SELECT total FROM mine))::int AS ahead
    `;
    const myTotal = Number(row?.my_total ?? 0n);
    return {
      totalRanked: row?.total_ranked ?? 0,
      value: myTotal / MILLI,
      rank: this.rankOf({ ahead: row?.ahead ?? 0, value: myTotal }),
    };
  }

  private async referralStanding(
    since: Date,
    userId: string,
  ): Promise<OwnStanding> {
    const [row] = await this.prisma.$queryRaw<
      { total_ranked: number; my_total: bigint; ahead: number }[]
    >`
      WITH counts AS (
        SELECT r."referredById" AS id, COUNT(*)::bigint AS total
        FROM "User" r
        JOIN "User" o ON o."id" = r."referredById"
        WHERE r."referredById" IS NOT NULL
          AND r."createdAt" >= ${since}
          AND o."isBlocked" = false
        GROUP BY r."referredById"
      ), mine AS (
        SELECT COALESCE((SELECT total FROM counts WHERE id = ${userId}), 0) AS total
      )
      SELECT
        (SELECT COUNT(*) FROM counts)::int AS total_ranked,
        (SELECT total FROM mine)::bigint AS my_total,
        (SELECT COUNT(*) FROM counts WHERE total > (SELECT total FROM mine))::int AS ahead
    `;
    const myTotal = Number(row?.my_total ?? 0n);
    return {
      totalRanked: row?.total_ranked ?? 0,
      value: myTotal,
      rank: this.rankOf({ ahead: row?.ahead ?? 0, value: myTotal }),
    };
  }

  /**
   * A miner only holds a rank once they have something to rank: a zero
   * score (or a blocked account, which the boards exclude) is unranked
   * rather than "last place", which would otherwise read as a real
   * standing earned by mining nothing.
   */
  private rankOf(params: {
    ahead: number;
    value: number;
    blocked?: boolean;
  }): number | null {
    if (params.blocked || params.value <= 0) return null;
    return params.ahead + 1;
  }

  /** Fetch the display fields for a page of ranked ids in one query. */
  private async hydrate(ids: string[]) {
    if (ids.length === 0) {
      return new Map<
        string,
        {
          email: string | null;
          countryCode: string | null;
          lastMineAt: Date | null;
          createdAt: Date;
        }
      >();
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
        countryCode: true,
        lastMineAt: true,
        createdAt: true,
      },
    });
    return new Map(users.map((u) => [u.id, u]));
  }
}
