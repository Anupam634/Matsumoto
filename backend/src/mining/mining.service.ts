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

  /** Settle a "Mine" tap: credit accrued points, reset the 24h cooldown. */
  async claim(userId: string) {
    const { boosters, inviteCount, lastMineAt, rateAdjustMilli } =
      await this.loadInputs(userId);

    if (!canClaim({ lastMineAt })) {
      throw new BadRequestException('Mining cooldown is still active (24h).');
    }
    const rateMilli = effectiveRateMilli({
      boosters,
      inviteCount,
      rateAdjustMilli,
    });
    const earnedMilli = accrueMilli({ rateMilli, lastMineAt });
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          pointsBalance: { increment: BigInt(earnedMilli) },
          lastMineAt: now,
        },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'MINING',
          deltaMilli: BigInt(earnedMilli),
          meta: { rateMilli, inviteCount },
        },
      }),
    ]);

    return {
      earnedPoints: earnedMilli / 1000,
      nextClaimAt: new Date(now.getTime() + CLAIM_WINDOW_HOURS * 3_600_000),
    };
  }
}
