import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
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

/** Client IP, honouring a proxy header when the API sits behind one. */
function clientIp(req: any): string | undefined {
  const forwarded = req.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip ?? req.socket?.remoteAddress ?? undefined;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // The SMTP diagnostic that used to live here sent real mail from the
  // company address to any recipient a caller named, unauthenticated. It is
  // now GET /api/admin/email-health, behind the admin token.

  /** POST /api/auth/send-otp — request OTP for email verification. */
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.auth.sendOtp(dto.email, dto.purpose ?? 'signup');
  }

  /** POST /api/auth/forgot-password — initiate password recovery. */
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto);
  }

  /** POST /api/auth/reset-password — finalize password reset with OTP. */
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
