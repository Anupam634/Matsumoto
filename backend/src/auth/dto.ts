import { IsCountryCode } from '../common/is-country-code';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  /** Referral code of the inviting user (SPEC §2 referral tiers). */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  referralCode?: string;

  /**
   * ISO-3166 alpha-2. Required at signup: the admin per-country breakdown
   * (SPEC §6) is only meaningful if every account actually carries one.
   */
  @IsString()
  @IsCountryCode()
  countryCode!: string;

  /**
   * The 6-digit code mailed by `POST /auth/send-otp` with purpose `signup`.
   *
   * Required, and required at the DTO level rather than only in the service:
   * when this was optional a caller could open an account on any address by
   * leaving the field out.
   */
  @IsString()
  @Length(6, 6, { message: 'Enter the 6-digit code sent to your email.' })
  otp!: string;

  /** Client-side device fingerprint, used by the anti-abuse guard (SPEC §7). */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(128)
  password!: string;

  /**
   * Optional second factor. Unlike signup, no client requests a login code
   * today, so this stays optional — but when it is sent it must be a valid
   * `login_2fa` code (see AuthService.login).
   */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'Enter the 6-digit code sent to your email.' })
  otp!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters.' })
  @MaxLength(128)
  newPassword!: string;
}

/**
 * Request an OTP. This route used to read `@Body('email')` raw, with no
 * validation at all and a hardcoded fallback address — so it accepted
 * anything, including junk that could never receive a code.
 */
export class SendOtpDto {
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsIn(['signup', 'login', 'forgot_password'])
  purpose?: 'signup' | 'login' | 'forgot_password';
}
