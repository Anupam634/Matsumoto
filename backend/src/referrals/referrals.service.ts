import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { REFERRAL_TIERS, referralTierFor } from '../mining/mining.engine';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Complete referral overview for the authenticated miner:
   * - Total direct referrals and active mining count
   * - Current and next multiplier tier status
   * - Privacy-masked referrals roster
   */
  async getReferralStats(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        referralCode: true,
        referrals: {
          select: {
            id: true,
            email: true,
            countryCode: true,
            createdAt: true,
            lastMineAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const now = new Date();
    const activeWindow = 24 * 60 * 60 * 1000; // 24 hours

    const totalInvited = user.referrals.length;
    const activeMinersCount = user.referrals.filter(
      (r) =>
        r.lastMineAt &&
        now.getTime() - new Date(r.lastMineAt).getTime() <= activeWindow,
    ).length;

    const currentTier = referralTierFor(totalInvited);
    const nextTier =
      REFERRAL_TIERS.find((t) => t.level === currentTier.level + 1) || null;

    let progressToNextPercent = 100;
    let invitesNeededForNext = 0;

    if (nextTier) {
      const tierRange = nextTier.minInvites - currentTier.minInvites;
      const currentProgress = totalInvited - currentTier.minInvites;
      progressToNextPercent = Math.min(
        100,
        Math.max(0, Math.round((currentProgress / tierRange) * 100)),
      );
      invitesNeededForNext = Math.max(0, nextTier.minInvites - totalInvited);
    }

    // Mask user emails for privacy (e.g. be***@gmail.com)
    const referralsList = user.referrals.map((r) => {
      let maskedEmail = 'Miner ' + r.id.slice(-4);
      if (r.email) {
        const [local, domain] = r.email.split('@');
        maskedEmail =
          local.length <= 2
            ? local[0] + '***@' + (domain || 'matsumoto.io')
            : local.slice(0, 2) + '***@' + (domain || 'matsumoto.io');
      }
      const isMiningActive = !!(
        r.lastMineAt &&
        now.getTime() - new Date(r.lastMineAt).getTime() <= activeWindow
      );

      return {
        id: r.id,
        maskedEmail,
        countryCode: r.countryCode ?? 'GLOBAL',
        joinedAt: r.createdAt.toISOString(),
        lastMineAt: r.lastMineAt ? r.lastMineAt.toISOString() : null,
        isMiningActive,
      };
    });

    return {
      referralCode: user.referralCode,
      totalInvited,
      activeMinersCount,
      currentTier,
      nextTier,
      progressToNextPercent,
      invitesNeededForNext,
      allTiers: REFERRAL_TIERS,
      referralsList,
    };
  }
}
