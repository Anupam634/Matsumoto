import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ReferralsService } from './referrals.service';

@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly referrals: ReferralsService) {}

  /** GET /api/referrals/stats — complete referral tier standing, stats, and network roster. */
  @Get('stats')
  stats(@CurrentUser('id') userId: string) {
    return this.referrals.getReferralStats(userId);
  }

  /**
   * POST /api/referrals/:id/remind — email one idle referral a nudge to mine.
   *
   * Each referral is already limited to one reminder per cooldown; the
   * throttle on top stops a single inviter from blasting a large roster
   * through the mail server in one burst.
   */
  @Post(':id/remind')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  remind(@CurrentUser('id') userId: string, @Param('id') referralId: string) {
    return this.referrals.remindReferral(userId, referralId);
  }
}
