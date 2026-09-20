import { IsIn, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class RequestWithdrawalDto {
  /** Amount in whole/decimal Matsumoto Points (min 100 — SPEC §4). */
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal is 100 points.' })
  points!: number;

  /** BNB Chain address that receives the $Matsumoto payout. */
  @IsString()
  toAddress!: string;

  /**
   * Confirmation code from `POST /withdrawals/send-otp`. Required when
   * `platform` is `web` (see WithdrawalsService.request) — mirrors the login
   * OTP so a stolen session token alone can't move funds through the site.
   */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  /** Same caveat as LoginDto.platform: a client-declared signal, not proof. */
  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';
}
