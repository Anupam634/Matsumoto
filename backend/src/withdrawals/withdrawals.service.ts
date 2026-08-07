import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { pointsToToken } from '../mining/mining.engine';

const MIN_WITHDRAWAL_MILLI = 100 * 1000; // 100 points (SPEC §4)
const COOLDOWN_MS = 7 * 24 * 3_600_000; // 1 per week

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly wallet: WalletService,
  ) {}

  async request(userId: string, toAddress: string, pointsMilli: number) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { kyc: true },
    });

    if (user.kyc?.status !== 'APPROVED') {
      throw new BadRequestException('KYC must be approved before withdrawal.');
    }
    if (pointsMilli < MIN_WITHDRAWAL_MILLI) {
      throw new BadRequestException('Minimum withdrawal is 100 points.');
    }
    if (user.pointsBalance < BigInt(pointsMilli)) {
      throw new BadRequestException('Insufficient balance.');
    }

    const lastWeek = new Date(Date.now() - COOLDOWN_MS);
    const recent = await this.prisma.withdrawal.count({
      where: { userId, requestedAt: { gte: lastWeek } },
    });
    if (recent > 0) {
      throw new BadRequestException('Only 1 withdrawal request per week.');
    }

    const tokenAmount = pointsToToken(pointsMilli).toString();

    // Debit (escrow) + create pending request atomically.
    const [, withdrawal] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { decrement: BigInt(pointsMilli) } },
      }),
      this.prisma.withdrawal.create({
        data: {
          userId,
          pointsAmount: BigInt(pointsMilli),
          tokenAmount,
          toAddress,
          status: 'PENDING',
        },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'WITHDRAWAL',
          deltaMilli: BigInt(-pointsMilli),
          meta: { toAddress, tokenAmount },
        },
      }),
    ]);
    return toDto(withdrawal);
  }

  /** Admin approves -> execute on-chain payout via the swappable wallet. */
  async approve(withdrawalId: string, adminNote?: string) {
    const w = await this.prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawalId },
    });
    if (w.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${w.status}.`);
    }
    const { txHash } = await this.wallet.payout(w.toAddress, w.tokenAmount);
    const paid = await this.prisma.withdrawal.update({
      where: { id: withdrawalId },
      data: { status: 'PAID', txHash, adminNote, resolvedAt: new Date() },
    });
    return toDto(paid);
  }

  /** Admin rejects -> refund escrowed points. */
  async reject(withdrawalId: string, adminNote: string) {
    const w = await this.prisma.withdrawal.findUniqueOrThrow({
      where: { id: withdrawalId },
    });
    if (w.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${w.status}.`);
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: w.userId },
        data: { pointsBalance: { increment: w.pointsAmount } },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId: w.userId,
          reason: 'WITHDRAWAL',
          deltaMilli: w.pointsAmount, // positive = refund
          meta: { refundOf: withdrawalId },
        },
      }),
      this.prisma.withdrawal.update({
        where: { id: withdrawalId },
        data: { status: 'REJECTED', adminNote, resolvedAt: new Date() },
      }),
    ]);
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
