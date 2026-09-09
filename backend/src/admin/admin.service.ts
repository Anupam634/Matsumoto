import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { toCsv, CSV_MAX_ROWS } from '../common/csv';
import {
  bucketKey,
  bucketLabel,
  bucketStart,
  startOfUtcDay,
  type Grain,
} from '../common/revenue-buckets';
import { TtlCache } from '../common/ttl-cache';
import { verifyPassword } from '../auth/password';
import {
  effectiveRateMilli,
  referralTierFor,
  ActiveBooster,
} from '../mining/mining.engine';

/** A miner counts as "active" if they tapped Mine within this window. */
const ACTIVE_WINDOW_MS = 24 * 3_600_000;
/** Referral tree depth — matches the 6 referral levels in SPEC §2. */
const TREE_DEPTH = 6;

/** How far back the revenue time-series and period comparisons reach. */
const REVENUE_WINDOW_DAYS = 400;
/**
 * Payers returned inline on the analytics endpoint. The full table — every
 * miner who ever paid — is the CSV export, so the JSON stays a fixed size.
 */
const TOP_PAYERS_LIMIT = 100;

/** Money and percentages are display values — two decimals, never a float tail. */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** `part` as a percentage of `whole`; 0 rather than NaN when there is no whole. */
function pct(part: number, whole: number): number {
  return whole > 0 ? round2((part / whole) * 100) : 0;
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  countryCode: string | null;
  balancePoints: number;
  ratePerHour: number;
  rateAdjustMilli: number;
  referralCount: number;
  referralTier: { level: number; multiplier: number };
  activeBoosters: number;
  kycStatus: string;
  isBlocked: boolean;
  lastMineAt: Date | null;
  createdAt: Date;
  lastIp?: string | null;
  deviceFingerprint?: string | null;
  lastHandshakeAt?: string | null;
}

export interface TreeNode {
  id: string;
  email: string | null;
  countryCode: string | null;
  balancePoints: number;
  isBlocked: boolean;
  createdAt: Date;
  children: TreeNode[];
}

// ─────────────────── Booster revenue analytics ──────────────────

/** One bucket of the revenue time-series (a day, an ISO week, or a month). */
export interface RevenueBucket {
  /** Stable bucket id — 'YYYY-MM-DD' for day/week starts, 'YYYY-MM' for months. */
  key: string;
  /** Short axis label. */
  label: string;
  /** UTC instant the bucket opens, for charts that need a real date. */
  start: string;
  revenueUsd: number;
  purchases: number;
  payingUsers: number;
}

/** Revenue over one named window, with the window before it for comparison. */
export interface RevenuePeriod {
  key: 'today' | 'week' | 'month' | 'year';
  label: string;
  revenueUsd: number;
  purchases: number;
  payingUsers: number;
  /** Same-length window immediately before this one. */
  previousRevenueUsd: number;
  /** Percent change vs. the previous window; null when it had no revenue. */
  changePct: number | null;
}

/** What one plan (the "category" a booster is sold under) has earned. */
export interface RevenueByCategory {
  planId: string;
  label: string;
  priceUsd: number;
  rateBonusPoints: number;
  durationDays: number;
  active: boolean;
  confirmedPurchases: number;
  awaitingPayment: number;
  failed: number;
  expired: number;
  /** Distinct miners who have ever bought this plan. */
  uniqueBuyers: number;
  /** Boosters from this plan that have not expired yet. */
  activeBoosters: number;
  revenueUsd: number;
  shareOfRevenuePct: number;
}

/** One paying miner: how much they have spent, and on what. */
export interface RevenueByUser {
  rank: number;
  userId: string;
  email: string | null;
  walletAddress: string | null;
  countryCode: string | null;
  isBlocked: boolean;
  joinedAt: string | null;
  revenueUsd: number;
  purchases: number;
  firstPurchaseAt: string | null;
  lastPurchaseAt: string | null;
  /** Per-plan split, cheapest first. */
  plans: { planId: string; label: string; priceUsd: number; count: number }[];
  shareOfRevenuePct: number;
}

@Injectable()
export class AdminService {
  /**
   * Short TTL: an operator watching the dashboard should still see a
   * withdrawal land within a few seconds of it arriving.
   */
  private readonly cache = new TtlCache(15_000, 100);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  // ────────────────────────── Auth ──────────────────────────

  async login(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    // Verify even when the admin is missing so a bad email and a bad password
    // take the same time — no user enumeration via response latency.
    const ok = await verifyPassword(password, admin?.passwordHash ?? null);
    if (!admin || !ok) {
      throw new UnauthorizedException('Invalid credentials.');
    }
    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      email: admin.email,
      typ: 'admin',
    });
    return {
      accessToken,
      admin: { id: admin.id, email: admin.email, role: admin.role },
    };
  }

  // ───────────────────────── Overview ────────────────────────

  /**
   * Platform totals, growth velocity, and time-series for executive analytics.
   *
   * Cached: the admin dashboard polls this every 20 seconds and it is a dozen
   * aggregates plus a scan of every account created in the last month, none
   * of which changes meaningfully second to second. The cache also collapses
   * several admins (or several open tabs) onto one set of queries.
   */
  stats() {
    return this.cache.wrap('stats', () => this.computeStats());
  }

  private async computeStats() {
    const now = Date.now();
    const activeSince = new Date(now - ACTIVE_WINDOW_MS);
    const dayAgo = new Date(now - 24 * 3_600_000);
    const weekAgo = new Date(now - 7 * 24 * 3_600_000);
    const monthAgo = new Date(now - 30 * 24 * 3_600_000);

    const [
      totalUsers,
      activeMiners,
      blocked,
      balance,
      byCountry,
      withdrawals,
      dailyUsers,
      weeklyUsers,
      monthlyUsers,
      kycStats,
      activeBoostersCount,
      recentLedger,
      usersPast30Days,
      pointsMintedPerDay,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastMineAt: { gte: activeSince } } }),
      this.prisma.user.count({ where: { isBlocked: true } }),
      this.prisma.user.aggregate({ _sum: { pointsBalance: true } }),
      this.prisma.user.groupBy({
        by: ['countryCode'],
        _count: { _all: true },
        orderBy: { _count: { countryCode: 'desc' } },
      }),
      this.prisma.withdrawal.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.user.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.kycRecord.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.booster.count({ where: { expiresAt: { gt: new Date() } } }),
      this.prisma.ledgerEntry.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      // Only the signup dates are needed, to bucket them by day. This is the
      // one query here that grows without bound as the userbase does; the
      // cache is what keeps it off the hot path.
      this.prisma.user.findMany({
        where: { createdAt: { gte: monthAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 100_000,
      }),
      // Points actually minted per day. Summed in the database because the
      // ledger is the one table that grows with every tap, and the dashboard
      // only ever needs 30 numbers out of it.
      //
      // `createdAt` is `timestamp(3)` without a zone and Prisma writes UTC
      // into it, so truncating the column directly gives UTC days — the same
      // keys the signup buckets above use. Casting it with `AT TIME ZONE`
      // would hand `date_trunc` a `timestamptz` and split days on whatever
      // the database server's local zone happens to be.
      this.prisma.$queryRaw<{ day: string; milli: bigint }[]>`
        SELECT to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
               COALESCE(SUM("deltaMilli"), 0)::bigint AS milli
        FROM "LedgerEntry"
        WHERE "createdAt" >= ${monthAgo} AND "deltaMilli" > 0
        GROUP BY 1
      `,
    ]);

    // Build 7-day and 30-day time-series daily buckets
    const daysMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3_600_000);
      const key = d.toISOString().slice(0, 10);
      daysMap.set(key, 0);
    }
    for (const u of usersPast30Days) {
      const key = u.createdAt.toISOString().slice(0, 10);
      if (daysMap.has(key)) {
        daysMap.set(key, (daysMap.get(key) ?? 0) + 1);
      }
    }

    const mintedByDay = new Map(
      pointsMintedPerDay.map((r) => [r.day, Number(r.milli) / 1000]),
    );

    const growthHistory = Array.from(daysMap.entries()).map(([date, newUsers]) => ({
      date,
      newUsers,
      pointsMined: round2(mintedByDay.get(date) ?? 0),
    }));

    return {
      totalUsers,
      activeMiners,
      blockedUsers: blocked,
      totalBalancePoints: Number(balance._sum.pointsBalance ?? 0n) / 1000,
      pendingWithdrawals:
        withdrawals.find((w) => w.status === 'PENDING')?._count._all ?? 0,
      withdrawalsByStatus: Object.fromEntries(
        withdrawals.map((w) => [w.status, w._count._all]),
      ),
      usersByCountry: byCountry.map((c) => ({
        countryCode: c.countryCode ?? 'unknown',
        users: c._count._all,
      })),
      growth: {
        dailyNewUsers: dailyUsers,
        weeklyNewUsers: weeklyUsers,
        monthlyNewUsers: monthlyUsers,
        history: growthHistory,
      },
      kycSummary: {
        pending: kycStats.find((k) => k.status === 'PENDING')?._count._all ?? 0,
        approved: kycStats.find((k) => k.status === 'APPROVED')?._count._all ?? 0,
        rejected: kycStats.find((k) => k.status === 'REJECTED')?._count._all ?? 0,
      },
      boostersActive: activeBoostersCount,
      recentActivity: recentLedger.map((l) => ({
        id: l.id,
        userEmail: l.user?.email ?? 'Wallet Account',
        reason: l.reason,
        points: Number(l.deltaMilli) / 1000,
        timestamp: l.createdAt.toISOString(),
      })),
    };
  }

  // ─────────────────────── User management ───────────────────

  /** Paginated, searchable miner list with each user's live rate. */
  async listUsers(params: { search?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 25));
    const search = params.search?.trim();

    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { id: search },
            { referralCode: search },
            { walletAddress: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          kyc: true,
          boosters: { include: { plan: true } },
          devices: { orderBy: { seenAt: 'desc' }, take: 2 },
          _count: { select: { referrals: true } },
        },
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      users: rows.map((u) => this.toRow(u)),
    };
  }

  private toRow(u: {
    id: string;
    email: string | null;
    countryCode: string | null;
    pointsBalance: bigint;
    rateAdjustMilli: number;
    isBlocked: boolean;
    lastMineAt: Date | null;
    createdAt: Date;
    kyc: { status: string } | null;
    boosters: { expiresAt: Date; plan: { rateBonusMilli: number } }[];
    devices?: { fingerprint: string; lastIp: string | null; seenAt: Date }[];
    _count: { referrals: number };
  }): AdminUserRow {
    const boosters: ActiveBooster[] = u.boosters.map((b) => ({
      rateBonusMilli: b.plan.rateBonusMilli,
      expiresAt: b.expiresAt,
    }));
    const inviteCount = u._count.referrals;
    const latestDevice = u.devices?.[0];
    return {
      id: u.id,
      email: u.email,
      countryCode: u.countryCode,
      balancePoints: Number(u.pointsBalance) / 1000,
      ratePerHour:
        effectiveRateMilli({
          boosters,
          inviteCount,
          rateAdjustMilli: u.rateAdjustMilli,
        }) / 1000,
      rateAdjustMilli: u.rateAdjustMilli,
      referralCount: inviteCount,
      referralTier: referralTierFor(inviteCount),
      activeBoosters: boosters.filter((b) => b.expiresAt > new Date()).length,
      kycStatus: u.kyc?.status ?? 'NONE',
      isBlocked: u.isBlocked,
      lastMineAt: u.lastMineAt,
      createdAt: u.createdAt,
      lastIp: latestDevice?.lastIp ?? null,
      deviceFingerprint: latestDevice?.fingerprint ?? null,
      lastHandshakeAt: latestDevice?.seenAt ? latestDevice.seenAt.toISOString() : null,
    };
  }

  /** One miner, plus their downline tree and recent ledger activity. */
  async userDetail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        kyc: true,
        boosters: { include: { plan: true } },
        devices: { orderBy: { seenAt: 'desc' }, take: 10 },
        _count: { select: { referrals: true } },
      },
    });

    const [tree, ledger, withdrawals] = await Promise.all([
      this.referralTree(userId),
      this.prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.withdrawal.findMany({
        where: { userId },
        orderBy: { requestedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      user: this.toRow(user),
      devices: user.devices.map((d) => ({
        id: d.id,
        fingerprint: d.fingerprint,
        lastIp: d.lastIp,
        seenAt: d.seenAt,
      })),
      referralTree: tree,
      ledger: ledger.map((l) => ({
        id: l.id,
        reason: l.reason,
        points: Number(l.deltaMilli) / 1000,
        createdAt: l.createdAt,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        points: Number(w.pointsAmount) / 1000,
        tokenAmount: w.tokenAmount,
        status: w.status,
        requestedAt: w.requestedAt,
      })),
    };
  }

  /**
   * Referral Fraud & Sybil Bypass Auditor.
   * Compares device fingerprints, IP addresses and self-referral attempts.
   */
  async referralAudit() {
    const [totalMiners, referrals] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        where: { referredById: { not: null } },
        select: {
          id: true,
          email: true,
          createdAt: true,
          isBlocked: true,
          referredById: true,
          referredBy: {
            select: {
              id: true,
              email: true,
              devices: { select: { fingerprint: true, lastIp: true } },
            },
          },
          devices: { select: { fingerprint: true, lastIp: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ]);

    let suspiciousCount = 0;
    const auditLogs = referrals.map((r) => {
      const inviteeFps = new Set(r.devices.map((d) => d.fingerprint).filter(Boolean));
      const inviteeIps = new Set(r.devices.map((d) => d.lastIp).filter(Boolean));

      const inviterFps = new Set(
        r.referredBy?.devices.map((d) => d.fingerprint).filter(Boolean) ?? [],
      );
      const inviterIps = new Set(
        r.referredBy?.devices.map((d) => d.lastIp).filter(Boolean) ?? [],
      );

      let sameDevice = false;
      for (const fp of Array.from(inviteeFps)) {
        if (inviterFps.has(fp)) {
          sameDevice = true;
          break;
        }
      }

      let sameIp = false;
      for (const ip of Array.from(inviteeIps)) {
        if (inviterIps.has(ip)) {
          sameIp = true;
          break;
        }
      }

      let flagReason = 'CLEAN_VERIFIED';
      let severity: 'CLEAN' | 'MEDIUM' | 'HIGH' = 'CLEAN';

      if (sameDevice) {
        flagReason = 'SAME_DEVICE_FINGERPRINT';
        severity = 'HIGH';
        suspiciousCount++;
      } else if (sameIp) {
        flagReason = 'SAME_IP_SUBNET';
        severity = 'MEDIUM';
        suspiciousCount++;
      }

      return {
        inviteeId: r.id,
        inviteeEmail: r.email ?? 'Wallet Miner',
        inviteeIsBlocked: r.isBlocked,
        inviterId: r.referredById!,
        inviterEmail: r.referredBy?.email ?? 'Unknown Inviter',
        inviteeFingerprint: r.devices[0]?.fingerprint ?? 'None',
        inviteeIp: r.devices[0]?.lastIp ?? 'None',
        inviterFingerprint: r.referredBy?.devices[0]?.fingerprint ?? 'None',
        inviterIp: r.referredBy?.devices[0]?.lastIp ?? 'None',
        flagReason,
        severity,
        joinedAt: r.createdAt.toISOString(),
      };
    });

    return {
      totalMiners,
      totalReferralLinks: referrals.length,
      cleanReferralsCount: referrals.length - suspiciousCount,
      suspiciousReferralsCount: suspiciousCount,
      integrityScore:
        referrals.length > 0
          ? Number((((referrals.length - suspiciousCount) / referrals.length) * 100).toFixed(1))
          : 100,
      auditLogs,
    };
  }

  /**
   * Downline as a nested tree, breadth-first one level at a time so a wide
   * network costs `TREE_DEPTH` queries rather than one per node.
   */
  private async referralTree(rootId: string): Promise<TreeNode[]> {
    const select = {
      id: true,
      email: true,
      countryCode: true,
      pointsBalance: true,
      isBlocked: true,
      createdAt: true,
      referredById: true,
    };

    let frontier = [rootId];
    const byParent = new Map<string, TreeNode[]>();

    for (let depth = 0; depth < TREE_DEPTH && frontier.length; depth++) {
      const children = await this.prisma.user.findMany({
        where: { referredById: { in: frontier } },
        select,
      });
      if (!children.length) break;

      for (const c of children) {
        const node: TreeNode = {
          id: c.id,
          email: c.email,
          countryCode: c.countryCode,
          balancePoints: Number(c.pointsBalance) / 1000,
          isBlocked: c.isBlocked,
          createdAt: c.createdAt,
          children: [],
        };
        const siblings = byParent.get(c.referredById!) ?? [];
        siblings.push(node);
        byParent.set(c.referredById!, siblings);
      }
      frontier = children.map((c) => c.id);
    }

    // Stitch the flat parent→children map into nested nodes.
    const attach = (nodes: TreeNode[]): TreeNode[] =>
      nodes.map((n) => ({ ...n, children: attach(byParent.get(n.id) ?? []) }));

    return attach(byParent.get(rootId) ?? []);
  }

  async setBlocked(userId: string, blocked: boolean) {
    const u = await this.prisma.user.update({
      where: { id: userId },
      data: { isBlocked: blocked },
      select: { id: true, isBlocked: true },
    });
    return u;
  }

  /** Manual hash-rate override (SPEC §6). */
  async adjustRate(userId: string, rateAdjustMilli: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { rateAdjustMilli },
    });
    // Return the recomputed rate so the panel can show the effect immediately.
    const detail = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        kyc: true,
        boosters: { include: { plan: true } },
        _count: { select: { referrals: true } },
      },
    });
    return this.toRow(detail);
  }

  /** Manual airdrop (SPEC §6) — credits points and records why. */
  async airdrop(userId: string, points: number, note?: string) {
    const milli = BigInt(Math.round(points * 1000));
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: milli } },
        select: { id: true, pointsBalance: true },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'AIRDROP',
          deltaMilli: milli,
          meta: note ? { note } : undefined,
        },
      }),
    ]);
    return {
      id: user.id,
      balancePoints: Number(user.pointsBalance) / 1000,
      credited: points,
    };
  }

  // ───────────────────── Withdrawal queue ────────────────────

  async listWithdrawals(status?: string) {
    const rows = await this.prisma.withdrawal.findMany({
      where: status ? { status: status as never } : {},
      orderBy: { requestedAt: 'asc' },
      take: 200,
      include: { user: { select: { email: true, countryCode: true } } },
    });
    return rows.map((w) => ({
      id: w.id,
      userId: w.userId,
      userEmail: w.user.email,
      countryCode: w.user.countryCode,
      points: Number(w.pointsAmount) / 1000,
      tokenAmount: w.tokenAmount,
      toAddress: w.toAddress,
      status: w.status,
      txHash: w.txHash,
      adminNote: w.adminNote,
      requestedAt: w.requestedAt,
      resolvedAt: w.resolvedAt,
    }));
  }

  // ─────────────────── Booster revenue analytics ──────────────────

  /**
   * Everything the panel needs to answer "who paid us, how much, for which
   * plan, and when" — totals, day/week/month series, per-plan split and the
   * per-miner spend table.
   *
   * Cached alongside `stats()`: the revenue tab polls, and none of these
   * aggregates move second to second.
   */
  revenueAnalytics() {
    return this.cache.wrap('revenue-analytics', () =>
      this.computeRevenueAnalytics(),
    );
  }

  private async computeRevenueAnalytics() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - REVENUE_WINDOW_DAYS * 86_400_000);

    // The plan catalogue is tiny and every other aggregate needs its prices
    // to turn a purchase count into money, so it is fetched up front.
    const plans = await this.prisma.boosterPlan.findMany({
      orderBy: { priceUsd: 'asc' },
    });
    const priceOf = new Map(plans.map((p) => [p.id, p.priceUsd]));
    const labelOf = (planId: string) => `$${priceOf.get(planId) ?? 0} Booster`;

    const [byStatusPlan, payers, windowRows, activeByPlan, totalUsers, recentRows] =
      await Promise.all([
        // All-time money, counted as (purchases per plan × that plan's price)
        // so no per-row scan is needed.
        this.prisma.boosterPurchase.groupBy({
          by: ['status', 'planId'],
          _count: { _all: true },
        }),
        this.payerAggregates(priceOf),
        // Only CONFIRMED rows inside the window, and only the four columns the
        // buckets need. `confirmedAt` is what a payment is dated by; the
        // `createdAt` arm keeps a row whose confirmation was backfilled.
        this.prisma.boosterPurchase.findMany({
          where: {
            status: 'CONFIRMED',
            OR: [
              { confirmedAt: { gte: windowStart } },
              { confirmedAt: null, createdAt: { gte: windowStart } },
            ],
          },
          select: {
            userId: true,
            planId: true,
            tokenSymbol: true,
            confirmedAt: true,
            createdAt: true,
          },
          take: 200_000,
        }),
        this.prisma.booster.groupBy({
          by: ['planId'],
          where: { expiresAt: { gt: now } },
          _count: { _all: true },
        }),
        this.prisma.user.count(),
        this.prisma.boosterPurchase.findMany({
          where: { status: 'CONFIRMED' },
          // Postgres sorts NULLs first on DESC. Both confirmation paths do
          // stamp `confirmedAt`, but a row that somehow missed one must not
          // therefore lead the "latest payments" list.
          orderBy: { confirmedAt: { sort: 'desc', nulls: 'last' } },
          take: 12,
          select: {
            id: true,
            userId: true,
            planId: true,
            tokenSymbol: true,
            expectedAmount: true,
            txHash: true,
            confirmedAt: true,
            createdAt: true,
            user: { select: { email: true, countryCode: true } },
          },
        }),
      ]);

    // ── All-time totals, and the per-plan status split ──
    const statusOf = new Map<string, Record<string, number>>();
    let revenueUsd = 0;
    let confirmedPurchases = 0;
    let awaitingPayment = 0;
    let awaitingPaymentUsd = 0;
    let failed = 0;
    let expired = 0;

    for (const g of byStatusPlan) {
      const count = g._count._all;
      const value = count * (priceOf.get(g.planId) ?? 0);
      const split = statusOf.get(g.planId) ?? {};
      split[g.status] = (split[g.status] ?? 0) + count;
      statusOf.set(g.planId, split);

      if (g.status === 'CONFIRMED') {
        revenueUsd += value;
        confirmedPurchases += count;
      } else if (g.status === 'AWAITING_PAYMENT') {
        awaitingPayment += count;
        awaitingPaymentUsd += value;
      } else if (g.status === 'FAILED') {
        failed += count;
      } else {
        expired += count;
      }
    }

    // ── Per-plan ("category") breakdown ──
    const activeOf = new Map(activeByPlan.map((a) => [a.planId, a._count._all]));
    const buyersOf = new Map<string, number>();
    for (const p of payers) {
      for (const planId of p.byPlan.keys()) {
        buyersOf.set(planId, (buyersOf.get(planId) ?? 0) + 1);
      }
    }

    const byCategory: RevenueByCategory[] = plans
      .map((p) => {
        const split = statusOf.get(p.id) ?? {};
        const confirmed = split.CONFIRMED ?? 0;
        const planRevenue = confirmed * p.priceUsd;
        return {
          planId: p.id,
          label: `$${p.priceUsd} Booster`,
          priceUsd: p.priceUsd,
          rateBonusPoints: p.rateBonusMilli / 1000,
          durationDays: p.durationDays,
          active: p.active,
          confirmedPurchases: confirmed,
          awaitingPayment: split.AWAITING_PAYMENT ?? 0,
          failed: split.FAILED ?? 0,
          expired: split.EXPIRED ?? 0,
          uniqueBuyers: buyersOf.get(p.id) ?? 0,
          activeBoosters: activeOf.get(p.id) ?? 0,
          revenueUsd: planRevenue,
          shareOfRevenuePct: pct(planRevenue, revenueUsd),
        };
      })
      .sort((a, b) => b.revenueUsd - a.revenueUsd || b.priceUsd - a.priceUsd);

    // ── Time-series ──
    // One flat list of dated, priced payments drives every bucket below.
    const events = windowRows.map((r) => ({
      at: r.confirmedAt ?? r.createdAt,
      userId: r.userId,
      tokenSymbol: r.tokenSymbol,
      usd: priceOf.get(r.planId) ?? 0,
    }));

    const series = {
      daily: this.bucketRevenue(events, 'daily', 30, now),
      weekly: this.bucketRevenue(events, 'weekly', 12, now),
      monthly: this.bucketRevenue(events, 'monthly', 12, now),
    };

    // ── Named periods, each against the window immediately before it ──
    const day = 86_400_000;
    const spanTotals = (fromMs: number, toMs: number) => {
      let usd = 0;
      let purchases = 0;
      const users = new Set<string>();
      for (const e of events) {
        const t = e.at.getTime();
        if (t >= fromMs && t < toMs) {
          usd += e.usd;
          purchases += 1;
          users.add(e.userId);
        }
      }
      return { revenueUsd: usd, purchases, payingUsers: users.size };
    };

    const startOfToday = startOfUtcDay(now).getTime();
    const nowMs = now.getTime() + 1;
    const periodWindow = (label: RevenuePeriod['label'], key: RevenuePeriod['key'], fromMs: number, toMs: number): RevenuePeriod => {
      const current = spanTotals(fromMs, toMs);
      const previous = spanTotals(fromMs - (toMs - fromMs), fromMs);
      return {
        key,
        label,
        ...current,
        previousRevenueUsd: previous.revenueUsd,
        changePct:
          previous.revenueUsd > 0
            ? round2(
                ((current.revenueUsd - previous.revenueUsd) / previous.revenueUsd) * 100,
              )
            : null,
      };
    };

    const periods: RevenuePeriod[] = [
      periodWindow('Today', 'today', startOfToday, startOfToday + day),
      periodWindow('Last 7 days', 'week', nowMs - 7 * day, nowMs),
      periodWindow('Last 30 days', 'month', nowMs - 30 * day, nowMs),
      {
        key: 'year',
        label: 'Last 12 months',
        ...spanTotals(nowMs - 365 * day, nowMs),
        previousRevenueUsd: 0,
        changePct: null,
      },
    ];

    // ── Which token miners actually paid with (inside the window) ──
    const tokens = new Map<string, { purchases: number; revenueUsd: number }>();
    for (const e of events) {
      const symbol = e.tokenSymbol || 'UNKNOWN';
      const row = tokens.get(symbol) ?? { purchases: 0, revenueUsd: 0 };
      row.purchases += 1;
      row.revenueUsd += e.usd;
      tokens.set(symbol, row);
    }
    const byToken = Array.from(tokens.entries())
      .map(([tokenSymbol, row]) => ({ tokenSymbol, ...row }))
      .sort((a, b) => b.revenueUsd - a.revenueUsd);

    // ── Per-miner spend table (top payers inline; all of them via CSV) ──
    const top = payers.slice(0, TOP_PAYERS_LIMIT);
    const profiles = top.length
      ? await this.prisma.user.findMany({
          where: { id: { in: top.map((p) => p.userId) } },
          select: {
            id: true,
            email: true,
            walletAddress: true,
            countryCode: true,
            isBlocked: true,
            createdAt: true,
          },
        })
      : [];
    const profileOf = new Map(profiles.map((u) => [u.id, u]));

    const topPayers: RevenueByUser[] = top.map((p, i) =>
      this.toPayerRow(p, i + 1, revenueUsd, labelOf, priceOf, profileOf.get(p.userId)),
    );

    return {
      generatedAt: now.toISOString(),
      windowDays: REVENUE_WINDOW_DAYS,
      totals: {
        revenueUsd: round2(revenueUsd),
        confirmedPurchases,
        awaitingPayment,
        awaitingPaymentUsd: round2(awaitingPaymentUsd),
        failed,
        expired,
        payingUsers: payers.length,
        totalUsers,
        /** Average revenue per *paying* user. */
        arppuUsd: payers.length ? round2(revenueUsd / payers.length) : 0,
        averageOrderUsd: confirmedPurchases
          ? round2(revenueUsd / confirmedPurchases)
          : 0,
        /** Share of all registered miners who have ever paid. */
        payerConversionPct: pct(payers.length, totalUsers),
        activeBoosters: Array.from(activeOf.values()).reduce((a, b) => a + b, 0),
      },
      periods,
      series,
      byCategory,
      byToken,
      topPayers,
      recentPayments: recentRows.map((r) => ({
        id: r.id,
        userId: r.userId,
        userEmail: r.user?.email ?? null,
        countryCode: r.user?.countryCode ?? null,
        label: labelOf(r.planId),
        priceUsd: priceOf.get(r.planId) ?? 0,
        tokenSymbol: r.tokenSymbol,
        expectedAmount: r.expectedAmount,
        txHash: r.txHash,
        paidAt: (r.confirmedAt ?? r.createdAt).toISOString(),
      })),
    };
  }

  /**
   * Every miner who has ever completed a booster payment, richest first.
   *
   * Grouped in the database by (user, plan) rather than read row by row: the
   * money for a group is `count × plan price`, so the whole spend table costs
   * one grouped scan no matter how many purchases there are.
   */
  private async payerAggregates(priceOf: Map<string, number>) {
    const groups = await this.prisma.boosterPurchase.groupBy({
      by: ['userId', 'planId'],
      where: { status: 'CONFIRMED' },
      _count: { _all: true },
      _min: { confirmedAt: true },
      _max: { confirmedAt: true },
    });

    const payers = new Map<
      string,
      {
        userId: string;
        revenueUsd: number;
        purchases: number;
        firstPurchaseAt: Date | null;
        lastPurchaseAt: Date | null;
        byPlan: Map<string, number>;
      }
    >();

    for (const g of groups) {
      const agg =
        payers.get(g.userId) ??
        {
          userId: g.userId,
          revenueUsd: 0,
          purchases: 0,
          firstPurchaseAt: null as Date | null,
          lastPurchaseAt: null as Date | null,
          byPlan: new Map<string, number>(),
        };

      const count = g._count._all;
      agg.revenueUsd += count * (priceOf.get(g.planId) ?? 0);
      agg.purchases += count;
      agg.byPlan.set(g.planId, (agg.byPlan.get(g.planId) ?? 0) + count);

      const first = g._min.confirmedAt;
      if (first && (!agg.firstPurchaseAt || first < agg.firstPurchaseAt)) {
        agg.firstPurchaseAt = first;
      }
      const last = g._max.confirmedAt;
      if (last && (!agg.lastPurchaseAt || last > agg.lastPurchaseAt)) {
        agg.lastPurchaseAt = last;
      }

      payers.set(g.userId, agg);
    }

    return Array.from(payers.values()).sort(
      (a, b) => b.revenueUsd - a.revenueUsd || b.purchases - a.purchases,
    );
  }

  private toPayerRow(
    p: {
      userId: string;
      revenueUsd: number;
      purchases: number;
      firstPurchaseAt: Date | null;
      lastPurchaseAt: Date | null;
      byPlan: Map<string, number>;
    },
    rank: number,
    totalRevenueUsd: number,
    labelOf: (planId: string) => string,
    priceOf: Map<string, number>,
    profile?: {
      email: string | null;
      walletAddress: string | null;
      countryCode: string | null;
      isBlocked: boolean;
      createdAt: Date;
    },
  ): RevenueByUser {
    return {
      rank,
      userId: p.userId,
      email: profile?.email ?? null,
      walletAddress: profile?.walletAddress ?? null,
      countryCode: profile?.countryCode ?? null,
      isBlocked: profile?.isBlocked ?? false,
      joinedAt: profile?.createdAt.toISOString() ?? null,
      revenueUsd: round2(p.revenueUsd),
      purchases: p.purchases,
      firstPurchaseAt: p.firstPurchaseAt?.toISOString() ?? null,
      lastPurchaseAt: p.lastPurchaseAt?.toISOString() ?? null,
      plans: Array.from(p.byPlan.entries())
        .map(([planId, count]) => ({
          planId,
          label: labelOf(planId),
          priceUsd: priceOf.get(planId) ?? 0,
          count,
        }))
        .sort((a, b) => a.priceUsd - b.priceUsd),
      shareOfRevenuePct: pct(p.revenueUsd, totalRevenueUsd),
    };
  }

  /**
   * Fold dated payments into a fixed run of buckets ending with the current
   * one. The empty buckets are laid out first so a quiet day still shows up
   * as a zero on the chart instead of vanishing from the axis.
   */
  private bucketRevenue(
    events: { at: Date; userId: string; usd: number }[],
    grain: Grain,
    count: number,
    now: Date,
  ): RevenueBucket[] {
    const starts: Date[] = [];
    for (let i = count - 1; i >= 0; i--) {
      starts.push(bucketStart(now, grain, -i));
    }

    const slots = new Map<
      string,
      { bucket: RevenueBucket; users: Set<string> }
    >();
    for (const start of starts) {
      const key = bucketKey(start, grain);
      slots.set(key, {
        bucket: {
          key,
          label: bucketLabel(start, grain),
          start: start.toISOString(),
          revenueUsd: 0,
          purchases: 0,
          payingUsers: 0,
        },
        users: new Set<string>(),
      });
    }

    for (const e of events) {
      const slot = slots.get(bucketKey(bucketStart(e.at, grain, 0), grain));
      if (!slot) continue; // older than the window this grain covers
      slot.bucket.revenueUsd += e.usd;
      slot.bucket.purchases += 1;
      slot.users.add(e.userId);
    }

    return Array.from(slots.values()).map(({ bucket, users }) => ({
      ...bucket,
      revenueUsd: round2(bucket.revenueUsd),
      payingUsers: users.size,
    }));
  }

  // ──────────────────────── Real Reports & CSV ───────────────────────

  async getReportsSummary() {
    const [
      usersCount,
      ledgerCount,
      withdrawalsCount,
      kycCount,
      boostersCount,
      referralsCount,
      payers,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.ledgerEntry.count(),
      this.prisma.withdrawal.count(),
      this.prisma.kycRecord.count(),
      this.prisma.boosterPurchase.count(),
      this.prisma.user.count({ where: { referredById: { not: null } } }),
      // One group per paying miner — the row count of the per-user export.
      this.prisma.boosterPurchase.groupBy({
        by: ['userId'],
        where: { status: 'CONFIRMED' },
      }),
    ]);

    return {
      usersCount,
      miningEntriesCount: ledgerCount,
      withdrawalsCount,
      referralsCount,
      kycCount,
      revenueCount: boostersCount,
      payingUsersCount: payers.length,
    };
  }

  async exportUsersCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: CSV_MAX_ROWS,
      include: { kyc: true, _count: { select: { referrals: true } } },
    });

    const headers = [
      'User ID',
      'Email',
      'Country',
      'Points Balance',
      'Referrals Count',
      'KYC Status',
      'Is Suspended',
      'Registered At',
      'Last Mined At',
    ];

    const rows = users.map((u) => [
      u.id,
      u.email ?? 'Wallet',
      u.countryCode ?? 'Global',
      (Number(u.pointsBalance) / 1000).toFixed(2),
      u._count.referrals,
      u.kyc?.status ?? 'NONE',
      u.isBlocked ? 'YES' : 'NO',
      u.createdAt.toISOString(),
      u.lastMineAt ? u.lastMineAt.toISOString() : 'Never',
    ]);

    return toCsv(headers, rows);
  }

  async exportMiningCsv(): Promise<string> {
    const entries = await this.prisma.ledgerEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(5000, CSV_MAX_ROWS),
      include: { user: { select: { email: true } } },
    });

    const headers = [
      'Ledger ID',
      'User ID',
      'User Email',
      'Reason / Event',
      'Points Delta',
      'Timestamp',
    ];

    const rows = entries.map((e) => [
      e.id,
      e.userId,
      e.user?.email ?? 'Wallet',
      e.reason,
      (Number(e.deltaMilli) / 1000).toFixed(2),
      e.createdAt.toISOString(),
    ]);

    return toCsv(headers, rows);
  }

  async exportWithdrawalsCsv(): Promise<string> {
    const withdrawals = await this.prisma.withdrawal.findMany({
      orderBy: { requestedAt: 'desc' },
      take: CSV_MAX_ROWS,
      include: { user: { select: { email: true } } },
    });

    const headers = [
      'Withdrawal ID',
      'User ID',
      'User Email',
      'Points Deducted',
      'Token Payout Amount',
      'Target BEP-20 Wallet',
      'Transaction Hash',
      'Status',
      'Requested At',
      'Resolved At',
      'Admin Note',
    ];

    const rows = withdrawals.map((w) => [
      w.id,
      w.userId,
      w.user?.email ?? 'Wallet',
      (Number(w.pointsAmount) / 1000).toFixed(2),
      w.tokenAmount,
      w.toAddress,
      w.txHash ?? 'N/A',
      w.status,
      w.requestedAt.toISOString(),
      w.resolvedAt ? w.resolvedAt.toISOString() : 'Pending',
      (w.adminNote ?? '').replace(/"/g, '""'),
    ]);

    return toCsv(headers, rows);
  }

  async exportReferralsCsv(): Promise<string> {
    const users = await this.prisma.user.findMany({
      where: { referredById: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: CSV_MAX_ROWS,
      include: {
        referredBy: { select: { id: true, email: true } },
      },
    });

    const headers = [
      'Miner User ID',
      'Miner Email',
      'Invited By User ID',
      'Inviter Email',
      'Joined At',
    ];

    const rows = users.map((u) => [
      u.id,
      u.email ?? 'Wallet',
      u.referredBy?.id ?? '',
      u.referredBy?.email ?? 'Unknown',
      u.createdAt.toISOString(),
    ]);

    return toCsv(headers, rows);
  }

  async exportKycCsv(): Promise<string> {
    const kycRecords = await this.prisma.kycRecord.findMany({
      orderBy: { updatedAt: 'desc' },
      take: CSV_MAX_ROWS,
      include: { user: { select: { email: true } } },
    });

    const headers = [
      'KYC Record ID',
      'User ID',
      'User Email',
      'Full Name',
      'Document Type',
      'Document Number',
      'Status',
      'Submitted At',
      'Reviewed At',
      'Reviewer Note',
    ];

    const rows = kycRecords.map((k) => [
      k.id,
      k.userId,
      k.user?.email ?? 'Wallet',
      k.fullName ?? 'N/A',
      k.documentType ?? 'N/A',
      k.documentNumber ?? 'N/A',
      k.status,
      k.submittedAt ? k.submittedAt.toISOString() : 'N/A',
      k.reviewedAt ? k.reviewedAt.toISOString() : 'N/A',
      k.reviewerNote,
    ]);

    return toCsv(headers, rows);
  }

  async exportRevenueCsv(): Promise<string> {
    const purchases = await this.prisma.boosterPurchase.findMany({
      orderBy: { createdAt: 'desc' },
      take: CSV_MAX_ROWS,
      include: {
        user: { select: { email: true } },
        plan: true,
      },
    });

    const headers = [
      'Purchase ID',
      'User ID',
      'User Email',
      'Plan Name',
      'Price USD',
      'Status',
      'Transaction Hash',
      'Created At',
      'Confirmed At',
    ];

    const rows = purchases.map((p) => [
      p.id,
      p.userId,
      p.user?.email ?? 'Wallet',
      p.plan?.priceUsd ? '$' + p.plan.priceUsd : 'Custom',
      p.plan?.priceUsd ?? 0,
      p.status,
      p.txHash ?? 'N/A',
      p.createdAt.toISOString(),
      p.confirmedAt ? p.confirmedAt.toISOString() : 'N/A',
    ]);

    return toCsv(headers, rows);
  }


  /**
   * Per-miner booster spend — one row per paying account rather than one per
   * purchase, so the sheet answers "which user paid how much" directly.
   */
  async exportRevenueByUserCsv(): Promise<string> {
    const plans = await this.prisma.boosterPlan.findMany({
      orderBy: { priceUsd: 'asc' },
    });
    const priceOf = new Map(plans.map((p) => [p.id, p.priceUsd]));
    const payers = (await this.payerAggregates(priceOf)).slice(0, CSV_MAX_ROWS);

    const profiles = payers.length
      ? await this.prisma.user.findMany({
          where: { id: { in: payers.map((p) => p.userId) } },
          select: {
            id: true,
            email: true,
            walletAddress: true,
            countryCode: true,
            isBlocked: true,
            createdAt: true,
          },
        })
      : [];
    const profileOf = new Map(profiles.map((u) => [u.id, u]));

    // A column per plan, so the split by category reads across the row.
    const headers = [
      'Rank',
      'User ID',
      'Email',
      'Wallet Address',
      'Country',
      'Is Suspended',
      'Registered At',
      'Total Paid (USD)',
      'Purchases',
      'First Purchase',
      'Last Purchase',
      ...plans.map((p) => `$${p.priceUsd} Booster (qty)`),
    ];

    const rows = payers.map((p, i) => {
      const u = profileOf.get(p.userId);
      return [
        i + 1,
        p.userId,
        u?.email ?? 'Wallet',
        u?.walletAddress ?? '',
        u?.countryCode ?? 'Global',
        u?.isBlocked ? 'YES' : 'NO',
        u?.createdAt.toISOString() ?? '',
        round2(p.revenueUsd).toFixed(2),
        p.purchases,
        p.firstPurchaseAt?.toISOString() ?? '',
        p.lastPurchaseAt?.toISOString() ?? '',
        ...plans.map((plan) => p.byPlan.get(plan.id) ?? 0),
      ];
    });

    return toCsv(headers, rows);
  }

  // ───────────────────── Booster Plans & Purchases Suite ────────────────────

  async listBoosterPlans() {
    const plans = await this.prisma.boosterPlan.findMany({
      orderBy: { priceUsd: 'asc' },
      include: {
        _count: {
          select: {
            boosters: {
              where: { expiresAt: { gt: new Date() } },
            },
          },
        },
      },
    });

    return plans.map((p) => ({
      id: p.id,
      priceUsd: p.priceUsd,
      rateBonusMilli: p.rateBonusMilli,
      rateBonusPoints: p.rateBonusMilli / 1000,
      durationDays: p.durationDays,
      active: p.active,
      activeSales: p._count.boosters,
    }));
  }

  async createBoosterPlan(dto: {
    priceUsd: number;
    rateBonusMilli?: number;
    rateBonusPoints?: number;
    durationDays?: number;
    active?: boolean;
  }) {
    const rateBonusMilli =
      dto.rateBonusMilli ??
      (dto.rateBonusPoints ? Math.round(dto.rateBonusPoints * 1000) : 2000);

    return this.prisma.boosterPlan.create({
      data: {
        priceUsd: Number(dto.priceUsd),
        rateBonusMilli,
        durationDays: Number(dto.durationDays || 30),
        active: dto.active ?? true,
      },
    });
  }

  async updateBoosterPlan(
    id: string,
    dto: {
      priceUsd?: number;
      rateBonusMilli?: number;
      rateBonusPoints?: number;
      durationDays?: number;
      active?: boolean;
    },
  ) {
    const rateBonusMilli =
      dto.rateBonusMilli ??
      (dto.rateBonusPoints ? Math.round(dto.rateBonusPoints * 1000) : undefined);

    return this.prisma.boosterPlan.update({
      where: { id },
      data: {
        ...(dto.priceUsd !== undefined ? { priceUsd: Number(dto.priceUsd) } : {}),
        ...(rateBonusMilli !== undefined ? { rateBonusMilli } : {}),
        ...(dto.durationDays !== undefined ? { durationDays: Number(dto.durationDays) } : {}),
        ...(dto.active !== undefined ? { active: dto.active } : {}),
      },
    });
  }

  async deleteBoosterPlan(id: string) {
    await this.prisma.boosterPlan.delete({ where: { id } });
    return { success: true, message: 'Booster plan deleted.' };
  }

  async listBoosterPurchases(query?: { status?: string; search?: string }) {
    const where: any = {};

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query?.search && query.search.trim().length > 0) {
      const s = query.search.trim().toLowerCase();
      where.OR = [
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { txHash: { contains: s, mode: 'insensitive' } },
        { fromAddress: { contains: s, mode: 'insensitive' } },
        { payToAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const purchases = await this.prisma.boosterPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true } },
        plan: true,
      },
    });

    return purchases.map((p) => ({
      id: p.id,
      userId: p.userId,
      userEmail: p.user?.email ?? 'Wallet Payer',
      planId: p.planId,
      planPriceUsd: p.plan?.priceUsd ?? 0,
      rateBonusPoints: (p.plan?.rateBonusMilli ?? 0) / 1000,
      tokenSymbol: p.tokenSymbol,
      expectedAmount: p.expectedAmount,
      payToAddress: p.payToAddress,
      fromAddress: p.fromAddress,
      status: p.status,
      txHash: p.txHash,
      attemptedTxHash: p.attemptedTxHash,
      failureReason: p.failureReason,
      confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    }));
  }

  async forceConfirmBoosterPurchase(purchaseId: string, customTxHash?: string) {
    const purchase = await this.prisma.boosterPurchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { plan: true },
    });

    if (purchase.status === 'CONFIRMED') {
      return { success: true, message: 'Purchase is already confirmed.' };
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + purchase.plan.durationDays * 24 * 3_600_000,
    );
    const txHash = customTxHash?.trim() || purchase.attemptedTxHash || purchase.txHash || `manual_admin_${Date.now()}`;

    await this.prisma.$transaction([
      this.prisma.boosterPurchase.update({
        where: { id: purchaseId },
        data: {
          status: 'CONFIRMED',
          txHash,
          confirmedAt: now,
          failureReason: null,
        },
      }),
      this.prisma.booster.create({
        data: {
          userId: purchase.userId,
          planId: purchase.planId,
          startedAt: now,
          expiresAt,
          txHash,
          purchaseId: purchase.id,
        },
      }),
    ]);

    return {
      success: true,
      message: `Booster successfully activated for user for ${purchase.plan.durationDays} days.`,
    };
  }
}
