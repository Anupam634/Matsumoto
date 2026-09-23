import { FinanceService } from './finance.service';
import { COLLECTORS, DEFAULT_COLLECTOR } from '../../boosters/collectors';

const CAPPED = COLLECTORS.find((c) => c.dailyCapUsd != null)!;

describe('FinanceService.listPayments', () => {
  it('reads across every collector, unlike the general admin purchase list', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { boosterPurchase: { findMany } } as any;
    const collectors = { dailyStatus: jest.fn() } as any;

    const service = new FinanceService(prisma, collectors);
    await service.listPayments({});

    const where = findMany.mock.calls[0][0].where;
    // No collectorId key at all when none is requested — every collector's
    // rows are eligible, unlike AdminService.listBoosterPurchases which
    // always pins collectorId: 'default'.
    expect(where.collectorId).toBeUndefined();
  });

  it('can be scoped to one collector on request', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { boosterPurchase: { findMany } } as any;
    const collectors = {} as any;

    const service = new FinanceService(prisma, collectors);
    await service.listPayments({ collectorId: CAPPED.id });

    expect(findMany.mock.calls[0][0].where.collectorId).toBe(CAPPED.id);
  });

  it('exposes the receiving wallet and collector label on each row', async () => {
    const row = {
      id: 'p1',
      userId: 'u1',
      planId: 'plan-1',
      priceUsd: 5,
      tokenSymbol: 'USDT',
      expectedAmount: '5.0',
      payToAddress: CAPPED.walletAddress,
      fromAddress: '0xabc',
      collectorId: CAPPED.id,
      network: 'BSC',
      status: 'CONFIRMED',
      txHash: '0xtx',
      attemptedTxHash: null,
      failureReason: null,
      confirmedAt: new Date('2026-06-01T00:00:00Z'),
      createdAt: new Date('2026-06-01T00:00:00Z'),
      user: { email: 'buyer@x.com' },
      plan: { priceUsd: 5 },
    };
    const findMany = jest.fn().mockResolvedValue([row]);
    const prisma = { boosterPurchase: { findMany } } as any;
    const service = new FinanceService(prisma, {} as any);

    const [dto] = await service.listPayments({});
    expect(dto).toMatchObject({
      receivingWallet: CAPPED.walletAddress,
      collectorId: CAPPED.id,
      collectorLabel: CAPPED.label,
      txHash: '0xtx',
      amountUsd: 5,
    });
  });
});

describe('FinanceService.collectorStatus', () => {
  it('delegates to CollectorService.dailyStatus', async () => {
    const dailyStatus = jest.fn().mockResolvedValue([{ id: DEFAULT_COLLECTOR.id }]);
    const service = new FinanceService({} as any, { dailyStatus } as any);
    const result = await service.collectorStatus();
    expect(dailyStatus).toHaveBeenCalled();
    expect(result).toEqual([{ id: DEFAULT_COLLECTOR.id }]);
  });
});
