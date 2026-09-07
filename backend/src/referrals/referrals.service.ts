import {
  BadRequestException,
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { REFERRAL_TIERS, referralTierFor } from '../mining/mining.engine';
import { maskIdentity } from '../common/mask-identity';
import {
  ACTIVE_WINDOW_MS,
  NUDGE_COOLDOWN_MS,
  ReminderBlock,
  idleDays,
  reminderState,
} from './referral-reminder';

const WEB_URL = (process.env.WEB_URL || 'https://bondkoinlabs.com').replace(/\/$/, '');

const BLOCK_MESSAGES: Record<ReminderBlock, string> = {
  ACTIVE: 'That miner mined in the last 24 hours. There is nothing to remind them about.',
  NO_EMAIL: 'That miner signed up with a wallet only, so there is no inbox to reach.',
  BLOCKED: 'That account is suspended and cannot be reminded.',
  COOLDOWN: `You already reminded that miner recently. Each referral can be reminded once every ${NUDGE_COOLDOWN_MS / 86_400_000} days.`,
};

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Complete referral overview for the authenticated miner:
   * - Total direct referrals and active mining count
   * - Current and next multiplier tier status
   * - Privacy-masked referrals roster, each with its reminder availability
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
            lastReferralNudgeAt: true,
            isBlocked: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const now = new Date();

    const totalInvited = user.referrals.length;
    const activeMinersCount = user.referrals.filter(
      (r) =>
        r.lastMineAt &&
        now.getTime() - new Date(r.lastMineAt).getTime() <= ACTIVE_WINDOW_MS,
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

    const referralsList = user.referrals.map((r) => {
      const maskedEmail = maskIdentity({ id: r.id, email: r.email });
      const isMiningActive = !!(
        r.lastMineAt &&
        now.getTime() - new Date(r.lastMineAt).getTime() <= ACTIVE_WINDOW_MS
      );

      return {
        id: r.id,
        maskedEmail,
        countryCode: r.countryCode ?? 'GLOBAL',
        joinedAt: r.createdAt.toISOString(),
        lastMineAt: r.lastMineAt ? r.lastMineAt.toISOString() : null,
        isMiningActive,
        reminder: reminderState(r, now),
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

  /**
   * Email one idle referral a nudge to come back and mine.
   *
   * The referral must belong to the caller — the lookup is keyed on both
   * ids, so a guessed id for someone else's referral is simply "not found".
   * The eligibility rules live in `reminderState` and are re-checked here
   * regardless of what the client showed, and the cooldown stamp is written
   * with a conditional update so two taps racing each other send one mail.
   */
  async remindReferral(userId: string, referralId: string) {
    const [inviter, referral] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { id: true, email: true },
      }),
      this.prisma.user.findFirst({
        where: { id: referralId, referredById: userId },
        select: {
          id: true,
          email: true,
          isBlocked: true,
          lastMineAt: true,
          lastReferralNudgeAt: true,
        },
      }),
    ]);

    if (!referral) {
      throw new NotFoundException('That miner is not in your referral network.');
    }

    const now = new Date();
    const state = reminderState(referral, now);
    if (!state.canSend) {
      throw new BadRequestException(BLOCK_MESSAGES[state.reason!]);
    }

    // Claim the cooldown slot before sending. `updateMany` with the previous
    // stamp in the filter makes this a compare-and-set: a concurrent second
    // tap sees zero rows updated and stops.
    const claimed = await this.prisma.user.updateMany({
      where: { id: referral.id, lastReferralNudgeAt: referral.lastReferralNudgeAt },
      data: { lastReferralNudgeAt: now },
    });
    if (claimed.count === 0) {
      throw new BadRequestException(BLOCK_MESSAGES.COOLDOWN);
    }

    const delivered = await this.email.sendReferralReminderEmail(referral.email!, {
      inviterLabel: maskIdentity({ id: inviter.id, email: inviter.email }),
      idleDays: idleDays(referral.lastMineAt, now),
      dashboardUrl: `${WEB_URL}/en/dashboard`,
    });

    if (!delivered) {
      // Give the slot back so the inviter can retry once mail is healthy.
      await this.prisma.user.updateMany({
        where: { id: referral.id, lastReferralNudgeAt: now },
        data: { lastReferralNudgeAt: referral.lastReferralNudgeAt },
      });
      throw new BadGatewayException(
        'We could not send the reminder right now. Please try again in a moment.',
      );
    }

    this.logger.log(`[REFERRAL NUDGE] ${userId} -> ${referral.id}`);

    return {
      sentAt: now.toISOString(),
      availableAt: new Date(now.getTime() + NUDGE_COOLDOWN_MS).toISOString(),
    };
  }
}
