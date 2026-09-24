import { CollectorService } from './collector.service';

/**
 * The cap arithmetic is tested against a synthetic wallet list, so it stays
 * covered no matter what the live list in collectors.ts is set to — the
 * shareholder wallet is at 0 (switched off) today, and these tests should not
 * have to be rewritten the next time that number changes.
 */
jest.mock('./collectors', () => {
  const COLLECTORS = [
    { id: 'default', label: 'Primary treasury', walletAddress: '0xdefault', dailyCapUsd: null },
    { id: 'capped', label: 'Capped wallet', walletAddress: '0xcapped', dailyCapUsd: 20 },
    { id: 'off', label: 'Switched-off wallet', walletAddress: '0xoff', dailyCapUsd: 0 },
  ];
  return {
    COLLECTORS,
    DEFAULT_COLLECTOR: COLLECTORS[0],
    collectorById: (id: string) => COLLECTORS.find((c) => c.id === id),
    collectorByAddress: (a: string) =>
      COLLECTORS.find((c) => c.walletAddress.toLowerCase() === a.toLowerCase()),
  };
});

describe('CollectorService', () => {
  function serviceWithConfirmedTotal(collectorId: string, totalUsd: number) {
    const aggregate = jest.fn().mockImplementation(({ where }) =>
      Promise.resolve({
        _sum: { priceUsd: where.collectorId === collectorId ? totalUsd : 0 },
      }),
    );
    const prisma = { boosterPurchase: { aggregate } } as any;
    return { service: new CollectorService(prisma), aggregate };
  }

  it('routes to the capped collector while it has headroom for today', async () => {
    const { service } = serviceWithConfirmedTotal('capped', 0);
    expect((await service.pickCollector(5)).id).toBe('capped');
  });

  it('still routes to the capped collector right up to its daily cap', async () => {
    const { service } = serviceWithConfirmedTotal('capped', 15);
    expect((await service.pickCollector(5)).id).toBe('capped'); // exactly fills it
  });

  it('falls back to the treasury once the daily cap is reached', async () => {
    const { service } = serviceWithConfirmedTotal('capped', 20);
    expect((await service.pickCollector(1)).id).toBe('default');
  });

  it('falls back to the treasury when a purchase would push it over the cap', async () => {
    const { service } = serviceWithConfirmedTotal('capped', 15);
    expect((await service.pickCollector(10)).id).toBe('default');
  });

  it('never routes to a wallet capped at 0, and does not even query its total', async () => {
    // Cap 20 already spent, so the only other candidate is the 0-capped one.
    const { service, aggregate } = serviceWithConfirmedTotal('capped', 20);
    expect((await service.pickCollector(5)).id).toBe('default');
    const queried = aggregate.mock.calls.map((c) => c[0].where.collectorId);
    expect(queried).not.toContain('off');
  });

  it('keeps a 0-capped wallet out even for a zero-priced purchase', async () => {
    // Capped wallet over its cap, so the 0-capped one is the only candidate
    // left — and `0 + 0 <= 0` would otherwise route there.
    const { service } = serviceWithConfirmedTotal('capped', 25);
    expect((await service.pickCollector(0)).id).toBe('default');
  });

  it('only counts CONFIRMED purchases from today (UTC) toward the cap', async () => {
    const { service, aggregate } = serviceWithConfirmedTotal('capped', 0);
    await service.collectedTodayUsd('capped');
    const call = aggregate.mock.calls[0][0];
    expect(call.where.status).toBe('CONFIRMED');
    expect(call.where.confirmedAt.gte).toBeInstanceOf(Date);
  });

  it("reports each wallet's status with remaining headroom and capReached", async () => {
    const { service } = serviceWithConfirmedTotal('capped', 20);
    const status = await service.dailyStatus();

    const capped = status.find((s) => s.id === 'capped')!;
    expect(capped).toMatchObject({ capReached: true, remainingUsd: 0 });

    // A switched-off wallet reads as capped-out rather than disappearing, so
    // the finance panel still shows it and its history.
    const off = status.find((s) => s.id === 'off')!;
    expect(off).toMatchObject({ dailyCapUsd: 0, capReached: true, remainingUsd: 0 });

    const treasury = status.find((s) => s.id === 'default')!;
    expect(treasury).toMatchObject({
      dailyCapUsd: null,
      capReached: false,
      remainingUsd: null,
    });
  });
});
