import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class RequestWithdrawalDto {
  /** Amount in whole/decimal Matsumoto Points (min 100 — SPEC §4). */
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal is 100 points.' })
  points!: number;

  /** BNB Chain address that receives the $Matsumoto payout. */
  @IsString()
  toAddress!: string;

  /**
   * Confirmation code from `POST /withdrawals/send-otp`. Required on every
   * platform for an account without an authenticator app (see
   * WithdrawalsService.confirmSecondFactor), so a stolen session token alone
   * cannot move funds.
   */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  /** Current authenticator-app code; required instead of `otp` when 2FA is on. */
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' })
  totp?: string;

  /**
   * Which client is calling. Recorded on the request for the reviewer and
   * used for the captcha decision on send-otp; never for whether a code is
   * required — the caller writes it.
   */
  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';

  /** Recorded on the request so the reviewer can see which device asked. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;
}

/** Body of `POST /withdrawals/send-otp`. */
export class SendWithdrawalOtpDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;

  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';
}
