import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SendOtpDto,
} from './dto';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser } from './current-user.decorator';

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
  constructor(private readonly auth: AuthService) {}

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
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.email, dto.purpose ?? 'signup');
  }

  /** POST /api/auth/forgot-password — initiate password recovery. */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  /**
   * POST /api/auth/reset-password — finalize password reset with OTP.
   *
   * Guessing a six-digit code is a volume game, so cap the volume here as
   * well as burning the code after OTP_MAX_ATTEMPTS wrong guesses.
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
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
    });
  }

  /** GET /api/auth/me — profile, balance, KYC status, referral standing. */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser('id') userId: string) {
    return this.auth.me(userId);
  }
}
