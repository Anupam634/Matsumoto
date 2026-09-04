import {
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MiningService } from './mining.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

/** Ledger rows per history request: enough for a dashboard preview. */
const HISTORY_DEFAULT_TAKE = 12;
/** …and the most a client may ask for in one go. */
const HISTORY_MAX_TAKE = 200;

@UseGuards(JwtAuthGuard)
@Controller('mining')
export class MiningController {
  constructor(private readonly mining: MiningService) {}

  /** GET /api/mining/status — live rate, pending points, cooldown. */
  @Get('status')
  status(@CurrentUser('id') userId: string) {
    return this.mining.getStatus(userId);
  }

  /**
   * GET /api/mining/history?take= — lifetime earnings + recent ledger
   * activity. `take` must be an integer; it is clamped to 1..200.
   */
  @Get('history')
  history(
    @CurrentUser('id') userId: string,
    @Query('take', new DefaultValuePipe(HISTORY_DEFAULT_TAKE), ParseIntPipe)
    take: number,
  ) {
    const bounded = Math.min(HISTORY_MAX_TAKE, Math.max(1, take));
    return this.mining.history(userId, bounded);
  }

  /** POST /api/mining/claim — tap the Mine button. */
  @Post('claim')
  claim(@CurrentUser('id') userId: string) {
    return this.mining.claim(userId);
  }
}
