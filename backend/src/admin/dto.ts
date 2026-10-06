import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class AdminLoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  /** The code mailed to the operator inbox — the second step of sign-in. */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;
}

/**
 * Security tab changes. Every field is optional, and `null` — which
 * @IsOptional lets through — puts a setting back on its env default. Bounds
 * are checked in SecuritySettingsService, which owns them; these only keep
 * the wrong types out.
 */
export class UpdateSecuritySettingsDto {
  @IsOptional()
  @IsInt()
  maxAccountsPerDevice?: number | null;

  @IsOptional()
  @IsInt()
  maxAccountsPerIp?: number | null;

  @IsOptional()
  @IsInt()
  maxAccountsPerSubnet?: number | null;

  @IsOptional()
  @IsBoolean()
  requireTotpForWithdrawal?: boolean | null;
}

/** Body of `POST /admin/security/review-account`. */
export class ReviewAccountDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /**
   * Long, because this account signs in on the password alone: the login
   * rate limit is all that stands between it and a guesser.
   */
  @IsString()
  @MinLength(16, { message: 'Use at least 16 characters — this account has no second factor.' })
  @MaxLength(128)
  password!: string;
}

export class BlockUserDto {
  @IsBoolean()
  blocked!: boolean;

  /** Optional explanation, included in the email sent to the user. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class AdjustRateDto {
  /**
   * Signed milli-points/hour applied before the referral multiplier.
   * Bounded so a typo can't mint an astronomical rate — ±1,000,000 milli
   * is ±1000 points/hour, well past any legitimate booster stack.
   */
  @IsInt()
  @Min(-1_000_000)
  @Max(1_000_000)
  rateAdjustMilli!: number;
}

export class AirdropDto {
  /** Points to credit (not milli) — the admin panel speaks in points. */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  points!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class WithdrawalDecisionDto {
  @IsBoolean()
  approve!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}
