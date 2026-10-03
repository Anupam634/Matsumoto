import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
  TotpConfirmDto,
} from './dto';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';
import { requestContext } from '../security/request-context';

/**
 * Client IP as Express resolved it.
 *
 * This used to read `X-Forwarded-For` directly and take the leftmost entry —
 * which is the part of the header the *client* writes. Sending a fresh value
 * with each request made every signup look like it came from a new network,
 * so MAX_ACCOUNTS_PER_IP and the same-IP self-referral check were both a
 * formality. `req.ip` honours the `trust proxy: 1` set in main.ts, so it is
 * the address nginx actually saw and the client cannot move it.
 */
function clientIp(req: any): string | undefined {
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly twoFactor: TwoFactorService,
  ) {}

  // The SMTP diagnostic that used to live here sent real mail from the
  // company address to any recipient a caller named, unauthenticated. It is
  // now GET /api/admin/email-health, behind the admin token.

  /**
   * POST /api/auth/send-otp — request OTP for email verification.
   *
   * EmailService caps sends per *address*; this caps them per caller, so one
   * host cannot walk a list of addresses at the global 300/min rate.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto, @Req() req: any) {
    return this.auth.sendOtp(dto.email, dto.purpose ?? 'signup', {
      captchaToken: dto.captchaToken,
      platform: dto.platform,
      ip: clientIp(req),
      fingerprint: dto.deviceFingerprint,
    });
  }

  /** POST /api/auth/forgot-password — initiate password recovery. */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: any) {
    return this.auth.forgotPassword(dto, clientIp(req));
  }

  /**
   * POST /api/auth/reset-password — finalize password reset with OTP.
   *
   * Guessing a six-digit code is a volume game, so cap the volume here as
   * well as burning the code after OTP_MAX_ATTEMPTS wrong guesses.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: any) {
    return this.auth.resetPassword(dto, requestContext(req));
  }

  /** POST /api/auth/register — free signup (SPEC §1). */
  @Post('register')
  register(@Body() dto: RegisterDto, @Req() req: any) {
    return this.auth.register(dto, {
      ip: clientIp(req),
      fingerprint: dto.deviceFingerprint,
    });
  }

  /** POST /api/auth/login */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.auth.login(dto, {
      ip: clientIp(req),
      fingerprint: dto.deviceFingerprint,
      userAgent: requestContext(req).userAgent,
    });
  }

  /** GET /api/auth/me — profile, balance, KYC status, referral standing. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }

  // ─────────────── Authenticator app (two-factor) ───────────────

  /**
   * POST /api/auth/2fa/setup — a new secret and its otpauth:// link, for the
   * QR code. Changes nothing yet; `enable` does, once a code proves the app
   * has the secret.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/setup')
  setupTwoFactor(@CurrentUser('id') userId: string) {
    return this.twoFactor.beginSetup(userId);
  }

  /**
   * POST /api/auth/2fa/enable — `{ code, password }`. Signs every other
   * session out, so the response carries a fresh token for this one.
   */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/enable')
  async enableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: TotpConfirmDto,
    @Req() req: any,
  ) {
    await this.twoFactor.enable(userId, dto.code, dto.password, requestContext(req));
    return { enabled: true, accessToken: await this.auth.tokenFor(userId) };
  }

  /** POST /api/auth/2fa/disable — `{ code, password }`. Same token handling as enable. */
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('2fa/disable')
  async disableTwoFactor(
    @CurrentUser('id') userId: string,
    @Body() dto: TotpConfirmDto,
    @Req() req: any,
  ) {
    await this.twoFactor.disable(userId, dto.code, dto.password, requestContext(req));
    return { enabled: false, accessToken: await this.auth.tokenFor(userId) };
  }
}
