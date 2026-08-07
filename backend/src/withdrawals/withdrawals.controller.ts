import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { WithdrawalsService } from './withdrawals.service';
import { RequestWithdrawalDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  /** POST /api/withdrawals — request a payout (min 100 pts, 1/week, KYC). */
  @Post()
  request(@CurrentUser('id') userId: string, @Body() dto: RequestWithdrawalDto) {
    if (!ethers.isAddress(dto.toAddress)) {
      throw new BadRequestException('Not a valid BNB Chain address.');
    }
    // Points arrive as decimals; the service works in integer milli-points.
    const pointsMilli = Math.round(dto.points * 1000);
    return this.withdrawals.request(userId, dto.toAddress, pointsMilli);
  }

  /** GET /api/withdrawals — the caller's own request history. */
  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.withdrawals.listForUser(userId);
  }
}
