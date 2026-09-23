import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BoostersService } from './boosters.service';
import { DEFAULT_POLICY } from './payment.rules';
import { COLLECTORS, DEFAULT_COLLECTOR } from './collectors';
import type { ObservedPayment } from './payment.rules';

const CAPPED = COLLECTORS.find((c) => c.dailyCapUsd != null)!;

const PLAN = {
  id: 'plan-1',
  priceUsd: 5,
  rateBonusMilli: 2000,
  durationDays: 30,
  active: true,
};

const PAYER = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x55d398326f99059fF775485246999027B3197955';
// Anchored to Date.now() rather than a fixed calendar date so the intent's
// expiresAt (NOW + 1h) never lands in the past as real time moves forward.
const NOW = new Date();

function makePurchase(over: Record<string, any> = {}) {
  return {
    id: 'purchase-1',
    userId: 'user-1',
    planId: PLAN.id,
    plan: PLAN,
    status: 'AWAITING_PAYMENT',
    tokenSymbol: 'USDT',
    expectedUnits: (5_000_000_000_000_000_000n).toString(),
    expectedAmount: '5.0',
    payToAddress: DEFAULT_COLLECTOR.walletAddress,
    collectorId: DEFAULT_COLLECTOR.id,
    fromAddress: PAYER,
    txHash: null,
    attemptedTxHash: null,
    failureReason: null,
    confirmedAt: null,
    createdAt: NOW,
    expiresAt: new Date(NOW.getTime() + 3_600_000),
    ...over,
  };
}

/** Builds a fake PrismaService with just the calls BoostersService makes. */
function fakePrisma(opts: {
  purchase: ReturnType<typeof makePurchase>;
  claimedByOtherId?: string | null;
}) {
  const update = jest.fn().mockResolvedValue({});
  const updateMany = jest.fn().mockResolvedValue({ count: 1 });
  const boosterCreate = jest.fn().mockResolvedValue({
    id: 'booster-1',
    expiresAt: new Date(NOW.getTime() + PLAN.durationDays * 86_400_000),
  });
  const ledgerCreate = jest.fn().mockResolvedValue({});

  const prisma: any = {
    boosterPlan: { findUniqueOrThrow: jest.fn().mockResolvedValue(PLAN) },
    boosterPurchase: {
      create: jest.fn().mockResolvedValue(opts.purchase),
      findUniqueOrThrow: jest.fn().mockResolvedValue(opts.purchase),
      findUnique: jest.fn().mockResolvedValue(
        opts.claimedByOtherId
          ? { id: opts.claimedByOtherId }
          : opts.claimedByOtherId === null
            ? null
            : null,
      ),
      update,
    },
    $transaction: jest.fn(async (fn: any) => {
      const tx = {
        boosterPurchase: { updateMany },
        booster: { create: boosterCreate },
        ledgerEntry: { create: ledgerCreate },
      };
      return fn(tx);
    }),
  };
  return { prisma, update, updateMany, boosterCreate, ledgerCreate };
}

function fakeChain(observed: ObservedPayment | null, payToAddress = DEFAULT_COLLECTOR.walletAddress) {
  return {
    config: {
      enabled: true,
      tokenSymbol: 'USDT',
      tokenAddress: TOKEN,
      decimals: 18,
      unitsPerUsd: 1,
      payToAddress,
    },
    expectedUnits: (usd: number) => BigInt(usd) * 1_000_000_000_000_000_000n,
    humanAmount: (units: bigint) => (units / 1_000_000_000_000_000_000n).toString() + '.0',
    observe: jest.fn().mockResolvedValue(observed),
  } as any;
}

function observedPayment(over: Partial<ObservedPayment> = {}): ObservedPayment {
  return {
    from: PAYER,
    to: DEFAULT_COLLECTOR.walletAddress,
    units: 5_000_000_000_000_000_000n,
    tokenAddress: TOKEN,
    confirmations: DEFAULT_POLICY.minConfirmations,
    minedAt: new Date(NOW.getTime() + 60_000),
    succeeded: true,
    ...over,
  };
}

describe('BoostersService.createIntent — collector routing', () => {
  it('pins the collector-picked wallet onto the purchase', async () => {
    const purchase = makePurchase();
    const { prisma } = fakePrisma({ purchase });
    const chain = fakeChain(null);
    const collectors = { pickCollector: jest.fn().mockResolvedValue(CAPPED) } as any;

    const service = new BoostersService(prisma, chain, collectors, new ConfigService());
    await service.createIntent('user-1', PLAN.id, PAYER);

    expect(collectors.pickCollector).toHaveBeenCalledWith(PLAN.priceUsd);
    expect(prisma.boosterPurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          payToAddress: CAPPED.walletAddress,
          collectorId: CAPPED.id,
        }),
      }),
    );
  });
});

describe('BoostersService.submitPayment', () => {
  function service(purchase: ReturnType<typeof makePurchase>, observed: ObservedPayment | null, claimedByOtherId?: string | null) {
    const fp = fakePrisma({ purchase, claimedByOtherId });
    const chain = fakeChain(observed, purchase.payToAddress);
    const collectors = { pickCollector: jest.fn() } as any;
    return {
      svc: new BoostersService(fp.prisma, chain, collectors, new ConfigService()),
      ...fp,
      chain,
    };
  }

  it('activates the booster on a valid, confirmed payment', async () => {
    const purchase = makePurchase();
    const { svc, updateMany, boosterCreate, ledgerCreate } = service(
      purchase,
      observedPayment(),
    );

    const result = await svc.submitPayment('user-1', purchase.id, '0xTXHASH');

    expect(result.activated).toBe(true);
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'CONFIRMED', txHash: '0xTXHASH' }),
      }),
    );
    expect(boosterCreate).toHaveBeenCalled();
    expect(ledgerCreate).toHaveBeenCalled();
  });

  it('rejects an underpaid transaction and marks the purchase FAILED', async () => {
    const purchase = makePurchase();
    const { svc, update, boosterCreate } = service(
      purchase,
      observedPayment({ units: 1_000_000_000_000_000_000n }), // 1 USDT < 5 USDT
    );

    await expect(
      svc.submitPayment('user-1', purchase.id, '0xTXHASH'),
    ).rejects.toThrow(BadRequestException);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'FAILED' }),
      }),
    );
    expect(boosterCreate).not.toHaveBeenCalled();
  });

  it('rejects a transaction hash already claimed by another purchase', async () => {
    const purchase = makePurchase();
    const { svc, chain, boosterCreate } = service(
      purchase,
      observedPayment(),
      'some-other-purchase-id',
    );

    await expect(
      svc.submitPayment('user-1', purchase.id, '0xTXHASH'),
    ).rejects.toThrow('already been used for another purchase');

    // Never even reached the chain for a hash that's already spent elsewhere.
    expect(chain.observe).not.toHaveBeenCalled();
    expect(boosterCreate).not.toHaveBeenCalled();
  });

  it('refuses to pay out twice for a purchase that is already CONFIRMED', async () => {
    const purchase = makePurchase({ status: 'CONFIRMED' });
    const { svc } = service(purchase, observedPayment());

    await expect(
      svc.submitPayment('user-1', purchase.id, '0xTXHASH'),
    ).rejects.toThrow('already paid');
  });

  it('verifies against the purchase\'s own collector wallet, not the default config address', async () => {
    const purchase = makePurchase({
      payToAddress: CAPPED.walletAddress,
      collectorId: CAPPED.id,
    });
    const { svc, chain } = service(
      purchase,
      observedPayment({ to: CAPPED.walletAddress }),
    );

    const result = await svc.submitPayment('user-1', purchase.id, '0xTXHASH');

    expect(chain.observe).toHaveBeenCalledWith('0xTXHASH', CAPPED.walletAddress);
    expect(result.activated).toBe(true);
  });
});
