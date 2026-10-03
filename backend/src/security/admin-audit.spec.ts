import { BadRequestException } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';
import { sanitizeForAudit } from './admin-audit.service';
import { AdminAuditInterceptor } from './admin-audit.interceptor';

describe('sanitizeForAudit', () => {
  it('never keeps a credential', () => {
    expect(
      sanitizeForAudit({
        email: 'ops@example.com',
        password: 'hunter2hunter2',
        otp: '123456',
        nested: { newPassword: 'x', captchaToken: 'y', totp: '654321' },
      }),
    ).toEqual({
      email: 'ops@example.com',
      password: '[redacted]',
      otp: '[redacted]',
      nested: { newPassword: '[redacted]', captchaToken: '[redacted]', totp: '[redacted]' },
    });
  });

  it('keeps the fields an admin action is about', () => {
    expect(sanitizeForAudit({ points: 500, note: 'promo', approve: true, blocked: false })).toEqual({
      points: 500,
      note: 'promo',
      approve: true,
      blocked: false,
    });
  });

  it('cuts long strings and long lists down to size', () => {
    const out = sanitizeForAudit({ text: 'a'.repeat(1_000), list: Array.from({ length: 50 }, (_, i) => i) }) as any;
    expect(out.text.length).toBeLessThan(350);
    expect(out.list).toHaveLength(21);
  });
});

describe('AdminAuditInterceptor', () => {
  function run(opts: {
    method: string;
    admin?: boolean;
    markedRead?: boolean;
    fail?: boolean;
  }) {
    const audit = { record: jest.fn(async () => undefined) };
    const reflector = { get: jest.fn(() => opts.markedRead ?? false) };
    const interceptor = new AdminAuditInterceptor(audit as any, reflector as any);
    const req = {
      method: opts.method,
      route: { path: '/api/admin/users/:id/airdrop' },
      params: { id: 'u1' },
      query: {},
      body: { points: 100, note: 'thanks' },
      headers: { 'user-agent': 'Mozilla/5.0' },
      ip: '7.7.7.7',
      admin: opts.admin === false ? undefined : { id: 'a1', email: 'ops@example.com' },
    };
    const ctx: any = {
      getType: () => 'http',
      getHandler: () => () => undefined,
      switchToHttp: () => ({ getRequest: () => req }),
    };
    const handler = {
      handle: () => (opts.fail ? throwError(() => new BadRequestException('nope')) : of({ ok: true })),
    };
    const done = lastValueFrom(interceptor.intercept(ctx, handler)).catch(() => undefined);
    return { audit, done };
  }

  it('records a change, with the route pattern, target and who made it', async () => {
    const { audit, done } = run({ method: 'POST' });
    await done;
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'a1',
        adminEmail: 'ops@example.com',
        action: 'POST /admin/users/:id/airdrop',
        target: 'u1',
        outcome: 'ok',
        ip: '7.7.7.7',
        detail: expect.objectContaining({ body: { points: 100, note: 'thanks' } }),
      }),
    );
  });

  it('records a change that failed, with why', async () => {
    const { audit, done } = run({ method: 'POST', fail: true });
    await done;
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: 'error',
        detail: expect.objectContaining({ error: { status: 400, message: 'nope' } }),
      }),
    );
  });

  it('skips ordinary reads, but not the ones marked sensitive', async () => {
    const plain = run({ method: 'GET' });
    await plain.done;
    expect(plain.audit.record).not.toHaveBeenCalled();

    const marked = run({ method: 'GET', markedRead: true });
    await marked.done;
    expect(marked.audit.record).toHaveBeenCalled();
  });

  it('leaves non-admin requests alone', async () => {
    const { audit, done } = run({ method: 'POST', admin: false });
    await done;
    expect(audit.record).not.toHaveBeenCalled();
  });
});
