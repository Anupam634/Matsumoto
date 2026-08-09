import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
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

@Injectable()
export class AdminService {
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

  /** Platform totals for the dashboard cards (SPEC §6). */
  async stats() {
    const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

    const [totalUsers, activeMiners, blocked, balance, byCountry, withdrawals] =
      await Promise.all([
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
      ]);

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
    _count: { referrals: number };
  }): AdminUserRow {
    const boosters: ActiveBooster[] = u.boosters.map((b) => ({
      rateBonusMilli: b.plan.rateBonusMilli,
      expiresAt: b.expiresAt,
    }));
    const inviteCount = u._count.referrals;
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
    };
  }

  /** One miner, plus their downline tree and recent ledger activity. */
  async userDetail(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        kyc: true,
        boosters: { include: { plan: true } },
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
}
