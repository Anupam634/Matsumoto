import { HttpException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { hashPassword } from './password';

/**
 * The account takeover this guards against: the emailed sign-in code was
 * asked for only when the request said `platform: 'web'`, so a script that
 * left the field out — or said "mobile" — signed in with the password alone.
 */
async function build(opts: { totp?: boolean; review?: boolean; env?: Record<string, string> } = {}) {
  const user = {
    id: 'u1',
    email: 'miner@example.com',
    passwordHash: await hashPassword('correct horse'),
    isBlocked: false,
    referralCode: 'REF',
    sessionVersion: 3,
    totpEnabledAt: opts.totp ? new Date() : null,
    isReviewAccount: !!opts.review,
  };
  const prisma = { user: { findUnique: jest.fn(async () => user) } };
  const jwt = { signAsync: jest.fn(async (payload: unknown) => JSON.stringify(payload)) };
  const emailService = {
    sendOtpEmail: jest.fn(async () => ({ success: true })),
    verifyOtp: jest.fn(async (_e: string, code: string) => code === '111111'),
  };
  const twoFactor = {
    assertCode: jest.fn(async (_id: string, code: string) => {
      if (code !== '222222') throw new Error('bad authenticator code');
    }),
  };
  const events = { record: jest.fn(async () => undefined) };
  const env = opts.env ?? {};
  const service = new AuthService(
    prisma as any,
    jwt as any,
    { recordDevice: jest.fn(async () => undefined) } as any,
    emailService as any,
    { get: (k: string) => env[k] } as any,
    twoFactor as any,
    events as any,
  );
  return { service, emailService, twoFactor, events, jwt };
}

const bodyCode = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof HttpException) return (err.getResponse() as any).code;
    throw err;
  }
  throw new Error('expected a rejection');
};

const login = (extra: Record<string, unknown> = {}) =>
  ({ email: 'miner@example.com', password: 'correct horse', ...extra }) as any;

describe('sign-in second factor', () => {
  const saved = process.env.TURNSTILE_SECRET_KEY;
  beforeAll(() => delete process.env.TURNSTILE_SECRET_KEY);
  afterAll(() => (process.env.TURNSTILE_SECRET_KEY = saved));

  it.each([
    ['no platform at all', {}],
    ['the mobile app', { platform: 'mobile' }],
    ['the website', { platform: 'web' }],
  ])('asks %s for the emailed code instead of signing in on the password', async (_label, extra) => {
    const { service, emailService } = await build();

    expect(await bodyCode(service.login(login(extra), {}))).toBe('OTP_REQUIRED');
    expect(emailService.sendOtpEmail).toHaveBeenCalledWith('miner@example.com', 'login_2fa');
  });

  it('signs in with the emailed code, on a token carrying the session version', async () => {
    const { service, events } = await build();

    const res = await service.login(login({ otp: '111111', platform: 'mobile' }), { ip: '9.9.9.9' });

    expect(JSON.parse(res.accessToken)).toEqual({ sub: 'u1', email: 'miner@example.com', sv: 3 });
    expect(events.record).toHaveBeenCalledWith(
      'u1',
      'LOGIN_SUCCEEDED',
      expect.objectContaining({ ip: '9.9.9.9', platform: 'mobile' }),
      { method: 'email_code' },
    );
  });

  it('records a wrong password against the account', async () => {
    const { service, events } = await build();

    await expect(service.login(login({ password: 'nope' }), {})).rejects.toThrow(
      UnauthorizedException,
    );
    expect(events.record).toHaveBeenCalledWith('u1', 'LOGIN_FAILED', expect.anything(), {
      reason: 'password',
    });
  });

  describe('with an authenticator app on', () => {
    it('asks for the app code — and mails nothing — whatever the platform says', async () => {
      const { service, emailService } = await build({ totp: true });

      expect(await bodyCode(service.login(login(), {}))).toBe('TOTP_REQUIRED');
      // An emailed code does not stand in for it.
      expect(await bodyCode(service.login(login({ otp: '111111' }), {}))).toBe('TOTP_REQUIRED');
      expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
    });

    it('signs in with the app code', async () => {
      const { service, twoFactor } = await build({ totp: true });

      const res = await service.login(login({ totp: '222222' }), {});
      expect(res.accessToken).toBeDefined();
      expect(twoFactor.assertCode).toHaveBeenCalledWith('u1', '222222', expect.anything());
    });

    it('still needs the app code when the emailed-code switch is off', async () => {
      const { service } = await build({ totp: true, env: { LOGIN_OTP_ENFORCED: 'false' } });
      expect(await bodyCode(service.login(login(), {}))).toBe('TOTP_REQUIRED');
    });
  });

  it('falls back to password-only only when the emailed-code switch is off', async () => {
    const { service, emailService } = await build({ env: { LOGIN_OTP_ENFORCED: 'false' } });

    await expect(service.login(login(), {})).resolves.toHaveProperty('accessToken');
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
  });

  it('lets the app-store review account in on the password alone, and says so in its log', async () => {
    const { service, emailService, events } = await build({ review: true });

    await expect(service.login(login({ platform: 'mobile' }), {})).resolves.toHaveProperty('accessToken');
    expect(emailService.sendOtpEmail).not.toHaveBeenCalled();
    expect(events.record).toHaveBeenCalledWith('u1', 'LOGIN_SUCCEEDED', expect.anything(), {
      method: 'password',
      reviewAccount: true,
    });
  });

  it('still refuses the review account a wrong password', async () => {
    const { service } = await build({ review: true });
    await expect(service.login(login({ password: 'nope' }), {})).rejects.toThrow(UnauthorizedException);
  });
});

describe('JwtAuthGuard session version', () => {
  function guard(sessionVersion: number, payload: Record<string, unknown>) {
    const g = new JwtAuthGuard(
      { verifyAsync: jest.fn(async () => payload) } as any,
      {
        user: {
          findUnique: jest.fn(async () => ({
            id: 'u1',
            email: 'miner@example.com',
            isBlocked: false,
            sessionVersion,
          })),
        },
      } as any,
    );
    const req: any = { headers: { authorization: 'Bearer t' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    return { run: () => g.canActivate(ctx), req };
  }

  it('accepts a token signed under the current version', async () => {
    const { run, req } = guard(2, { sub: 'u1', sv: 2 });
    await expect(run()).resolves.toBe(true);
    expect(req.user).toEqual({ id: 'u1', email: 'miner@example.com' });
  });

  it('refuses one signed before the version was bumped', async () => {
    await expect(guard(3, { sub: 'u1', sv: 2 }).run()).rejects.toThrow(/session has ended/i);
  });

  it('reads a pre-existing token with no version as version 0', async () => {
    await expect(guard(0, { sub: 'u1' }).run()).resolves.toBe(true);
    await expect(guard(1, { sub: 'u1' }).run()).rejects.toThrow(/session has ended/i);
  });
});
