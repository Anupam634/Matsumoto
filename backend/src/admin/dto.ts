import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
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
  password!: string;
}

export class BlockUserDto {
  @IsBoolean()
  blocked!: boolean;
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
