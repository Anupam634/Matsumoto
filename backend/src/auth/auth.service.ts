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
import { canonicalizeEmail } from '../common/canonical-email';

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
   * Find an account that already owns this *mailbox*, not just this string.
   *
   * Gmail delivers `xyz@`, `xy.z@` and `xyz+tag@` to one inbox, so comparing
   * the address as typed let the same mailbox hold any number of accounts:
   * the dot variant passed the uniqueness check, was mailed an OTP, and
   * registered. The exact match runs first because it covers every domain and
   * uses the unique index; the canonical sweep runs second, and only for the
   * domains that actually alias.
   *
   * Read-only, and deliberately raw: the canonical form is not a stored
   * column, so the fold has to happen in the query. The two regexes split on
   * the LAST `@` to match `canonicalizeEmail` exactly — greedy `^.*@` leaves
   * the domain, `@[^@]*$` leaves the local part — and from there the rule is
   * the helper's: drop any `+` tag, drop the dots, treat both Google domains
   * as one. Change one side and you must change the other.
   *
   * The sweep is a sequential scan; no index can serve a computed fold. It is
   * bounded to Google addresses and runs only on the sign-up path after the
   * indexed exact match misses, so it costs one scan per new Gmail sign-up.
   * If the users table grows enough for that to hurt, the fix is a stored
   * `emailCanonical` column with a unique index — a migration, which this
   * change deliberately avoids.
   */
  private async findAccountForMailbox(rawEmail: string) {
    const { normalized, canonicalLocal, aliases } = canonicalizeEmail(rawEmail);

    const exact = await this.prisma.user.findUnique({
      where: { email: normalized },
      select: { id: true, email: true, isBlocked: true },
    });
    if (exact) return exact;

    // Every Google address gets swept, including one that is already in
    // canonical form: the account that exists may be the dotted one, and
    // `xyz@gmail.com` arriving against a stored `x.y.z@gmail.com` is the same
    // collision seen from the other side.
    if (!aliases) return null;

    // An address whose local part is nothing but a `+tag` (`+x@gmail.com`
    // clears @IsEmail) folds to an empty string, which is not a mailbox any
    // account can own. Comparing it would be a scan that can only ever match
    // junk, so refuse the fold and let the exact match above stand alone.
    if (!canonicalLocal) return null;

    const [alias] = await this.prisma.$queryRaw<
      { id: string; email: string; isBlocked: boolean }[]
    >`
      SELECT id, email, "isBlocked"
      FROM "User"
      WHERE email IS NOT NULL
        AND regexp_replace(lower(email), '^.*@', '')
            IN ('gmail.com', 'googlemail.com')
        AND replace(
              split_part(regexp_replace(lower(email), '@[^@]*$', ''), '+', 1),
              '.', ''
            ) = ${canonicalLocal}
      LIMIT 1
    `;
    return alias ?? null;
  }

  /**
   * Request OTP verification code for Signup, 2FA, or Password Reset.
   * Validates user existence / uniqueness BEFORE sending email.
   */
  async sendOtp(email: string, purpose: 'signup' | 'login' | 'forgot_password' = 'signup') {
    const cleanEmail = email.trim().toLowerCase();

    if (purpose === 'signup') {
      // Mailbox-level, not string-level: a Gmail dot or +tag variant of a
      // registered address reaches an inbox that already has an account, and
      // sending it a code is the first half of opening a duplicate on it.
      const existing = await this.findAccountForMailbox(cleanEmail);
      if (existing) {
        throw new BadRequestException(
          existing.email === cleanEmail
            ? 'That email address is already registered. Please sign in instead.'
            : `That mailbox is already registered as ${existing.email}. Please sign in with that address instead.`,
        );
      }
    } else if (purpose === 'login' || purpose === 'forgot_password') {
      const user = await this.prisma.user.findUnique({ where: { email: cleanEmail } });
      if (!user) {
        throw new BadRequestException('No account found with this email address. Please check your email or register.');
      }
      if (user.isBlocked) {
        throw new ForbiddenException('Account is blocked.');
      }
    }

    return this.emailService.sendOtpEmail(
      cleanEmail,
      purpose === 'forgot_password' ? 'forgot_password' : purpose === 'login' ? 'login_2fa' : 'signup',
    );
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

    const isValid = await this.emailService.verifyOtp(
      email,
      dto.otp,
      'forgot_password',
    );
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

    // Unconditional. This used to be `if (dto.otp)`, so a client that simply
    // omitted the field skipped verification entirely — the whole OTP step
    // was opt-in from the caller's side, and an account could be opened on
    // an address its owner had never seen. Both the web and mobile sign-up
    // flows already send the code they collected.
    const isValid = await this.emailService.verifyOtp(email, dto.otp, 'signup');
    if (!isValid) {
      throw new BadRequestException('Invalid or expired email verification code. Please request a new OTP.');
    }

    // Same mailbox-level check as `sendOtp`, repeated rather than trusted:
    // `register` is reachable on its own, and two aliases racing here would
    // both pass a check made only at OTP time.
    const existing = await this.findAccountForMailbox(email);
    if (existing) {
      throw new BadRequestException(
        existing.email === email
          ? 'That email is already registered.'
          : `That mailbox is already registered as ${existing.email}. Please sign in with that address instead.`,
      );
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

    // Login 2FA is a step the caller opts into: neither the web nor the
    // mobile sign-in screen requests a code today, so requiring one here
    // would lock out every existing account. When a code *is* presented it
    // has to be a real `login_2fa` code — but treat the plain
    // email + password path as the actual security boundary until a second
    // factor is enrolled per user rather than per request.
    if (dto.otp) {
      const isValid = await this.emailService.verifyOtp(
        email,
        dto.otp,
        'login_2fa',
      );
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
