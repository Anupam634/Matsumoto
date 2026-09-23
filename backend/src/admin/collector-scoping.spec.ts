import { AdminService } from './admin.service';

/**
 * The general admin surface must not reveal another collector's money — not
 * a row, not a total, and not through the ledger's audit trail, where a
 * booster purchase keeps its txHash and price in `meta`.
 *
 * These tests do not check numbers. They record what the service asks the
 * database for, which is what a future query added without the scope would
 * fail on.
 */
function recordingPrisma() {
  const calls: { model: string; method: string; args: any }[] = [];

  const empties: Record<string, unknown> = {
    count: 0,
    aggregate: { _count: { _all: 0 }, _sum: {}, _min: {}, _max: {} },
    groupBy: [],
    findMany: [],
    findFirst: null,
    findUnique: null,
  };

  const model = (name: string) =>
    new Proxy(
      {},
      {
        get: (_t, method: string) => async (args: unknown) => {
          calls.push({ model: name, method, args });
          return empties[method] ?? [];
        },
      },
    );

  const prisma = new Proxy(
    { $queryRaw: async () => [] },
    {
      get: (target: any, prop: string) =>
        prop in target ? target[prop] : model(prop),
    },
  );

  return { prisma, calls };
}

function build() {
  const { prisma, calls } = recordingPrisma();
  const service = new AdminService(
    prisma as any,
    { signAsync: jest.fn() } as any,
    { sendAccountStatusEmail: jest.fn() } as any,
  );
  const boosterQueries = () => calls.filter((c) => c.model === 'boosterPurchase');
  const ledgerQueries = () => calls.filter((c) => c.model === 'ledgerEntry');
  return { service, calls, boosterQueries, ledgerQueries };
}

/** Does this `where` pin the default collector, at the top level or in an OR arm? */
const scoped = (where: any): boolean =>
  !!where &&
  (where.collectorId === 'default' ||
    (Array.isArray(where.AND) && where.AND.some(scoped)));

describe('general admin surface is scoped to the default collector', () => {
  it('scopes every booster-money read in the revenue analytics', async () => {
    const { service, boosterQueries } = build();
    await service.revenueAnalytics();

    const queries = boosterQueries();
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) {
      expect(scoped(q.args?.where)).toBe(true);
    }
  });

  it('scopes the per-user spend behind the revenue-by-user export', async () => {
    const { service, boosterQueries } = build();
    await service.exportRevenueByUserCsv();

    const queries = boosterQueries();
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) {
      expect(scoped(q.args?.where)).toBe(true);
    }
  });

  it('scopes the purchase count in the reports summary', async () => {
    const { service, boosterQueries } = build();
    await service.getReportsSummary();

    const queries = boosterQueries();
    expect(queries.length).toBeGreaterThan(0);
    for (const q of queries) {
      expect(scoped(q.args?.where)).toBe(true);
    }
  });

  it('never asks the ledger for `meta`, which carries a purchase txHash', async () => {
    const { service, ledgerQueries } = build();
    await service.stats();
    await service.userDetail('u1').catch(() => undefined);

    const reads = ledgerQueries().filter((c) => c.method === 'findMany');
    expect(reads.length).toBeGreaterThan(0);
    for (const read of reads) {
      // Either an explicit select without meta, or no select at all is a leak.
      expect(read.args?.select).toBeDefined();
      expect(read.args.select.meta).toBeUndefined();
    }
  });
});
