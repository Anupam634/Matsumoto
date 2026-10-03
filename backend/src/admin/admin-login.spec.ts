import { HttpException } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin.guard';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { DEFAULT_ADMIN_OTP_RECIPIENTS } from './admin-session';
import { hashPassword, verifyPassword } from '../auth/password';

const PASSWORD = 'a-long-unpublished-password';
const PUBLISHED = 'BondKoin@2026!Admin';

async function build(env: Record<string, string> = {}, password = PASSWORD) {
  const admin = {
    id: 'a1',
    email: 'admin@bondkoinlabs.com',
    passwordHash: await hashPassword(password),
    role: 'admin',
    permissions: [],
    sessionVersion: 4,
  };
  const prisma = {
    adminUser: { findUnique: jest.fn(async ({ where }: any) => (where.email === admin.email ? admin : null)) },
  };
  const jwt = { signAsync: jest.fn(async (payload: unknown, opts: unknown) => JSON.stringify({ payload, opts })) };
  const email = {
    sendAdminLoginCode: jest.fn(async () => undefined),
    verifyCode: jest.fn(async (_key: string, code: string) => code === '654321'),
  };
  const audit = { record: jest.fn(async () => undefined) };
  const service = new AdminService(
    prisma as any,
    jwt as any,
    email as any,
    { get: (k: string) => env[k] } as any,
    audit as any,
    {} as any,
    {} as any,
  );
  return { service, prisma, email, audit, jwt };
}

const failure = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    if (err instanceof HttpException) {
      const body = err.getResponse() as any;
      return {
        status: err.getStatus(),
        code: body?.code,
        sentTo: body?.sentTo,
        warning: body?.warning,
        message: body?.message,
      };
    }
    throw err;
  }
  throw new Error('expected a rejection');
};

const actions = (audit: { record: jest.Mock }) =>
  audit.record.mock.calls.map(([entry]: any[]) => `${entry.action}:${entry.outcome}`);

describe('admin console sign-in', () => {
  afterEach(() => jest.restoreAllMocks());
  const at = (iso: string) => jest.spyOn(Date, 'now').mockReturnValue(new Date(iso).getTime());

  it('refuses a password that was published in the repo, before looking anyone up', async () => {
    at('2026-10-10T00:00:00Z'); // the grace period has run out
    const { service, prisma, audit } = await build({}, PUBLISHED);

    const res = await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PUBLISHED }));

    expect(res).toMatchObject({ status: 401, code: 'PASSWORD_PUBLISHED' });
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
    expect(actions(audit)).toEqual(['ADMIN_LOGIN_PUBLISHED_PASSWORD:denied']);
  });

  it('lets a published password through to the emailed code during the grace period, with a warning', async () => {
    at('2026-10-09T23:59:00Z');
    const { service, email, audit } = await build({}, PUBLISHED);

    const res = await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PUBLISHED }));

    expect(res).toMatchObject({ status: 401, code: 'OTP_REQUIRED' });
    expect(res.warning).toMatch(/public.*2026-10-10/);
    expect(email.sendAdminLoginCode).toHaveBeenCalled();
    expect(actions(audit)).toEqual([
      'ADMIN_LOGIN_PUBLISHED_PASSWORD_ALLOWED:ok',
      'ADMIN_LOGIN_CODE_SENT:ok',
    ]);

    // The code is still required to get in.
    expect(
      await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PUBLISHED, otp: '000000' })),
    ).toMatchObject({ status: 401, code: 'OTP_INVALID' });
    const signedIn = await service.login({ email: 'admin@bondkoinlabs.com', password: PUBLISHED, otp: '654321' });
    expect(signedIn.accessToken).toBeDefined();
  });

  it('never allows a published password while the emailed code is switched off', async () => {
    at('2026-10-05T00:00:00Z');
    const { service, prisma } = await build({ ADMIN_LOGIN_OTP_ENFORCED: 'false' }, PUBLISHED);

    expect(await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PUBLISHED }))).toMatchObject({
      status: 401,
      code: 'PASSWORD_PUBLISHED',
    });
    expect(prisma.adminUser.findUnique).not.toHaveBeenCalled();
  });

  it('records a wrong password and mails nothing', async () => {
    const { service, email, audit } = await build();

    expect(await failure(service.login({ email: 'admin@bondkoinlabs.com', password: 'wrong-password' }))).toMatchObject({
      status: 401,
    });
    expect(email.sendAdminLoginCode).not.toHaveBeenCalled();
    expect(actions(audit)).toEqual(['ADMIN_LOGIN_FAILED:denied']);
  });

  it('mails the code to ADMIN_OTP_EMAIL, not to the account, and says where (masked)', async () => {
    const { service, email, audit } = await build({ ADMIN_OTP_EMAIL: 'Ops.Inbox@Example.com' });

    const res = await failure(
      service.login({ email: 'admin@bondkoinlabs.com', password: PASSWORD }, { ip: '5.6.7.8' }),
    );

    expect(res).toMatchObject({ status: 401, code: 'OTP_REQUIRED', sentTo: ['op***@example.com'] });
    expect(email.sendAdminLoginCode).toHaveBeenCalledWith(
      expect.objectContaining({ adminId: 'a1', recipients: ['ops.inbox@example.com'], ip: '5.6.7.8' }),
    );
    expect(actions(audit)).toEqual(['ADMIN_LOGIN_CODE_SENT:ok']);
  });

  it('sends the code to the default operator inbox when ADMIN_OTP_EMAIL is unset', async () => {
    const { service, email } = await build();
    const res = await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PASSWORD }));
    expect(email.sendAdminLoginCode).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: DEFAULT_ADMIN_OTP_RECIPIENTS }),
    );
    // Never to the address being signed in with.
    expect(email.sendAdminLoginCode).not.toHaveBeenCalledWith(
      expect.objectContaining({ recipients: ['admin@bondkoinlabs.com'] }),
    );
    expect(res.sentTo).toEqual(['su***@gmail.com']);
  });

  it('refuses a wrong code', async () => {
    const { service, audit } = await build();
    expect(
      await failure(service.login({ email: 'admin@bondkoinlabs.com', password: PASSWORD, otp: '000000' })),
    ).toMatchObject({ status: 401, code: 'OTP_INVALID' });
    expect(actions(audit)).toEqual(['ADMIN_LOGIN_CODE_FAILED:denied']);
  });

  it('signs in with the right code, on a short-lived token that names its session version', async () => {
    const { service, email, audit } = await build({ ADMIN_SESSION_TTL: '8h' });

    const res = await service.login({ email: 'admin@bondkoinlabs.com', password: PASSWORD, otp: '654321' });

    expect(JSON.parse(res.accessToken)).toEqual({
      payload: { sub: 'a1', email: 'admin@bondkoinlabs.com', typ: 'admin', sv: 4, mfa: true },
      opts: { expiresIn: '8h' },
    });
    expect(email.verifyCode).toHaveBeenCalledWith('admin-login:a1', '654321', 'admin_login');
    expect(actions(audit)).toEqual(['ADMIN_LOGIN_SUCCEEDED:ok']);
  });

  it('skips the code only when ADMIN_LOGIN_OTP_ENFORCED is "false", and says so on the token', async () => {
    const { service, email } = await build({ ADMIN_LOGIN_OTP_ENFORCED: 'false' });

    const res = await service.login({ email: 'admin@bondkoinlabs.com', password: PASSWORD });

    expect(JSON.parse(res.accessToken).payload.mfa).toBe(false);
    expect(email.sendAdminLoginCode).not.toHaveBeenCalled();
  });
});

describe('AdminAuthGuard', () => {
  function guard(payload: Record<string, unknown>, env: Record<string, string> = {}) {
    const g = new AdminAuthGuard(
      { verifyAsync: jest.fn(async () => payload) } as any,
      {
        adminUser: {
          findUnique: jest.fn(async () => ({
            id: 'a1',
            email: 'admin@bondkoinlabs.com',
            role: 'admin',
            permissions: [],
            sessionVersion: 4,
          })),
        },
      } as any,
      { get: (k: string) => env[k] } as any,
    );
    const req: any = { headers: { authorization: 'Bearer t' } };
    const ctx: any = { switchToHttp: () => ({ getRequest: () => req }) };
    return { run: () => g.canActivate(ctx), req };
  }
  const base = { sub: 'a1', email: 'admin@bondkoinlabs.com', typ: 'admin' };

  it('lets a code-verified token on the current version through', async () => {
    const { run, req } = guard({ ...base, sv: 4, mfa: true });
    await expect(run()).resolves.toBe(true);
    expect(req.admin).toEqual({ id: 'a1', email: 'admin@bondkoinlabs.com', role: 'admin', permissions: [] });
  });

  it('refuses every token issued before this change — they carry no version', async () => {
    await expect(guard({ ...base }).run()).rejects.toThrow(/session has ended/i);
  });

  it('refuses a token from before the sessions were revoked', async () => {
    await expect(guard({ ...base, sv: 3, mfa: true }).run()).rejects.toThrow(/session has ended/i);
  });

  it('refuses a password-only token while the code is required', async () => {
    await expect(guard({ ...base, sv: 4, mfa: false }).run()).rejects.toThrow(/emailed code/i);
    await expect(
      guard({ ...base, sv: 4, mfa: false }, { ADMIN_LOGIN_OTP_ENFORCED: 'false' }).run(),
    ).resolves.toBe(true);
  });

  it('still refuses a miner token', async () => {
    await expect(guard({ sub: 'u1', sv: 4, mfa: true }).run()).rejects.toThrow(/not an admin/i);
  });
});

describe('AdminBootstrapService', () => {
  async function boot(env: Record<string, string>, existing: { passwordHash: string; role: string } | null) {
    const prisma = {
      adminUser: {
        findUnique: jest.fn(async () => (existing ? { id: 'a1', ...existing } : null)),
        upsert: jest.fn(async () => undefined),
        update: jest.fn(async () => undefined),
      },
    };
    await new AdminBootstrapService(prisma as any, { get: (k: string) => env[k] } as any).onModuleInit();
    return prisma.adminUser;
  }

  it('refuses to apply a published password from the env', async () => {
    const db = await boot({ ADMIN_EMAIL: 'admin@bondkoinlabs.com', ADMIN_PASSWORD: 'BondKoin@2026!Admin' }, null);
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('leaves an unchanged password alone, so a restart signs nobody out', async () => {
    const db = await boot(
      { ADMIN_EMAIL: 'admin@bondkoinlabs.com', ADMIN_PASSWORD: PASSWORD },
      { passwordHash: await hashPassword(PASSWORD), role: 'admin' },
    );
    expect(db.upsert).not.toHaveBeenCalled();
  });

  it('applies a changed password and ends the sessions opened under the old one', async () => {
    const db = await boot(
      { ADMIN_EMAIL: 'admin@bondkoinlabs.com', ADMIN_PASSWORD: 'a-brand-new-password' },
      { passwordHash: await hashPassword(PASSWORD), role: 'admin' },
    );
    const { update } = (db.upsert.mock.calls[0] as any[])[0];
    expect(update.sessionVersion).toEqual({ increment: 1 });
    expect(await verifyPassword('a-brand-new-password', update.passwordHash)).toBe(true);
  });
});
