import { MemoryOtpStore } from './otp.store';

describe('MemoryOtpStore', () => {
  it('round-trips a code and drops it once taken', async () => {
    const store = new MemoryOtpStore();
    await store.put('a@example.com', {
      code: '123456',
      expiresAt: Date.now() + 60_000,
      purpose: 'signup',
    });

    expect((await store.take('a@example.com'))?.code).toBe('123456');
    await store.drop('a@example.com');
    expect(await store.take('a@example.com')).toBeNull();
  });

  it('treats an expired code as absent', async () => {
    const store = new MemoryOtpStore();
    await store.put('a@example.com', {
      code: '123456',
      expiresAt: Date.now() - 1,
      purpose: 'signup',
    });
    expect(await store.take('a@example.com')).toBeNull();
  });

  it('caps how many codes one address can be sent', async () => {
    const store = new MemoryOtpStore();
    const send = () => store.allowSend('victim@example.com', 3, 600_000);

    expect(await send()).toBe(true);
    expect(await send()).toBe(true);
    expect(await send()).toBe(true);
    // The fourth is the mail-bombing attempt this exists to stop.
    expect(await send()).toBe(false);
  });

  it('counts each address separately', async () => {
    const store = new MemoryOtpStore();
    await store.allowSend('a@example.com', 1, 600_000);

    expect(await store.allowSend('a@example.com', 1, 600_000)).toBe(false);
    expect(await store.allowSend('b@example.com', 1, 600_000)).toBe(true);
  });

  it('lets the allowance recover once the window passes', async () => {
    const store = new MemoryOtpStore();
    expect(await store.allowSend('a@example.com', 1, 20)).toBe(true);
    expect(await store.allowSend('a@example.com', 1, 20)).toBe(false);

    await new Promise((r) => setTimeout(r, 30));
    expect(await store.allowSend('a@example.com', 1, 20)).toBe(true);
  });
});
