import { CollectorService } from './collector.service';
import { COLLECTORS, DEFAULT_COLLECTOR } from './collectors';

const CAPPED = COLLECTORS.find((c) => c.dailyCapUsd != null)!;

describe('CollectorService', () => {
  function serviceWithConfirmedTotal(collectorId: string, totalUsd: number) {
    const aggregate = jest.fn().mockImplementation(({ where }) => {
      if (where.collectorId === collectorId) {
        return Promise.resolve({ _sum: { priceUsd: totalUsd } });
      }
      return Promise.resolve({ _sum: { priceUsd: 0 } });
    });
    const prisma = { boosterPurchase: { aggregate } } as any;
    return { service: new CollectorService(prisma), aggregate };
  }

  it('routes to the capped collector while it has headroom for today', async () => {
    const { service } = serviceWithConfirmedTotal(CAPPED.id, 0);
    const picked = await service.pickCollector(5);
    expect(picked.id).toBe(CAPPED.id);
  });

  it('still routes to the capped collector right up to its daily cap', async () => {
    const { service } = serviceWithConfirmedTotal(CAPPED.id, CAPPED.dailyCapUsd! - 5);
    const picked = await service.pickCollector(5); // exactly fills the cap
    expect(picked.id).toBe(CAPPED.id);
  });

  it('falls back to the default collector once the daily cap is reached', async () => {
    const { service } = serviceWithConfirmedTotal(CAPPED.id, CAPPED.dailyCapUsd!);
    const picked = await service.pickCollector(1);
    expect(picked.id).toBe(DEFAULT_COLLECTOR.id);
  });

  it('falls back to the default collector when a purchase would push it over the cap', async () => {
    const { service } = serviceWithConfirmedTotal(CAPPED.id, CAPPED.dailyCapUsd! - 5);
    const picked = await service.pickCollector(10); // would land at cap - 5, but +10 overshoots
    expect(picked.id).toBe(DEFAULT_COLLECTOR.id);
  });

  it('only counts CONFIRMED purchases from today (UTC) toward the cap', async () => {
    const { service, aggregate } = serviceWithConfirmedTotal(CAPPED.id, 0);
    await service.collectedTodayUsd(CAPPED.id);
    const call = aggregate.mock.calls[0][0];
    expect(call.where.status).toBe('CONFIRMED');
    expect(call.where.confirmedAt.gte).toBeInstanceOf(Date);
  });

  it('reports each collector\'s status with remaining headroom and capReached', async () => {
    const { service } = serviceWithConfirmedTotal(CAPPED.id, CAPPED.dailyCapUsd!);
    const status = await service.dailyStatus();

    const capped = status.find((s) => s.id === CAPPED.id)!;
    expect(capped.capReached).toBe(true);
    expect(capped.remainingUsd).toBe(0);

    const def = status.find((s) => s.id === DEFAULT_COLLECTOR.id)!;
    expect(def.dailyCapUsd).toBeNull();
    expect(def.capReached).toBe(false);
    expect(def.remainingUsd).toBeNull();
  });
});
