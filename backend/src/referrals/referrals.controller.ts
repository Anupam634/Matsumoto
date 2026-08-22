import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
