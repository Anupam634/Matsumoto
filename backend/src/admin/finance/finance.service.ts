import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { CollectorService } from '../../boosters/collector.service';
import { collectorById } from '../../boosters/collectors';

/**
 * Crypto-payment finance module — the one place every booster purchase is
 * readable regardless of which collector wallet it paid, including
 * transaction hashes and wallet addresses. Gated entirely by
 * `CRYPTO_PAYMENT_VIEW` in FinanceController; this service itself applies
 * no filtering, unlike AdminService's booster-purchase reads which stay
 * scoped to the default collector for non-finance admins.
 */
@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly collectors: CollectorService,
  ) {}

  private toDetail(p: {
    id: string;
    userId: string;
    planId: string;
    priceUsd: number | null;
    tokenSymbol: string;
    expectedAmount: string;
    payToAddress: string;
    fromAddress: string;
    collectorId: string;
    network: string;
    status: string;
    txHash: string | null;
    attemptedTxHash: string | null;
    failureReason: string | null;
    confirmedAt: Date | null;
    createdAt: Date;
    user?: { email: string | null } | null;
    plan?: { priceUsd: number } | null;
  }) {
    const collector = collectorById(p.collectorId);
    return {
      id: p.id,
      userId: p.userId,
      userEmail: p.user?.email ?? 'Wallet payer',
      planId: p.planId,
      amountUsd: p.priceUsd ?? p.plan?.priceUsd ?? 0,
      tokenSymbol: p.tokenSymbol,
      expectedAmount: p.expectedAmount,
      txHash: p.txHash,
      attemptedTxHash: p.attemptedTxHash,
      receivingWallet: p.payToAddress,
      collectorId: p.collectorId,
      collectorLabel: collector?.label ?? p.collectorId,
      network: p.network,
      status: p.status,
      failureReason: p.failureReason,
      confirmedAt: p.confirmedAt ? p.confirmedAt.toISOString() : null,
      createdAt: p.createdAt.toISOString(),
    };
  }

  async listPayments(query?: {
    status?: string;
    collectorId?: string;
    search?: string;
  }) {
    const where: any = {};
    if (query?.status && query.status !== 'ALL') where.status = query.status;
    if (query?.collectorId && query.collectorId !== 'ALL') {
      where.collectorId = query.collectorId;
    }
    if (query?.search && query.search.trim().length > 0) {
      const s = query.search.trim().toLowerCase();
      where.OR = [
        { user: { email: { contains: s, mode: 'insensitive' } } },
        { txHash: { contains: s, mode: 'insensitive' } },
        { fromAddress: { contains: s, mode: 'insensitive' } },
        { payToAddress: { contains: s, mode: 'insensitive' } },
      ];
    }

    const purchases = await this.prisma.boosterPurchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: { user: { select: { email: true } }, plan: true },
    });
    return purchases.map((p) => this.toDetail(p));
  }

  async paymentDetail(id: string) {
    const purchase = await this.prisma.boosterPurchase.findUnique({
      where: { id },
      include: { user: { select: { email: true } }, plan: true },
    });
    if (!purchase) throw new NotFoundException('Payment not found.');
    return this.toDetail(purchase);
  }

  /** Every collector's today-so-far total, cap and remaining headroom. */
  collectorStatus() {
    return this.collectors.dailyStatus();
  }
}
