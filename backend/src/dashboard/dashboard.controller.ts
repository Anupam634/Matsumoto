import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { MiningService } from '../mining/mining.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/** Ledger rows the dashboard shows in its activity preview. */
const HISTORY_TAKE = 12;

/**
 * Everything the dashboard renders, in one request.
 *
 * The page used to open with three calls — `/mining/status`, `/auth/me` and
 * `/mining/history` — repeated on every poll. Each one carries its own
 * JwtAuthGuard lookup, so three-quarters of the guard's queries existed only
 * because the data arrived in three pieces.
 *
 * That cost is network, not compute: production runs its database in another
 * region, where one round trip is ~190ms, so trimming round trips is the
 * whole point. The underlying services are untouched and their routes still
 * exist — this only changes how many requests it takes to fill one screen.
 */
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly mining: MiningService,
    private readonly auth: AuthService,
  ) {}

  /** GET /api/dashboard — mining status, profile and recent ledger together. */
  @Get()
  async overview(@CurrentUser('id') userId: string) {
    const [status, profile, history] = await Promise.all([
      this.mining.getStatus(userId),
      this.auth.me(userId),
      this.mining.history(userId, HISTORY_TAKE),
    ]);
    return { status, profile, history };
  }
}
