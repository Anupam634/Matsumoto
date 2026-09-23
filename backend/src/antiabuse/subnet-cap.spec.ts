import { ForbiddenException } from '@nestjs/common';
import { AntiabuseService } from './antiabuse.service';

/**
 * The farm rents a block of addresses and spreads accounts across it —
 * 154.16.137.131, .132, .195, .221 — so every single address stays under the
 * per-IP cap while the range as a whole carries hundreds.
 */
function build(env: Record<string, string>, rows: { userId: string; lastIp: string }[]) {
  const prisma = {
    deviceFingerprint: {
      findMany: jest.fn(async ({ where }: any) => {
        const match = (r: { lastIp: string }) => {
          if (typeof where.lastIp === 'string') return r.lastIp === where.lastIp;
          if (where.lastIp?.startsWith) return r.lastIp.startsWith(where.lastIp.startsWith);
          return false;
        };
        const seen = new Set<string>();
        return rows.filter(match).filter((r) => !seen.has(r.userId) && seen.add(r.userId));
      }),
    },
  };
  const service = new AntiabuseService(prisma as any, {
    get: (k: string) => env[k],
  } as any);
  return { service, prisma };
}

const range = (prefix: string, hosts: number[], from = 0) =>
  hosts.map((h, i) => ({ userId: `u${from + i}`, lastIp: `${prefix}${h}` }));

describe('per-subnet signup cap', () => {
  const caps = { MAX_ACCOUNTS_PER_IP: '3', MAX_ACCOUNTS_PER_SUBNET: '5' };

  it('allows a fresh range', async () => {
    const { service } = build(caps, []);
    await expect(service.assertSignupAllowed({ ip: '154.16.137.131' })).resolves.toBeUndefined();
  });

  it('blocks a range that is already full, even from an unused address', async () => {
    // Five accounts, every one on a different address: each address is under
    // the per-IP cap of 3, so only the /24 count catches this.
    const { service } = build(caps, range('154.16.137.', [131, 132, 195, 221, 9]));
    await expect(service.assertSignupAllowed({ ip: '154.16.137.250' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('does not spill over into a neighbouring range', async () => {
    const { service } = build(caps, range('154.16.137.', [131, 132, 195, 221, 9]));
    await expect(service.assertSignupAllowed({ ip: '154.16.138.5' })).resolves.toBeUndefined();
  });

  it('still enforces the tighter per-IP cap first', async () => {
    const { service } = build(caps, [
      { userId: 'a', lastIp: '1.2.3.4' },
      { userId: 'b', lastIp: '1.2.3.4' },
      { userId: 'c', lastIp: '1.2.3.4' },
    ]);
    await expect(service.assertSignupAllowed({ ip: '1.2.3.4' })).rejects.toThrow(
      /maximum|too many/i,
    );
  });

  it('is off when MAX_ACCOUNTS_PER_SUBNET is unset', async () => {
    const { service, prisma } = build({ MAX_ACCOUNTS_PER_IP: '3' }, range('9.9.9.', [1, 2, 3, 4, 5, 6, 7, 8]));
    await expect(service.assertSignupAllowed({ ip: '9.9.9.200' })).resolves.toBeUndefined();
    // Only the per-IP lookup ran; no prefix query at all.
    expect(prisma.deviceFingerprint.findMany).toHaveBeenCalledTimes(1);
  });

  it('skips the range check for IPv6, which a prefix count cannot bound', async () => {
    const { service } = build(caps, []);
    await expect(
      service.assertSignupAllowed({ ip: '2001:db8::1' }),
    ).resolves.toBeUndefined();
  });
});
