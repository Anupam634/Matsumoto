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

const DUMMY_OTP = '12345';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly antiabuse: AntiabuseService,
  ) {}

  private sign(user: { id: string; email: string | null }) {
    return this.jwt.signAsync({ sub: user.id, email: user.email });
  }

  /**
   * Request OTP verification code for Signup, 2FA, or Password Reset.
   */
  async sendOtp(email: string) {
    const cleanEmail = email.trim().toLowerCase();
    this.logger.log(`[OTP] Generated verification code for ${cleanEmail}: ${DUMMY_OTP}`);
    return {
      success: true,
      message: `Verification code sent to ${cleanEmail}. (Code: ${DUMMY_OTP})`,
      dummyOtp: DUMMY_OTP,
    };
  }

  /**
   * Request password reset OTP.
   */
  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (user && user.isBlocked) {
      throw new ForbiddenException('Account is blocked.');
    }
    // Return dummy OTP for development/testing
    this.logger.log(`[Password Reset] OTP for ${email}: ${DUMMY_OTP}`);
    return {
      success: true,
      message: `Password reset OTP has been sent to ${email}.`,
      dummyOtp: DUMMY_OTP,
    };
  }

  /**
   * Reset user password using OTP.
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

    if (dto.otp.trim() !== DUMMY_OTP) {
      throw new BadRequestException('Invalid or expired verification code. Use 12345.');
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
   * Free registration (SPEC §1).
   */
  async register(dto: RegisterDto, signals: SignupSignals) {
    const email = dto.email.trim().toLowerCase();

    if (dto.otp && dto.otp.trim() !== DUMMY_OTP) {
      throw new BadRequestException('Invalid email verification code. Use 12345.');
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

    if (dto.otp && dto.otp.trim() !== DUMMY_OTP) {
      throw new BadRequestException('Invalid 2FA verification code. Use 12345.');
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
