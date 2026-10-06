import { AdminService } from './admin.service';
import { verifyPassword } from '../auth/password';

function build(existing: { id: string; isReviewAccount: boolean } | null) {
  const writes: Record<string, any[]> = { user: [], kycRecord: [], ledgerEntry: [], update: [] };
  const tx = {
    user: { create: jest.fn(async ({ data }: any) => (writes.user.push(data), { id: 'r1' })) },
    kycRecord: { create: jest.fn(async ({ data }: any) => writes.kycRecord.push(data)) },
    ledgerEntry: { create: jest.fn(async ({ data }: any) => writes.ledgerEntry.push(data)) },
  };
  const prisma = {
    user: {
      findUnique: jest.fn(async () => existing),
      update: jest.fn(async ({ data }: any) => writes.update.push(data)),
    },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const service = new AdminService(
    prisma as any,
    {} as any,
    {} as any,
    { get: () => undefined } as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { service, writes };
}

describe('app-store review account', () => {
  const PASSWORD = 'a-long-review-password-123';

  it('is created straight into the database, KYC-approved, with test points', async () => {
    const { service, writes } = build(null);

    const res = await service.upsertReviewAccount(' Review@Example.com ', PASSWORD, 'ops@example.com');

    expect(res).toEqual({ id: 'r1', email: 'review@example.com', created: true });
    expect(writes.user[0]).toMatchObject({ email: 'review@example.com', isReviewAccount: true });
    expect(await verifyPassword(PASSWORD, writes.user[0].passwordHash)).toBe(true);
    expect(writes.kycRecord[0]).toMatchObject({ userId: 'r1', status: 'APPROVED' });
    expect(writes.ledgerEntry[0]).toMatchObject({ userId: 'r1', reason: 'AIRDROP' });
    expect(writes.user[0].pointsBalance).toBe(writes.ledgerEntry[0].deltaMilli);
  });

  it('gets a new password, and its old sessions end, when saved again', async () => {
    const { service, writes } = build({ id: 'r1', isReviewAccount: true });

    const res = await service.upsertReviewAccount('review@example.com', PASSWORD, 'ops@example.com');

    expect(res.created).toBe(false);
    expect(writes.update[0].sessionVersion).toEqual({ increment: 1 });
    expect(writes.user).toHaveLength(0);
  });

  it("refuses a real miner's email, which would strip their account of its second factor", async () => {
    const { service, writes } = build({ id: 'u1', isReviewAccount: false });

    await expect(
      service.upsertReviewAccount('miner@example.com', PASSWORD, 'ops@example.com'),
    ).rejects.toThrow(/real miner/i);
    expect(writes.update).toHaveLength(0);
  });
});
