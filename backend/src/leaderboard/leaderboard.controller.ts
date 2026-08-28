import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardQueryDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboard: LeaderboardService) {}

  /**
   * GET /api/leaderboard?category=EARNINGS|BALANCE|REFERRALS
   *                     &period=ALL_TIME|MONTH|WEEK&limit=50
   *
   * Ranked miners (identities masked) plus the caller's own standing in
   * the full field, whether or not they made the page.
   */
  @Get()
  list(@CurrentUser('id') userId: string, @Query() query: LeaderboardQueryDto) {
    return this.leaderboard.getLeaderboard(userId, query);
  }
}
