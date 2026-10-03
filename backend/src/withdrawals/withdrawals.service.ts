import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { assertHuman, captchaApplies } from '../common/turnstile';
import { CAPTCHA_ACTIONS } from '../auth/auth.service';
import { WalletService } from '../wallet/wallet.service';
import { EmailService } from '../email/email.service';
import { TwoFactorService } from '../auth/two-factor.service';
import { SecuritySettingsService } from '../security/security-settings.service';
import { SecurityEventsService } from '../security/security-events.service';
import type { RequestContext } from '../security/request-context';
import { pointsToToken } from '../mining/mining.engine';
import { lockUserRow } from '../common/row-lock';

const MIN_WITHDRAWAL_MILLI = 100 * 1000; // 100 points (SPEC §4)
const COOLDOWN_MS = 7 * 24 * 3_600_000; // 1 per week

/** What confirmed a withdrawal request, stored on the row for the reviewer. */
export type WithdrawalSecondFactor = 'totp' | 'email' | 'none';

/** What the caller sent to confirm a request, and where it came from. */
export interface WithdrawalConfirmation extends RequestContext {
  /** Code from `POST /withdrawals/send-otp`. */
  otp?: string;
  /** Code from the account's authenticator app. */
  totp?: string;
}

/** Shape returned to clients — BigInt milli-points become decimal points. */
export interface WithdrawalDto {
  id: string;
  points: number;
  tokenAmount: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  adminNote: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}

function toDto(w: {
  id: string;
  pointsAmount: bigint;
  tokenAmount: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  adminNote: string | null;
  requestedAt: Date;
  resolvedAt: Date | null;
}): WithdrawalDto {
  return {
    id: w.id,
    points: Number(w.pointsAmount) / 1000,
    tokenAmount: w.tokenAmount,
    toAddress: w.toAddress,
    status: w.status,
    txHash: w.txHash,
    adminNote: w.adminNote,
    requestedAt: w.requestedAt,
    resolvedAt: w.resolvedAt,
  };
}

/**
 * Withdrawal lifecycle: request -> (admin) approve/reject -> on-chain payout.
 * Points are debited on request (escrow) and refunded on rejection, so a
 * pending withdrawal can't be double-spent by mining more.
 */
@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
    private readonly twoFactor: TwoFactorService,
    private readonly settings: SecuritySettingsService,
    private readonly events: SecurityEventsService,
  ) {}

  /**
   * Emergency off-switch for the emailed withdrawal code — same escape hatch
   * and same reasoning as AuthService.loginOtpEnforced. It does not touch the
   * authenticator-app check: an account with 2FA on always needs its code.
   */
  private withdrawalOtpEnforced(): boolean {
    return this.config.get<string>('WITHDRAWAL_OTP_ENFORCED') !== 'false';
  }

  /**
   * Mail a confirmation code to the caller's own address for the step-up
   * check in `request`. Keyed off the authenticated user, not a body-supplied
   * email, so a caller can only ever trigger a code for their own account.
   *
   * Mail-delivery failures are turned into a plain 503 rather than letting
   * EmailService's own exception (mapped to a raw 502) reach the client
   * looking like the API itself is down.
   */
  async sendWithdrawalOtp(
    userId: string,
    ctx: { captchaToken?: string; platform?: 'web' | 'mobile'; ip?: string } = {},
  ) {
    // This is the step that spends an email, so it is the one worth gating.
    // The confirm that follows carries the mailed code, which no script has.
    if (captchaApplies(ctx.platform)) {
      await assertHuman(ctx.captchaToken, {
        ip: ctx.ip,
        action: CAPTCHA_ACTIONS.withdrawal,
      });
    }

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true },
    });
    if (!user.email) {
      throw new BadRequestException('This account has no email on file to send a code to.');
    }
    try {
      return await this.emailService.sendOtpEmail(user.email, 'withdrawal');
    } catch (err) {
      if (err instanceof HttpException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        throw err;
      }
      this.logger.error(
        `[WITHDRAWAL OTP SEND FAILED] user=${userId}: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Could not send your confirmation code right now. Please try again in a moment.',
      );
    }
  }

  /**
   * Check the second factor for a withdrawal, and say which one it was.
   *
   * Runs before the escrow transaction, not inside it: a wrong authenticator
   * code has to count towards the lockout, and a failure counter incremented
   * inside a transaction that then throws is rolled back with it.
   *
   * Applies to every platform. It used to be required only when the client
   * sent `platform: 'web'`, so a request that left the field out moved funds
   * with nothing but a bearer token.
   */
  private async confirmSecondFactor(
    userId: string,
    confirmation: WithdrawalConfirmation,
  ): Promise<WithdrawalSecondFactor> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { email: true, totpEnabledAt: true },
    });

    if (user.totpEnabledAt) {
      if (!confirmation.totp) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'TOTP_REQUIRED',
          message: 'Enter the 6-digit code from your authenticator app to confirm this withdrawal.',
        });
      }
      await this.twoFactor.assertCode(userId, confirmation.totp, confirmation);
      return 'totp';
    }

    const { requireTotpForWithdrawal } = await this.settings.effective();
    if (requireTotpForWithdrawal) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'TOTP_SETUP_REQUIRED',
        message: 'Turn on two-factor authentication (Google Authenticator) in your profile before withdrawing.',
      });
    }

    if (!this.withdrawalOtpEnforced()) return 'none';

    if (!confirmation.otp) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'OTP_REQUIRED',
        message: 'Request a confirmation code (POST /withdrawals/send-otp) and include it to submit this withdrawal.',
      });
    }
    const validOtp = await this.emailService.verifyOtp(user.email ?? '', confirmation.otp, 'withdrawal');
    if (!validOtp) {
      throw new BadRequestException('Invalid or expired verification code. Please request a new OTP.');
    }
    return 'email';
  }

  /**
   * Escrow points and queue a payout for admin review.
   *
   * The eligibility checks and the debit run inside one transaction behind a
   * lock on the user's row. Read outside a transaction, as they were, five
   * concurrent requests on a 100-point balance all saw 100 points and all
   * passed both the balance check and the "one per week" check — leaving five
   * pending payouts and a balance of -400.
   */
  async request(
    userId: string,
    toAddress: string,
    pointsMilli: number,
    confirmation: WithdrawalConfirmation = {},
  ) {
    if (pointsMilli < MIN_WITHDRAWAL_MILLI) {
      throw new BadRequestException('Minimum withdrawal is 100 points.');
    }

    // Two requests racing with one emailed code both pass here (the store's
    // read and delete are not atomic); the one-per-week check inside the
    // transaction below is what lets only one of them through.
    const secondFactor = await this.confirmSecondFactor(userId, confirmation);

    const amount = BigInt(pointsMilli);
    const tokenAmount = pointsToToken(pointsMilli).toString();

    const withdrawal = await this.prisma.$transaction(async (tx) => {
      await lockUserRow(tx, userId);

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: { kyc: true },
      });

      if (user.kyc?.status !== 'APPROVED') {
        throw new BadRequestException('KYC must be approved before withdrawal.');
      }

      const lastWeek = new Date(Date.now() - COOLDOWN_MS);
      const recent = await tx.withdrawal.count({
        where: { userId, requestedAt: { gte: lastWeek } },
      });
      if (recent > 0) {
        throw new BadRequestException('Only 1 withdrawal request per week.');
      }

      // Conditional debit. The lock already serialises callers; the `gte`
      // guard is the belt to that braces — the balance can never be driven
      // below zero even if this is ever called without one.
      const debited = await tx.user.updateMany({
        where: { id: userId, pointsBalance: { gte: amount } },
        data: { pointsBalance: { decrement: amount } },
      });
      if (debited.count === 0) {
        throw new BadRequestException('Insufficient balance.');
      }

      const created = await tx.withdrawal.create({
        data: {
          userId,
          pointsAmount: amount,
          tokenAmount,
          toAddress,
          status: 'PENDING',
          requestIp: confirmation.ip ?? null,
          requestFingerprint: confirmation.fingerprint?.slice(0, 128) ?? null,
          requestPlatform: confirmation.platform ?? null,
          secondFactor,
        },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          reason: 'WITHDRAWAL',
          deltaMilli: -amount,
          meta: { toAddress, tokenAmount },
        },
      });
      return { created, email: user.email };
    });

    const { created, email } = withdrawal;
    await this.events.record(userId, 'WITHDRAWAL_REQUESTED', confirmation, {
      withdrawalId: created.id,
      points: pointsMilli / 1000,
      toAddress,
      secondFactor,
    });
    // The owner hears about it while it is still waiting for review, which
    // is the window in which a stolen-account withdrawal can still be stopped.
    if (email) {
      void this.emailService.sendSecurityNotice(email, {
        subject: 'Withdrawal requested from your BONDKOIN account',
        title: 'Withdrawal requested',
        lead: 'A withdrawal was requested from your BONDKOIN account. It is waiting for review by our team before anything is paid out.',
        rows: [
          ['Amount', `${(pointsMilli / 1000).toLocaleString('en-US')} points (${tokenAmount} $BONDKOIN)`],
          ['To address', toAddress],
          ['When', created.requestedAt.toISOString().replace('T', ' ').slice(0, 19) + ' UTC'],
          ...(confirmation.ip ? ([['IP address', confirmation.ip]] as [string, string][]) : []),
        ],
        warning:
          "If you didn't request this, reply to this email right away so we can stop it before it is approved, then reset your password and turn on two-factor authentication.",
      });
    }

    return toDto(created);
  }

  /**
   * Admin approves -> execute on-chain payout via the swappable wallet.
   *
   * The row is moved out of PENDING *before* the chain call, in a single
   * conditional update. Checking the status and then paying left a window
   * where two admins clicking approve at the same time — or one admin
   * double-clicking — both read PENDING and both sent real tokens.
   */
  async approve(withdrawalId: string, adminNote?: string) {
    const w = await this.prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawalId },
    });

    // Reserve it. Whoever wins this update owns the payout; everyone else
    // sees count 0 and stops here.
    const reserved = await this.prisma.withdrawal.updateMany({
      where: { id: withdrawalId, status: 'PENDING' },
      data: { status: 'APPROVED' },
    });
    if (reserved.count === 0) {
      const current = await this.prisma.withdrawal.findUniqueOrThrow({
        where: { id: withdrawalId },
        select: { status: true },
      });
      throw new BadRequestException(`Withdrawal is already ${current.status}.`);
    }

    let txHash: string;
    try {
      ({ txHash } = await this.wallet.payout(w.toAddress, w.tokenAmount));
    } catch (err) {
      // Nothing was sent, so hand the row back to the queue rather than
      // stranding it in APPROVED where no later attempt can pick it up.
      await this.prisma.withdrawal.updateMany({
        where: { id: withdrawalId, status: 'APPROVED' },
        data: { status: 'PENDING' },
      });
      throw err;
    }

    const paid = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'PAID', txHash, adminNote, resolvedAt: new Date() },
    });
    return toDto(paid);
  }

  /**
   * Admin rejects -> refund escrowed points.
   *
   * The status transition is the guard: if the conditional update inside the
   * transaction matches nothing, another call already resolved this row and
   * the refund must not be issued a second time.
   */
  async reject(withdrawalId: string, adminNote: string) {
    await this.prisma.$transaction(async (tx) => {
      const w = await tx.withdrawal.findUniqueOrThrow({
        where: { id: withdrawalId },
      });

      const resolved = await tx.withdrawal.updateMany({
        where: { id: withdrawalId, status: 'PENDING' },
        data: { status: 'REJECTED', adminNote, resolvedAt: new Date() },
      });
      if (resolved.count === 0) {
        throw new BadRequestException(`Withdrawal is already ${w.status}.`);
      }

      await tx.user.update({
        where: { id: w.userId },
        data: { pointsBalance: { increment: w.pointsAmount } },
      });
      await tx.ledgerEntry.create({
        data: {
          userId: w.userId,
          reason: 'WITHDRAWAL',
          deltaMilli: w.pointsAmount, // positive = refund
          meta: { refundOf: withdrawalId },
        },
      });
    });
    return { refunded: true };
  }

  /** The caller's own history, newest first. */
  async listForUser(userId: string): Promise<WithdrawalDto[]> {
    const rows = await this.prisma.withdrawal.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' },
    });
    return rows.map(toDto);
  }

  /** Admin approval queue, oldest first. */
  async listPending(): Promise<WithdrawalDto[]> {
    const rows = await this.prisma.withdrawal.findMany({
      where: { status: 'PENDING' },
      orderBy: { requestedAt: 'asc' },
    });
    return rows.map(toDto);
  }
}
