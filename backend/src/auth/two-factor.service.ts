import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { EmailService } from '../email/email.service';
import { SecurityEventsService } from '../security/security-events.service';
import type { RequestContext } from '../security/request-context';
import { keyringFromEnv, openSecret, sealSecret, type SecretKeyring } from '../common/secret-box';
import { generateTotpSecret, matchTotp, otpauthUrl, TOTP_ISSUER } from './totp';
import { verifyPassword } from './password';

/** Wrong codes in a row before the check locks. */
export const TOTP_MAX_FAILURES = 5;
/** How long it stays locked. Long enough to make guessing hopeless, short enough to wait out. */
export const TOTP_LOCK_MS = 15 * 60_000;

export interface TotpSetup {
  /** Base32 key, for typing into the app by hand. */
  secret: string;
  /** `otpauth://` link — rendered as a QR code, or opened directly on a phone. */
  otpauthUrl: string;
  issuer: string;
  account: string;
}

/** Error bodies carry a `code` so the clients can tell these cases apart. */
function codeError(status: HttpStatus, code: string, message: string): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

/**
 * Authenticator-app two-factor authentication ("Google 2FA").
 *
 * Once a miner turns it on, signing in and withdrawing both need the current
 * code from their phone, on every platform — the email code those flows used
 * to rely on was asked for only when the client said it was the website, so a
 * caller that simply left `platform` out got past it with the password alone.
 *
 * Every state change here bumps the account's session version, which signs
 * out every other session: turning 2FA on is what an owner does after a scare,
 * and a session an attacker already holds must not survive it.
 */
@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly ring: SecretKeyring;

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly events: SecurityEventsService,
  ) {
    this.ring = keyringFromEnv('totp');
    if (this.ring.sealWith.id !== 'k1') {
      this.logger.warn(
        'TOTP_ENCRYPTION_KEY is not set — authenticator secrets are encrypted with a key derived from JWT_SECRET, so rotating JWT_SECRET would disable every authenticator enrolled until then. Set TOTP_ENCRYPTION_KEY (openssl rand -hex 32).',
      );
    }
  }

  /**
   * Start, or restart, setup: a fresh secret the user has not confirmed yet.
   * Nothing is enforced until `enable` proves the app produces matching codes.
   */
  async beginSetup(userId: string): Promise<TotpSetup> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) {
      throw new ConflictException(
        'Two-factor authentication is already on. Turn it off first to move it to a new phone.',
      );
    }

    const secret = generateTotpSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpSecret: sealSecret(secret, this.ring),
        totpLastStep: null,
        totpFailedCount: 0,
        totpLockedUntil: null,
      },
    });

    const account = user.email ?? userId;
    return { secret, otpauthUrl: otpauthUrl(secret, account), issuer: TOTP_ISSUER, account };
  }

  /**
   * Turn it on. Needs the password as well as a code: a stolen session alone
   * must not be able to put the account behind an attacker's phone.
   * Returns the new session version so the caller can re-issue its token.
   */
  async enable(userId: string, code: string, password: string, ctx: RequestContext): Promise<number> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, passwordHash: true, totpSecret: true, totpEnabledAt: true },
    });
    if (user.totpEnabledAt) {
      throw new ConflictException('Two-factor authentication is already on.');
    }
    if (!user.totpSecret) {
      throw new BadRequestException('Start the setup again — there is no authenticator waiting to be confirmed.');
    }
    await this.assertPassword(password, user.passwordHash);
    const step = await this.checkCode(
      userId,
      user.totpSecret,
      code,
      { lastStep: null, claim: false },
      ctx,
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        totpEnabledAt: new Date(),
        totpLastStep: step,
        totpFailedCount: 0,
        totpLockedUntil: null,
        sessionVersion: { increment: 1 },
      },
      select: { sessionVersion: true },
    });

    await this.events.record(userId, 'TOTP_ENABLED', ctx);
    if (user.email) {
      void this.email.sendSecurityNotice(user.email, {
        subject: 'Two-factor authentication is on for your BONDKOIN account',
        title: 'Two-factor authentication turned on',
        lead: 'Signing in and withdrawing now need the 6-digit code from your authenticator app. Other devices signed in to your account have been signed out.',
        rows: noticeRows(ctx),
      });
    }
    return updated.sessionVersion;
  }

  /** Turn it off, with the password and a current code. Returns the new session version. */
  async disable(userId: string, code: string, password: string, ctx: RequestContext): Promise<number> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        passwordHash: true,
        totpSecret: true,
        totpEnabledAt: true,
        totpLastStep: true,
      },
    });
    if (!user.totpEnabledAt || !user.totpSecret) {
      throw new BadRequestException('Two-factor authentication is not on.');
    }
    await this.assertPassword(password, user.passwordHash);
    await this.checkCode(
      userId,
      user.totpSecret,
      code,
      { lastStep: user.totpLastStep, claim: true },
      ctx,
    );

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { ...CLEARED, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });

    await this.events.record(userId, 'TOTP_DISABLED', ctx);
    if (user.email) {
      void this.email.sendSecurityNotice(user.email, {
        subject: 'Two-factor authentication was turned off on your BONDKOIN account',
        title: 'Two-factor authentication turned off',
        lead: 'Your account no longer asks for an authenticator code. Other devices signed in to your account have been signed out.',
        rows: noticeRows(ctx),
      });
    }
    return updated.sessionVersion;
  }

  /**
   * Operator reset, for a miner who lost their phone. Signs them out
   * everywhere and tells them by email — a reset nobody asked for is the
   * first thing an owner needs to hear about.
   */
  async adminReset(userId: string, adminEmail: string): Promise<{ reset: boolean; emailed: boolean }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true, totpSecret: true },
    });
    const wasOn = !!user.totpEnabledAt || !!user.totpSecret;

    await this.prisma.user.update({
      where: { id: userId },
      data: { ...CLEARED, sessionVersion: { increment: 1 } },
    });
    await this.events.record(userId, 'TOTP_RESET_BY_ADMIN', {}, { admin: adminEmail, wasOn });

    let emailed = false;
    if (user.email && wasOn) {
      emailed = await this.email.sendSecurityNotice(user.email, {
        subject: 'Two-factor authentication was reset on your BONDKOIN account',
        title: 'Two-factor authentication reset',
        lead: 'Our support team removed the authenticator app from your account, as requested. You have been signed out everywhere — sign in with your email and password, then set two-factor authentication up again from your profile.',
      });
    }
    return { reset: wasOn, emailed };
  }

  /**
   * Verify a code for an account that has 2FA on — the sign-in and
   * withdrawal check. Throws TOTP_INVALID (400) or TOTP_LOCKED (429); the
   * caller decides what a *missing* code means for its flow.
   */
  async assertCode(userId: string, code: string, ctx: RequestContext): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpSecret: true, totpEnabledAt: true, totpLastStep: true },
    });
    if (!user.totpEnabledAt || !user.totpSecret) {
      // Callers only ask for accounts with 2FA on; reaching here means it was
      // switched off between their read and this one. Not a pass.
      throw codeError(HttpStatus.BAD_REQUEST, 'TOTP_INVALID', 'Two-factor authentication is not on for this account.');
    }
    await this.checkCode(
      userId,
      user.totpSecret,
      code,
      { lastStep: user.totpLastStep, claim: true },
      ctx,
    );
  }

  /**
   * The shared check: lockout, decryption, the code itself, and replay.
   * Returns the step the code matched.
   *
   * `claim` is set for an account whose 2FA is already on: the accepted step
   * is then recorded with a conditional update, so two requests racing with
   * the same code cannot both pass. Setup leaves it unset — `enable` writes
   * the step itself, in the same update that turns 2FA on.
   */
  private async checkCode(
    userId: string,
    sealed: string,
    code: string,
    replay: { lastStep: number | null; claim: boolean },
    ctx: RequestContext,
  ): Promise<number> {
    const { totpLockedUntil } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { totpLockedUntil: true },
    });
    if (totpLockedUntil && totpLockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((totpLockedUntil.getTime() - Date.now()) / 60_000);
      throw codeError(
        HttpStatus.TOO_MANY_REQUESTS,
        'TOTP_LOCKED',
        `Too many incorrect authenticator codes. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      );
    }

    let secret: string;
    try {
      secret = openSecret(sealed, this.ring);
    } catch (err) {
      this.logger.error(
        `[TOTP SECRET UNREADABLE] user=${userId}: ${err instanceof Error ? err.message : err} — was JWT_SECRET or TOTP_ENCRYPTION_KEY changed?`,
      );
      throw codeError(
        HttpStatus.BAD_REQUEST,
        'TOTP_UNAVAILABLE',
        'Your authenticator code cannot be checked right now. Contact support to reset two-factor authentication.',
      );
    }

    const step = matchTotp(secret, code ?? '');
    if (step === null) {
      await this.registerFailure(userId, ctx);
      throw codeError(
        HttpStatus.BAD_REQUEST,
        'TOTP_INVALID',
        'That authenticator code is not right. Check the time on your phone is set automatically, and enter the code currently shown.',
      );
    }

    const { lastStep } = replay;
    if (lastStep !== null && step <= lastStep) {
      // Not counted as a failure: this is almost always the owner pressing
      // submit twice, or signing in and withdrawing inside the same 30s.
      throw codeError(
        HttpStatus.BAD_REQUEST,
        'TOTP_INVALID',
        'That code has already been used. Wait for the next code in your authenticator app.',
      );
    }

    if (replay.claim) {
      const claimed = await this.prisma.user.updateMany({
        where: { id: userId, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
        data: { totpLastStep: step, totpFailedCount: 0 },
      });
      if (claimed.count === 0) {
        throw codeError(
          HttpStatus.BAD_REQUEST,
          'TOTP_INVALID',
          'That code has already been used. Wait for the next code in your authenticator app.',
        );
      }
    }
    return step;
  }

  private async registerFailure(userId: string, ctx: RequestContext): Promise<void> {
    const { totpFailedCount } = await this.prisma.user.update({
      where: { id: userId },
      data: { totpFailedCount: { increment: 1 } },
      select: { totpFailedCount: true },
    });
    await this.events.record(userId, 'TOTP_FAILED', ctx, { failures: totpFailedCount });
    if (totpFailedCount >= TOTP_MAX_FAILURES) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { totpFailedCount: 0, totpLockedUntil: new Date(Date.now() + TOTP_LOCK_MS) },
      });
      await this.events.record(userId, 'TOTP_LOCKED', ctx, { minutes: TOTP_LOCK_MS / 60_000 });
      this.logger.warn(`[TOTP LOCKED] user=${userId} after ${totpFailedCount} wrong codes`);
    }
  }

  /** 400, not 401: the mobile client signs out on a 401 from a signed-in call. */
  private async assertPassword(password: string, hash: string | null): Promise<void> {
    if (!(await verifyPassword(password ?? '', hash))) {
      throw new BadRequestException('Incorrect password.');
    }
  }
}

const CLEARED = {
  totpSecret: null,
  totpEnabledAt: null,
  totpLastStep: null,
  totpFailedCount: 0,
  totpLockedUntil: null,
} as const;

function noticeRows(ctx: RequestContext): [string, string][] {
  const rows: [string, string][] = [
    ['When', new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
  ];
  if (ctx.ip) rows.push(['IP address', ctx.ip]);
  if (ctx.userAgent) rows.push(['Device', ctx.userAgent]);
  return rows;
}
