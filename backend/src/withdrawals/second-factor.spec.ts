import { HttpException } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';

/**
 * A withdrawal used to need the emailed code only when the request said
 * `platform: 'web'`. Leaving the field out moved funds on a bearer token alone.
 */
function build(opts: { totp?: boolean; requireTotp?: boolean; env?: Record<string, string> } = {}) {
  const user = {
    id: 'u1',
    email: 'miner@example.com',
    totpEnabledAt: opts.totp ? new Date() : null,
    kyc: { status: 'APPROVED' },
  };
  const created: any[] = [];
  const tx = {
    $executeRaw: jest.fn(async () => 1),
    $queryRaw: jest.fn(async () => []),
    user: {
      findUniqueOrThrow: jest.fn(async () => user),
      updateMany: jest.fn(async () => ({ count: 1 })),
    },
    withdrawal: {
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: any) => {
        const row = { id: 'w1', txHash: null, adminNote: null, resolvedAt: null, requestedAt: new Date(), ...data };
        created.push(row);
        return row;
      }),
    },
    ledgerEntry: { create: jest.fn(async () => undefined) },
  };
  const prisma = {
    user: { findUniqueOrThrow: jest.fn(async () => user) },
    $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  const email = {
    verifyOtp: jest.fn(async (_e: string, code: string) => code === '111111'),
    sendSecurityNotice: jest.fn(async () => true),
  };
  const twoFactor = {
    assertCode: jest.fn(async (_u: string, code: string) => {
      if (code !== '222222') throw new Error('bad authenticator code');
    }),
  };
  const settings = {
    effective: jest.fn(async () => ({ requireTotpForWithdrawal: !!opts.requireTotp })),
  };
  const events = { record: jest.fn(async () => undefined) };
  const env = opts.env ?? {};
  const service = new WithdrawalsService(
    prisma as any,
    {} as any,
    email as any,
    { get: (k: string) => env[k] } as any,
    twoFactor as any,
    settings as any,
    events as any,
  );
  return { service, created, email, twoFactor, events, tx };
}

const ADDRESS = '0x8E1A28572f4A0EB9699BCf2a3d93eCa5417Ab96c';

const bodyCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof HttpException) return (err.getResponse() as any).code;
    throw err;
  }
  throw new Error('expected a rejection');
};

describe('withdrawal second factor', () => {
  it.each([
    ['no platform at all', {}],
    ['the mobile app', { platform: 'mobile' }],
  ])('asks %s for the emailed code', async (_label, extra) => {
    const { service, tx } = build();

    expect(await bodyCode(service.request('u1', ADDRESS, 150_000, extra))).toBe('OTP_REQUIRED');
    expect(tx.withdrawal.create).not.toHaveBeenCalled();
  });

  it('queues the request with the emailed code, and records where it came from', async () => {
    const { service, created, events, email } = await build();

    await service.request('u1', ADDRESS, 150_000, {
      otp: '111111',
      ip: '8.8.8.8',
      platform: 'mobile',
      fingerprint: 'android-device',
    });

    expect(created[0]).toMatchObject({
      requestIp: '8.8.8.8',
      requestPlatform: 'mobile',
      requestFingerprint: 'android-device',
      secondFactor: 'email',
    });
    expect(events.record).toHaveBeenCalledWith(
      'u1',
      'WITHDRAWAL_REQUESTED',
      expect.anything(),
      expect.objectContaining({ toAddress: ADDRESS, secondFactor: 'email' }),
    );
    // The owner is told while the request is still waiting for review.
    expect(email.sendSecurityNotice).toHaveBeenCalledWith(
      'miner@example.com',
      expect.objectContaining({ title: 'Withdrawal requested' }),
    );
  });

  describe('with an authenticator app on', () => {
    it('asks for the app code, and an emailed code does not stand in for it', async () => {
      const { service } = build({ totp: true });
      expect(await bodyCode(service.request('u1', ADDRESS, 150_000, {}))).toBe('TOTP_REQUIRED');
      expect(await bodyCode(service.request('u1', ADDRESS, 150_000, { otp: '111111' }))).toBe(
        'TOTP_REQUIRED',
      );
    });

    it('checks the code before touching the balance', async () => {
      const { service, tx, twoFactor } = build({ totp: true });

      await expect(service.request('u1', ADDRESS, 150_000, { totp: '000000' })).rejects.toThrow();
      expect(tx.user.updateMany).not.toHaveBeenCalled();

      await service.request('u1', ADDRESS, 150_000, { totp: '222222' });
      expect(twoFactor.assertCode).toHaveBeenLastCalledWith('u1', '222222', expect.anything());
      expect(tx.withdrawal.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ secondFactor: 'totp' }) }),
      );
    });

    it('still asks for it when the emailed-code switch is off', async () => {
      const { service } = build({ totp: true, env: { WITHDRAWAL_OTP_ENFORCED: 'false' } });
      expect(await bodyCode(service.request('u1', ADDRESS, 150_000, {}))).toBe('TOTP_REQUIRED');
    });
  });

  it('sends a miner without an authenticator to set one up when the panel requires it', async () => {
    const { service } = build({ requireTotp: true });
    expect(await bodyCode(service.request('u1', ADDRESS, 150_000, { otp: '111111' }))).toBe(
      'TOTP_SETUP_REQUIRED',
    );
  });

  it('records "none" only when the emailed-code switch is off', async () => {
    const { service, created } = build({ env: { WITHDRAWAL_OTP_ENFORCED: 'false' } });
    await service.request('u1', ADDRESS, 150_000, {});
    expect(created[0].secondFactor).toBe('none');
  });
});
