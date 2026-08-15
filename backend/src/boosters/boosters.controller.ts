import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { BoostersService } from './boosters.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateIntentDto, SubmitPaymentDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('boosters')
export class BoostersController {
  constructor(private readonly boosters: BoostersService) {}

  /** GET /api/boosters — catalogue, active boosters, recent purchases. */
  @Get()
  overview(@CurrentUser('id') userId: string) {
    return this.boosters.overview(userId);
  }

  /** POST /api/boosters/purchase — quote a plan and get payment details. */
  @Post('purchase')
  createIntent(@CurrentUser('id') userId: string, @Body() dto: CreateIntentDto) {
    return this.boosters.createIntent(userId, dto.planId, dto.fromAddress);
  }

  /**
   * POST /api/boosters/purchase/:id/submit — hand in the transaction hash.
   * Verified against the chain; activates the booster on success.
   */
  @Post('purchase/:id/submit')
  submit(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: SubmitPaymentDto,
  ) {
    return this.boosters.submitPayment(userId, id, dto.txHash);
  }
}
