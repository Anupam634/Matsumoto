import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { MiningService } from './mining.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('mining')
export class MiningController {
  constructor(private readonly mining: MiningService) {}

  /** GET /api/mining/status — live rate, pending points, cooldown. */
  @Get('status')
  status(@CurrentUser('id') userId: string) {
    return this.mining.getStatus(userId);
  }

  /** GET /api/mining/history — lifetime earnings + recent ledger activity. */
  @Get('history')
  history(@CurrentUser('id') userId: string) {
    return this.mining.history(userId);
  }

  /** POST /api/mining/claim — tap the Mine button. */
  @Post('claim')
  claim(@CurrentUser('id') userId: string) {
    return this.mining.claim(userId);
  }
}
