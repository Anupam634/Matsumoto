import { BadRequestException } from '@nestjs/common';
import { assertHuman, turnstileEnabled } from './turnstile';

describe('turnstile', () => {
  const realFetch = global.fetch;
  const saved = process.env.TURNSTILE_SECRET_KEY;

  afterEach(() => {
    global.fetch = realFetch;
    process.env.TURNSTILE_SECRET_KEY = saved;
    jest.restoreAllMocks();
  });

  function mockVerify(body: unknown) {
    const fetchMock = jest.fn(
      async (_url: string, _init: { body: URLSearchParams }) =>
        ({ json: async () => body }) as any,
    );
    global.fetch = fetchMock as any;
    return fetchMock;
  }

  it('is disabled, and lets everything through, without a secret', async () => {
    delete process.env.TURNSTILE_SECRET_KEY;
    const fetchMock = mockVerify({ success: false });
    expect(turnstileEnabled()).toBe(false);
    await expect(assertHuman(undefined)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('with a secret set', () => {
    beforeEach(() => {
      process.env.TURNSTILE_SECRET_KEY = 'secret';
    });

    it('accepts a token Cloudflare confirms, and forwards the caller IP', async () => {
      const fetchMock = mockVerify({ success: true });
      await expect(assertHuman('tok', { ip: '1.2.3.4', action: 'signup' })).resolves.toBeUndefined();
      const body = fetchMock.mock.calls[0]![1].body;
      expect(body.get('response')).toBe('tok');
      expect(body.get('remoteip')).toBe('1.2.3.4');
      expect(body.get('secret')).toBe('secret');
    });

    it('rejects a missing token without calling Cloudflare', async () => {
      const fetchMock = mockVerify({ success: true });
      await expect(assertHuman(undefined)).rejects.toThrow(BadRequestException);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('rejects a token Cloudflare refuses', async () => {
      mockVerify({ success: false, 'error-codes': ['timeout-or-duplicate'] });
      await expect(assertHuman('spent', { action: 'signup' })).rejects.toThrow(/check failed/i);
    });

    it('refuses rather than waving callers through when Cloudflare is unreachable', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('network down');
      }) as any;
      await expect(assertHuman('tok', { action: 'signup' })).rejects.toThrow(/try again/i);
    });
  });
});

describe('turnstile action and hostname checks', () => {
  const savedSecret = process.env.TURNSTILE_SECRET_KEY;
  const savedHosts = process.env.TURNSTILE_HOSTNAMES;
  const realFetch = global.fetch;

  beforeEach(() => {
    process.env.TURNSTILE_SECRET_KEY = 'secret';
  });
  afterEach(() => {
    process.env.TURNSTILE_SECRET_KEY = savedSecret;
    process.env.TURNSTILE_HOSTNAMES = savedHosts;
    global.fetch = realFetch;
  });

  const verifyReturns = (body: unknown) => {
    global.fetch = jest.fn(async () => ({ json: async () => body })) as any;
  };

  it('refuses a solution minted for another flow', async () => {
    verifyReturns({ success: true, action: 'password-reset' });
    await expect(assertHuman('tok', { action: 'signup' })).rejects.toThrow(/check failed/i);
  });

  it('refuses a solution from a hostname that is not ours', async () => {
    process.env.TURNSTILE_HOSTNAMES = 'bondkoinlabs.com,www.bondkoinlabs.com';
    verifyReturns({ success: true, action: 'signup', hostname: 'attacker.example' });
    await expect(assertHuman('tok', { action: 'signup' })).rejects.toThrow(/check failed/i);
  });

  it('accepts our own hostname, case-insensitively', async () => {
    process.env.TURNSTILE_HOSTNAMES = 'bondkoinlabs.com';
    verifyReturns({ success: true, action: 'signup', hostname: 'BondKoinLabs.com' });
    await expect(assertHuman('tok', { action: 'signup' })).resolves.toBeUndefined();
  });

  it('skips the hostname check when no list is configured', async () => {
    delete process.env.TURNSTILE_HOSTNAMES;
    verifyReturns({ success: true, action: 'signup', hostname: 'anything.example' });
    await expect(assertHuman('tok', { action: 'signup' })).resolves.toBeUndefined();
  });
});
