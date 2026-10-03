import { IsCountryCode } from '../common/is-country-code';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
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
   * The emailed sign-in code. Required on the second step for an account
   * without an authenticator app, on every platform (see AuthService.login).
   */
  @IsOptional()
  @IsString()
  @Length(6, 6)
  otp?: string;

  /**
   * The current code from the account's authenticator app. Required on the
   * second step for an account with two-factor authentication on — in place
   * of the emailed code, not as well as it.
   */
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' })
  totp?: string;

  /**
   * Which client is calling. Decides only whether the captcha is asked for
   * (see common/turnstile.ts) — it is written by the caller, so it no longer
   * decides whether a second factor is required.
   */
  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';

  /** Turnstile solution, required from the website on the first step. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;

  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';
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

  /**
   * Cloudflare Turnstile solution. Required for `signup` and
   * `forgot_password` from the website once TURNSTILE_SECRET_KEY is set —
   * both mail an address nobody has authenticated against.
   */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  captchaToken?: string;

  @IsOptional()
  @IsIn(['web', 'mobile'])
  platform?: 'web' | 'mobile';

  /** Feeds the per-device signup cap, which now runs before any mail is sent. */
  @IsOptional()
  @IsString()
  @MaxLength(128)
  deviceFingerprint?: string;
}

/** Body of `POST /auth/2fa/enable` and `POST /auth/2fa/disable`. */
export class TotpConfirmDto {
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from your authenticator app.' })
  code!: string;

  /** The account password, so a stolen session alone cannot change 2FA. */
  @IsString()
  @MaxLength(128)
  password!: string;
}
