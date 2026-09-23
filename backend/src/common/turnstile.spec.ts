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
      await expect(assertHuman('tok', '1.2.3.4')).resolves.toBeUndefined();
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
      await expect(assertHuman('spent')).rejects.toThrow(/check failed/i);
    });

    it('refuses rather than waving callers through when Cloudflare is unreachable', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('network down');
      }) as any;
      await expect(assertHuman('tok')).rejects.toThrow(/try again/i);
    });
  });
});
