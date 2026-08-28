/**
 * Database-backed checks for the leaderboard queries.
 *
 * Ranking over an aggregate is done in SQL (Prisma cannot count groups), so
 * the engine unit tests cannot cover it — only a real Postgres can. This
 * suite TRUNCATES the users and ledger tables, so it never runs against
 * whatever `DATABASE_URL` happens to point at: it is skipped unless a
 * throwaway database is named explicitly.
 *
 *   docker run -d --rm --name lbtest -e POSTGRES_PASSWORD=postgres \
 *     -e POSTGRES_DB=lbcheck -p 55433:5432 postgres:16-alpine
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:55433/lbcheck \
 *     npx prisma migrate deploy
 *   LEADERBOARD_TEST_DB_URL=postgresql://postgres:postgres@localhost:55433/lbcheck \
 *     npm test
 */
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { LeaderboardService } from './leaderboard.service';

const TEST_DB_URL = process.env.LEADERBOARD_TEST_DB_URL;
const describeDb = TEST_DB_URL ? describe : describe.skip;

const DAY = 24 * 3_600_000;

describeDb('LeaderboardService (postgres)', () => {
  // Built in beforeAll, not at module scope: a skipped describe still
  // evaluates its body, and PrismaClient throws on an undefined datasource.
  let prisma: PrismaService;

  /** A fresh instance per test — the service memoises boards for 30s. */
  const svc = () => new LeaderboardService(prisma);

  let alice = '';
  let bob = '';
  let carol = '';
  let dave = '';

  beforeAll(async () => {
    prisma = new PrismaClient({
      datasources: { db: { url: TEST_DB_URL } },
    }) as unknown as PrismaService;
    await prisma.$connect();
    await prisma.ledgerEntry.deleteMany({});
    await prisma.user.deleteMany({});

    const miner = async (email: string, balance: bigint, blocked = false) =>
      (
        await prisma.user.create({
          data: {
            email,
            pointsBalance: balance,
            isBlocked: blocked,
            countryCode: 'NP',
          },
        })
      ).id;

    alice = await miner('alice@example.com', 5000n);
    bob = await miner('bob@example.com', 3000n);
    carol = await miner('carol@example.com', 3000n); // ties bob on balance
    dave = await miner('dave@example.com', 999999n, true); // blocked

    const entry = (userId: string, milli: bigint, daysAgo: number) =>
      prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'MINING',
          deltaMilli: milli,
          createdAt: new Date(Date.now() - daysAgo * DAY),
        },
      });

    await entry(alice, 5000n, 1);
    await entry(bob, 3000n, 1);
    await entry(carol, 40000n, 40); // outside both windows
    await entry(carol, 1000n, 2);
    await entry(dave, 900000n, 1); // blocked: must not appear anywhere
    await entry(alice, -4000n, 1); // a debit must not reduce "earned"

    await prisma.user.update({
      where: { id: bob },
      data: { referredById: alice },
    });
    await prisma.user.update({
      where: { id: carol },
      data: { referredById: alice },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ranks all-time earnings by credits only, excluding blocked accounts', async () => {
    const board = await svc().getLeaderboard(carol, { category: 'EARNINGS' });

    expect(board.entries.map((e) => e.value)).toEqual([41, 5, 3]);
    expect(board.entries[1].value).toBe(5); // alice, despite a −4 debit
    expect(board.entries.some((e) => e.displayName.startsWith('da'))).toBe(
      false,
    );
    expect(board.totalRanked).toBe(3);
    expect(board.me.rank).toBe(1);
    expect(board.me.inTopList).toBe(true);
  });

  it('masks every listed identity', async () => {
    const board = await svc().getLeaderboard(carol, { category: 'EARNINGS' });
    expect(board.entries[0].displayName).toBe('ca***@example.com');
  });

  it('drops entries older than the requested window', async () => {
    const board = await svc().getLeaderboard(carol, {
      category: 'EARNINGS',
      period: 'WEEK',
    });

    expect(board.period).toBe('WEEK');
    expect(board.entries.map((e) => e.value)).toEqual([5, 3, 1]);
    expect(board.me.rank).toBe(3);
  });

  it('shares a rank between tied balances and forces the all-time period', async () => {
    const board = await svc().getLeaderboard(bob, {
      category: 'BALANCE',
      period: 'WEEK',
    });

    expect(board.period).toBe('ALL_TIME');
    expect(board.periodSupported).toBe(false);
    expect(board.entries.map((e) => e.rank)).toEqual([1, 2, 2]);
    expect(board.me.rank).toBe(2);
  });

  it('ranks inviters by how many miners they brought in', async () => {
    const board = await svc().getLeaderboard(alice, { category: 'REFERRALS' });

    expect(board.unit).toBe('miners');
    expect(board.entries).toHaveLength(1);
    expect(board.entries[0].value).toBe(2);
    expect(board.entries[0].isCurrentUser).toBe(true);
    expect(board.me.rank).toBe(1);
  });

  it('leaves a miner with no score unranked rather than last', async () => {
    const fresh = await prisma.user.create({
      data: { email: 'zed@example.com' },
    });
    const board = await svc().getLeaderboard(fresh.id, {
      category: 'EARNINGS',
    });

    expect(board.me.rank).toBeNull();
    expect(board.me.percentile).toBeNull();
    expect(board.me.badge.label).toBe('Unranked');

    await prisma.user.delete({ where: { id: fresh.id } });
  });

  it('gives a blocked miner no standing of their own', async () => {
    const board = await svc().getLeaderboard(dave, { category: 'BALANCE' });
    expect(board.me.rank).toBeNull();
  });

  it('serves an empty board without failing', async () => {
    // Every seeded miner joined just now, so age them out of the window to
    // get a board with nobody on it at all.
    const joined = await prisma.user.findMany({
      where: { id: { in: [bob, carol] } },
      select: { id: true, createdAt: true },
    });
    await prisma.user.updateMany({
      where: { id: { in: [bob, carol] } },
      data: { createdAt: new Date(Date.now() - 40 * DAY) },
    });

    try {
      const board = await svc().getLeaderboard(alice, {
        category: 'REFERRALS',
        period: 'WEEK',
        limit: 5,
      });
      expect(board.entries).toEqual([]);
      expect(board.totalRanked).toBe(0);
      expect(board.me.rank).toBeNull();
      expect(board.me.percentile).toBeNull();
    } finally {
      for (const u of joined) {
        await prisma.user.update({
          where: { id: u.id },
          data: { createdAt: u.createdAt },
        });
      }
    }
  });
});
