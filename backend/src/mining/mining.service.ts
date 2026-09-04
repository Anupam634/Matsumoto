import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  effectiveRateMilli,
  accrueMilli,
  canClaim,
  referralTierFor,
  ActiveBooster,
  CLAIM_WINDOW_HOURS,
} from './mining.engine';
import { lockUserRow } from '../common/row-lock';

/**
 * Orchestrates the mining flow: reads a user's boosters + referral count,
 * computes their live rate, and settles a "Mine" tap into the ledger.
 * All the arithmetic lives in mining.engine.ts (pure + tested).
 */
@Injectable()
export class MiningService {
  constructor(private readonly prisma: PrismaService) {}

  private async loadInputs(userId: string): Promise<{
    boosters: ActiveBooster[];
    inviteCount: number;
    lastMineAt: Date | null;
    rateAdjustMilli: number;
  }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        boosters: { include: { plan: true } },
        _count: { select: { referrals: true } },
      },
    });
    const boosters: ActiveBooster[] = user.boosters.map((b) => ({
      rateBonusMilli: b.plan.rateBonusMilli,
      expiresAt: b.expiresAt,
    }));
    return {
      boosters,
      inviteCount: user._count.referrals,
      lastMineAt: user.lastMineAt,
      rateAdjustMilli: user.rateAdjustMilli,
    };
  }

  /** Live stats for the dashboard (rate, tier, whether a tap is available). */
  async getStatus(userId: string) {
    const { boosters, inviteCount, lastMineAt, rateAdjustMilli } =
      await this.loadInputs(userId);
    const rateMilli = effectiveRateMilli({
      boosters,
      inviteCount,
      rateAdjustMilli,
    });
    const pending = accrueMilli({ rateMilli, lastMineAt });
    return {
      ratePerHour: rateMilli / 1000,
      referralTier: referralTierFor(inviteCount),
      activeBoosters: boosters.filter((b) => b.expiresAt > new Date()).length,
      pendingPoints: pending / 1000,
      canClaim: canClaim({ lastMineAt }),
      // The dashboard interpolates accrual between polls rather than
      // hammering this endpoint: it needs the cooldown deadline to run a
      // countdown, and the 24h accrual ceiling to know when to stop ticking.
      nextClaimAt: lastMineAt
        ? new Date(lastMineAt.getTime() + CLAIM_WINDOW_HOURS * 3_600_000)
        : null,
      maxPendingPoints: (rateMilli * CLAIM_WINDOW_HOURS) / 1000,
    };
  }

  /**
   * Lifetime earnings and recent activity for the dashboard.
   *
   * "Earned" counts only credits (mining, tasks, referrals, airdrops) — a
   * withdrawal debit must not quietly reduce what the user was shown as
   * having earned.
   */
  async history(userId: string, take = 12) {
    // The controller already bounds `take`; this keeps any other caller from
    // pulling the whole ledger by accident.
    take = Math.min(200, Math.max(1, Math.trunc(take) || 12));
    const [credited, entries] = await Promise.all([
      this.prisma.ledgerEntry.aggregate({
        where: { userId, deltaMilli: { gt: 0 } },
        _sum: { deltaMilli: true },
      }),
      this.prisma.ledgerEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
      }),
    ]);

    return {
      lifetimeEarnedPoints: Number(credited._sum.deltaMilli ?? 0n) / 1000,
      entries: entries.map((e) => ({
        id: e.id,
        reason: e.reason,
        points: Number(e.deltaMilli) / 1000,
        createdAt: e.createdAt,
      })),
    };
  }

  /**
   * Settle a "Mine" tap: credit accrued points, reset the 24h cooldown.
   *
   * The cooldown is re-read under a lock on the user's row and the credit is
   * written in the same transaction. Checking `canClaim` first and crediting
   * afterwards meant a handful of taps fired together all read the same
   * `lastMineAt`, all passed, and all credited — a full day's mining paid out
   * as many times as the client could get requests in flight.
   */
  async claim(userId: string) {
    const now = new Date();

    const earnedMilli = await this.prisma.$transaction(async (tx) => {
      await lockUserRow(tx, userId);

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          boosters: { include: { plan: true } },
          _count: { select: { referrals: true } },
        },
      });

      if (!canClaim({ lastMineAt: user.lastMineAt })) {
        throw new BadRequestException('Mining cooldown is still active (24h).');
      }

      const rateMilli = effectiveRateMilli({
        boosters: user.boosters.map((b) => ({
          rateBonusMilli: b.plan.rateBonusMilli,
          expiresAt: b.expiresAt,
        })),
        inviteCount: user._count.referrals,
        rateAdjustMilli: user.rateAdjustMilli,
      });
      const earned = accrueMilli({ rateMilli, lastMineAt: user.lastMineAt });

      await tx.user.update({
        where: { id: userId },
        data: {
          pointsBalance: { increment: BigInt(earned) },
          lastMineAt: now,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          reason: 'MINING',
          deltaMilli: BigInt(earned),
          meta: { rateMilli, inviteCount: user._count.referrals },
        },
      });
      return earned;
    });

    return {
      earnedPoints: earnedMilli / 1000,
      nextClaimAt: new Date(now.getTime() + CLAIM_WINDOW_HOURS * 3_600_000),
    };
  }
}
