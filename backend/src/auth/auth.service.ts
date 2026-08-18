import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { AntiabuseService } from '../antiabuse/antiabuse.service';
import { EmailService } from '../email/email.service';
import { hashPassword, verifyPassword } from './password';
import {
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { referralTierFor } from '../mining/mining.engine';

/** Request-derived signals we pass through to the anti-abuse checks. */
export interface SignupSignals {
  ip?: string;
  fingerprint?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly antiabuse: AntiabuseService,
    private readonly emailService: EmailService,
  ) {}

  private sign(user: { id: string; email: string | null }) {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  /**
   * Request OTP verification code for Signup, 2FA, or Password Reset.
   */
  async sendOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    return this.emailService.sendOtpEmail(cleanEmail, 'signup');
  }

  /**
   * Request password reset OTP.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found with this email address.');
    }
    if (user.isBlocked) {
      throw new ForbiddenException('Account is blocked.');
    }
    return this.emailService.sendOtpEmail(email, 'forgot_password');
  }

  /**
   * Reset user password using real verified OTP.
   */
  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('No account found with this email address.');
    }
    if (user.isBlocked) {
      throw new ForbiddenException('Account is blocked.');
    }

    const isValid = this.emailService.verifyOtp(email, dto.otp);
    if (!isValid) {
      throw new BadRequestException('Invalid or expired verification code. Please request a new OTP.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });

    return {
      success: true,
      message: 'Your password has been reset successfully. Please sign in.',
    };
  }

  /**
   * Free registration (SPEC §1) with verified real OTP.
   */
  async register(dto: RegisterDto, signals: SignupSignals) {
    const email = dto.email.trim().toLowerCase();

    if (dto.otp) {
      const isValid = this.emailService.verifyOtp(email, dto.otp);
      if (!isValid) {
        throw new BadRequestException('Invalid or expired email verification code. Please request a new OTP.');
      }
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestException('That email is already registered.');
    }

    await this.antiabuse.assertSignupAllowed({
      fingerprint: signals.fingerprint,
      ip: signals.ip,
    });

    let referredById: string | null = null;
    let referralRejected = false;
    if (dto.referralCode) {
      const referrer = await this.prisma.user.findUnique({
        where: { referralCode: dto.referralCode.trim() },
        select: { id: true, isBlocked: true },
      });
      if (!referrer || referrer.isBlocked) {
        throw new BadRequestException('Unknown referral code.');
      }
      const suspicious = await this.antiabuse.isSelfReferral(referrer.id, {
        fingerprint: signals.fingerprint,
        ip: signals.ip,
      });
      if (suspicious) {
        referralRejected = true;
        this.logger.warn(
          `dropped self-referral for referrer ${referrer.id} (shared device/IP)`,
        );
      } else {
        referredById = referrer.id;
      }
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(dto.password),
        countryCode: dto.countryCode?.toUpperCase(),
        referredById,
      },
      select: { id: true, email: true, referralCode: true },
    });

    await this.antiabuse.recordDevice(user.id, {
      fingerprint: signals.fingerprint,
      ip: signals.ip,
    });

    return {
      accessToken: await this.sign(user),
      user: {
        id: user.id,
        email: user.email,
        referralCode: user.referralCode,
      },
      referralRejected,
    };
  }

  async login(dto: LoginDto, signals: SignupSignals) {
    const email = dto.email.trim().toLowerCase();

    if (dto.otp) {
      const isValid = this.emailService.verifyOtp(email, dto.otp);
      if (!isValid) {
        throw new BadRequestException('Invalid or expired 2FA verification code. Please request a new OTP.');
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        isBlocked: true,
        referralCode: true,
      },
    });

    // Same message for unknown email and wrong password — no account probing.
    const ok = user && (await verifyPassword(dto.password, user.passwordHash));
    if (!user || !ok) {
      throw new UnauthorizedException('Invalid email or password.');
    }
    if (user.isBlocked) {
      throw new ForbiddenException('Account is blocked.');
    }

    await this.antiabuse.recordDevice(user.id, {
      fingerprint: signals.fingerprint,
      ip: signals.ip,
    });

    return {
      accessToken: await this.sign(user),
      user: {
        id: user.id,
        email: user.email,
        referralCode: user.referralCode,
      },
    };
  }

  /** Profile for the authenticated user — balance, KYC, referral standing. */
  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        walletAddress: true,
        countryCode: true,
        pointsBalance: true,
        referralCode: true,
        createdAt: true,
        kyc: { select: { status: true } },
        _count: { select: { referrals: true } },
      },
    });

    return {
      id: user.id,
      email: user.email,
      walletAddress: user.walletAddress,
      countryCode: user.countryCode,
      // BigInt milli-points -> decimal points for the client.
      pointsBalance: Number(user.pointsBalance) / 1000,
      referralCode: user.referralCode,
      referralCount: user._count.referrals,
      referralTier: referralTierFor(user._count.referrals),
      kycStatus: user.kyc?.status ?? 'NONE',
      createdAt: user.createdAt,
    };
  }
}
