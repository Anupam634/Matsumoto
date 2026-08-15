import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { PrismaService } from '../prisma.service';
import { ChainReaderService } from './chain-reader.service';
import { verifyPayment, DEFAULT_POLICY, type Policy } from './payment.rules';

/** How long a quoted purchase stays payable before it must be re-quoted. */
const INTENT_TTL_MS = 60 * 60_000;

@Injectable()
export class BoostersService {
  private readonly logger = new Logger(BoostersService.name);
  private readonly policy: Policy;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chain: ChainReaderService,
    cfg: ConfigService,
  ) {
    this.policy = {
      ...DEFAULT_POLICY,
      minConfirmations: Number(
        cfg.get('BOOSTER_MIN_CONFIRMATIONS') ?? DEFAULT_POLICY.minConfirmations,
      ),
    };
  }

  /** Catalogue + this user's active boosters and open purchases. */
  async overview(userId: string) {
    const now = new Date();
    const [plans, boosters, purchases] = await Promise.all([
      this.prisma.boosterPlan.findMany({
        where: { active: true },
        orderBy: { priceUsd: 'asc' },
      }),
      this.prisma.booster.findMany({
        where: { userId, expiresAt: { gt: now } },
        include: { plan: true },
        orderBy: { expiresAt: 'asc' },
      }),
      this.prisma.boosterPurchase.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      payment: {
        enabled: this.chain.config.enabled,
        disabledReason: this.chain.config.disabledReason,
        tokenSymbol: this.chain.config.tokenSymbol,
        payToAddress: this.chain.config.enabled
          ? this.chain.config.payToAddress
          : null,
        minConfirmations: this.policy.minConfirmations,
      },
      plans: plans.map((p) => ({
        id: p.id,
        priceUsd: p.priceUsd,
        rateBonusPerHour: p.rateBonusMilli / 1000,
        durationDays: p.durationDays,
        // What the hourly rate becomes with this one booster at ×1 referral
        // multiplier — the same figure the landing page advertises.
        resultingRatePerHour: (900 + p.rateBonusMilli) / 1000,
      })),
      activeBoosters: boosters.map((b) => ({
        id: b.id,
        priceUsd: b.plan.priceUsd,
        rateBonusPerHour: b.plan.rateBonusMilli / 1000,
        startedAt: b.startedAt,
        expiresAt: b.expiresAt,
      })),
      purchases: purchases.map((p) => this.toDto(p)),
    };
  }

  private toDto(p: {
    id: string;
    status: string;
    tokenSymbol: string;
    expectedAmount: string;
    payToAddress: string;
    fromAddress: string;
    txHash: string | null;
    failureReason: string | null;
    createdAt: Date;
    expiresAt: Date;
  }) {
    return {
      id: p.id,
      status: p.status,
      tokenSymbol: p.tokenSymbol,
      amount: p.expectedAmount,
      payToAddress: p.payToAddress,
      fromAddress: p.fromAddress,
      txHash: p.txHash,
      failureReason: p.failureReason,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
    };
  }

  /**
   * Quote a purchase: pins the price, recipient and payer wallet so the
   * later verification has fixed values to check against.
   */
  async createIntent(userId: string, planId: string, fromAddress: string) {
    if (!this.chain.config.enabled) {
      throw new ServiceUnavailableException(
        `Booster payments are not configured. ${this.chain.config.disabledReason}`,
      );
    }
    if (!ethers.isAddress(fromAddress)) {
      throw new BadRequestException('That is not a valid BNB Chain address.');
    }

    const plan = await this.prisma.boosterPlan.findUniqueOrThrow({
      where: { id: planId },
    });
    if (!plan.active) {
      throw new BadRequestException('That plan is no longer available.');
    }

    const units = this.chain.expectedUnits(plan.priceUsd);
    const purchase = await this.prisma.boosterPurchase.create({
      data: {
        userId,
        planId,
        tokenSymbol: this.chain.config.tokenSymbol,
        expectedUnits: units.toString(),
        expectedAmount: this.chain.humanAmount(units),
        payToAddress: this.chain.config.payToAddress,
        fromAddress: ethers.getAddress(fromAddress),
        expiresAt: new Date(Date.now() + INTENT_TTL_MS),
      },
    });
    return this.toDto(purchase);
  }

  /**
   * Verify a submitted transaction and, if it checks out, activate the
   * booster. No admin step: acceptance is decided entirely by what the chain
   * reports against the values pinned at quote time.
   */
  async submitPayment(userId: string, purchaseId: string, txHash: string) {
    const purchase = await this.prisma.boosterPurchase.findUniqueOrThrow({
      where: { id: purchaseId },
      include: { plan: true },
    });
    if (purchase.userId !== userId) {
      throw new BadRequestException('That purchase belongs to another account.');
    }
    if (purchase.status === 'CONFIRMED') {
      throw new BadRequestException('This purchase is already paid.');
    }
    if (purchase.expiresAt < new Date()) {
      await this.prisma.boosterPurchase.update({
        where: { id: purchaseId },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException(
        'This quote expired. Start the purchase again.',
      );
    }

    // Reject a hash already spent on another purchase before touching the
    // chain; the unique index is the real guarantee, this is the clear error.
    const claimed = await this.prisma.boosterPurchase.findUnique({
      where: { txHash },
    });
    if (claimed && claimed.id !== purchaseId) {
      throw new BadRequestException(
        'That transaction has already been used for another purchase.',
      );
    }

    const observed = await this.chain.observe(txHash);
    if (!observed) {
      throw new BadRequestException(
        'That transaction could not be found on chain yet. Wait a moment and try again.',
      );
    }

    const verdict = verifyPayment(
      {
        payToAddress: purchase.payToAddress,
        fromAddress: purchase.fromAddress,
        expectedUnits: BigInt(purchase.expectedUnits),
        tokenAddress: this.chain.config.tokenAddress,
        intentCreatedAt: purchase.createdAt,
      },
      observed,
      this.policy,
    );

    if (!verdict.ok) {
      // A pending confirmation isn't a failure — the user should retry.
      const retryable = verdict.reason === 'NOT_ENOUGH_CONFIRMATIONS';
      if (!retryable) {
        // Record the attempt, but never in the unique `txHash` column: a
        // rejected submission must not burn a real payment the user can
        // still legitimately redeem against a corrected purchase.
        await this.prisma.boosterPurchase.update({
          where: { id: purchaseId },
          data: {
            status: 'FAILED',
            failureReason: verdict.detail,
            attemptedTxHash: txHash,
          },
        });
      }
      throw new BadRequestException(verdict.detail);
    }

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + purchase.plan.durationDays * 24 * 3_600_000,
    );

    // Activate and mark paid together, so a booster can never exist without
    // its confirmed purchase (or vice versa).
    const [, booster] = await this.prisma.$transaction([
      this.prisma.boosterPurchase.update({
        where: { id: purchaseId },
        data: { status: 'CONFIRMED', txHash, confirmedAt: now },
      }),
      this.prisma.booster.create({
        data: {
          userId,
          planId: purchase.planId,
          startedAt: now,
          expiresAt,
          txHash,
          purchaseId,
        },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'BOOSTER_PURCHASE',
          // Boosters raise the mining rate; they do not move a point balance,
          // so this row is an audit trail rather than a balance change.
          deltaMilli: 0n,
          meta: {
            purchaseId,
            txHash,
            priceUsd: purchase.plan.priceUsd,
            rateBonusMilli: purchase.plan.rateBonusMilli,
          },
        },
      }),
    ]);

    this.logger.log(
      `booster activated: user=${userId} plan=$${purchase.plan.priceUsd} tx=${txHash}`,
    );
    return {
      activated: true,
      booster: {
        id: booster.id,
        rateBonusPerHour: purchase.plan.rateBonusMilli / 1000,
        expiresAt: booster.expiresAt,
      },
    };
  }
}
