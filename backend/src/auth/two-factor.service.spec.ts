import { HttpException } from '@nestjs/common';
import { TwoFactorService, TOTP_LOCK_MS, TOTP_MAX_FAILURES } from './two-factor.service';
import { base32Decode, hotp, totpStep } from './totp';
import { hashPassword } from './password';

/** One user row, with just enough of Prisma's update semantics for this service. */
function fakeUser(initial: Record<string, any>) {
  const row: Record<string, any> = {
    id: 'u1',
    email: 'miner@example.com',
    sessionVersion: 0,
    totpSecret: null,
    totpEnabledAt: null,
    totpLastStep: null,
    totpFailedCount: 0,
    totpLockedUntil: null,
    ...initial,
  };

  const apply = (data: Record<string, any>) => {
    for (const [k, v] of Object.entries(data)) {
      row[k] = v && typeof v === 'object' && 'increment' in v ? row[k] + v.increment : v;
    }
  };
  const pick = (select?: Record<string, boolean>) =>
    select ? Object.fromEntries(Object.keys(select).map((k) => [k, row[k]])) : { ...row };

  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn(async ({ select }: any) => pick(select)),
      update: jest.fn(async ({ data, select }: any) => {
        apply(data);
        return pick(select);
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const ok = where.OR.some((c: any) =>
          c.totpLastStep === null
            ? row.totpLastStep === null
            : row.totpLastStep !== null && row.totpLastStep < c.totpLastStep.lt,
        );
        if (!ok) return { count: 0 };
        apply(data);
        return { count: 1 };
      }),
    },
  };
  return { row, prisma };
}

async function build(initial: Record<string, any> = {}) {
  process.env.JWT_SECRET = 'j'.repeat(64);
  delete process.env.TOTP_ENCRYPTION_KEY;
  const { row, prisma } = fakeUser({ passwordHash: await hashPassword('correct horse'), ...initial });
  const email = { sendSecurityNotice: jest.fn(async () => true) };
  const events = { record: jest.fn(async () => undefined) };
  const service = new TwoFactorService(prisma as any, email as any, events as any);
  return { service, row, prisma, email, events };
}

/** The code an authenticator holding `secret` shows at `nowMs`. */
const codeAt = (secret: string, nowMs = Date.now()) => hotp(base32Decode(secret), totpStep(nowMs));

const errorCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof HttpException) {
      const body = err.getResponse() as any;
      return { status: err.getStatus(), code: body?.code };
    }
    throw err;
  }
  throw new Error('expected a rejection');
};

describe('TwoFactorService', () => {
  it('stores the secret encrypted and changes nothing until it is confirmed', async () => {
    const { service, row } = await build();
    const setup = await service.beginSetup('u1');

    expect(setup.otpauthUrl).toContain(`secret=${setup.secret}`);
    expect(row.totpSecret).toMatch(/^v1\.k0\./);
    expect(row.totpSecret).not.toContain(setup.secret);
    expect(row.totpEnabledAt).toBeNull();
    expect(row.sessionVersion).toBe(0);
  });

  it('turns on with the password and a current code, signing other sessions out', async () => {
    const { service, row, events, email } = await build();
    const { secret } = await service.beginSetup('u1');

    const version = await service.enable('u1', codeAt(secret), 'correct horse', { ip: '1.2.3.4' });

    expect(row.totpEnabledAt).toBeInstanceOf(Date);
    expect(row.totpLastStep).toBe(totpStep());
    expect(version).toBe(1);
    expect(row.sessionVersion).toBe(1);
    expect(events.record).toHaveBeenCalledWith('u1', 'TOTP_ENABLED', { ip: '1.2.3.4' });
    expect(email.sendSecurityNotice).toHaveBeenCalled();
  });

  it('will not turn on without the right password, even with a good code', async () => {
    const { service, row } = await build();
    const { secret } = await service.beginSetup('u1');

    await expect(service.enable('u1', codeAt(secret), 'wrong', {})).rejects.toThrow(/password/i);
    expect(row.totpEnabledAt).toBeNull();
  });

  it('refuses a second setup while it is on', async () => {
    const { service } = await build();
    const { secret } = await service.beginSetup('u1');
    await service.enable('u1', codeAt(secret), 'correct horse', {});

    await expect(service.beginSetup('u1')).rejects.toThrow(/already on/i);
  });

  describe('checking a code for an account with 2FA on', () => {
    async function enabled() {
      const ctx = await build();
      const { secret } = await ctx.service.beginSetup('u1');
      // Confirmed on the previous step, so the current code is still unused.
      jest.spyOn(Date, 'now').mockReturnValue(Date.now() - 30_000);
      await ctx.service.enable('u1', codeAt(secret), 'correct horse', {});
      jest.restoreAllMocks();
      return { ...ctx, secret };
    }

    it('accepts the current code once, and refuses the same code again', async () => {
      const { service, secret } = await enabled();
      const code = codeAt(secret);

      await expect(service.assertCode('u1', code, {})).resolves.toBeUndefined();
      expect(await errorCode(service.assertCode('u1', code, {}))).toEqual({
        status: 400,
        code: 'TOTP_INVALID',
      });
    });

    it('locks after repeated wrong codes, and the right code does not get through the lock', async () => {
      const { service, row, secret, events } = await enabled();

      for (let i = 0; i < TOTP_MAX_FAILURES; i++) {
        expect(await errorCode(service.assertCode('u1', '000000', {}))).toMatchObject({
          code: 'TOTP_INVALID',
        });
      }
      expect(row.totpLockedUntil.getTime()).toBeGreaterThan(Date.now() + TOTP_LOCK_MS - 5_000);
      expect(events.record).toHaveBeenCalledWith('u1', 'TOTP_LOCKED', {}, expect.anything());

      expect(await errorCode(service.assertCode('u1', codeAt(secret), {}))).toEqual({
        status: 429,
        code: 'TOTP_LOCKED',
      });
    });

    it('turns off only with the password and a current code', async () => {
      const { service, row, secret } = await enabled();

      await expect(service.disable('u1', codeAt(secret), 'wrong', {})).rejects.toThrow(/password/i);
      expect(row.totpEnabledAt).not.toBeNull();

      await service.disable('u1', codeAt(secret), 'correct horse', {});
      expect(row.totpEnabledAt).toBeNull();
      expect(row.totpSecret).toBeNull();
      expect(row.sessionVersion).toBe(2);
    });

    it('can be cleared by an operator, which signs the miner out and tells them', async () => {
      const { service, row, email } = await enabled();

      const result = await service.adminReset('u1', 'ops@example.com');

      expect(result).toEqual({ reset: true, emailed: true });
      expect(row.totpEnabledAt).toBeNull();
      expect(row.sessionVersion).toBe(2);
      expect(email.sendSecurityNotice).toHaveBeenLastCalledWith(
        'miner@example.com',
        expect.objectContaining({ title: 'Two-factor authentication reset' }),
      );
    });
  });

  it('says so plainly when the secret can no longer be decrypted', async () => {
    const { service, secret } = await (async () => {
      const ctx = await build();
      const s = await ctx.service.beginSetup('u1');
      await ctx.service.enable('u1', codeAt(s.secret), 'correct horse', {});
      return { ...ctx, secret: s.secret };
    })();

    process.env.JWT_SECRET = 'rotated'.repeat(10);
    const rotated = new TwoFactorService(
      (service as any).prisma,
      { sendSecurityNotice: jest.fn() } as any,
      { record: jest.fn() } as any,
    );
    expect(await errorCode(rotated.assertCode('u1', codeAt(secret), {}))).toEqual({
      status: 400,
      code: 'TOTP_UNAVAILABLE',
    });
  });
});
