import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ethers } from 'ethers';
import { WithdrawalsService } from './withdrawals.service';
import { RequestWithdrawalDto, SendWithdrawalOtpDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('withdrawals')
export class WithdrawalsController {
  constructor(private readonly withdrawals: WithdrawalsService) {}

  /** POST /api/withdrawals/send-otp — mail a confirmation code to self. */
  @Post('send-otp')
  sendOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: SendWithdrawalOtpDto,
    @Req() req: any,
  ) {
    return this.withdrawals.sendWithdrawalOtp(userId, {
      captchaToken: dto.captchaToken,
      platform: dto.platform,
      ip: req?.ip ?? req?.socket?.remoteAddress,
    });
  }

  /** POST /api/withdrawals — request a payout (min 100 pts, 1/week, KYC). */
  @Post()
  request(@CurrentUser('id') userId: string, @Body() dto: RequestWithdrawalDto) {
    if (!ethers.isAddress(dto.toAddress)) {
      throw new BadRequestException('Not a valid BNB Chain address.');
    }
    // Points arrive as decimals; the service works in integer milli-points.
    const pointsMilli = Math.round(dto.points * 1000);
    return this.withdrawals.request(userId, dto.toAddress, pointsMilli, {
      otp: dto.otp,
      platform: dto.platform,
    });
  }

  /** GET /api/withdrawals — the caller's own request history. */
  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.withdrawals.listForUser(userId);
  }
}
