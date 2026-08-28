import { Logger } from '@nestjs/common';
import { FailSoftOtpStore, MemoryOtpStore, OtpStore } from './otp.store';

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

describe('FailSoftOtpStore', () => {
  /** A store whose every method rejects — a Redis that is down. */
  const brokenStore = (): OtpStore => {
    const fail = () => Promise.reject(new Error('ECONNREFUSED'));
    return {
      put: fail,
      take: fail,
      drop: fail,
      allowSend: fail,
    } as unknown as OtpStore;
  };

  const quietLogger = () => {
    const logger = new Logger('test');
    jest.spyOn(logger, 'error').mockImplementation(() => undefined);
    jest.spyOn(logger, 'log').mockImplementation(() => undefined);
    return logger;
  };

  it('serves codes from memory when the primary store is down', async () => {
    const store = new FailSoftOtpStore(brokenStore(), quietLogger());

    // This is the production 500: every one of these used to throw.
    await store.put('a@example.com', {
      code: '123456',
      expiresAt: Date.now() + 60_000,
      purpose: 'signup',
    });
    expect((await store.take('a@example.com'))?.code).toBe('123456');
    expect(await store.allowSend('a@example.com', 1, 600_000)).toBe(true);
    await store.drop('a@example.com');
  });

  it('still caps sends per address while degraded', async () => {
    const store = new FailSoftOtpStore(brokenStore(), quietLogger());

    expect(await store.allowSend('victim@example.com', 2, 600_000)).toBe(true);
    expect(await store.allowSend('victim@example.com', 2, 600_000)).toBe(true);
    expect(await store.allowSend('victim@example.com', 2, 600_000)).toBe(false);
  });

  it('reports the outage once, not once per request', async () => {
    const logger = quietLogger();
    const store = new FailSoftOtpStore(brokenStore(), logger);

    await store.allowSend('a@example.com', 3, 600_000);
    await store.allowSend('b@example.com', 3, 600_000);

    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('stops calling a failed primary until the retry window passes', async () => {
    const primary = brokenStore();
    const spy = jest.spyOn(primary, 'allowSend');
    const store = new FailSoftOtpStore(primary, quietLogger(), 10_000);

    await store.allowSend('a@example.com', 3, 600_000);
    await store.allowSend('a@example.com', 3, 600_000);

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('goes back to the primary once it answers again', async () => {
    const memory = new MemoryOtpStore();
    let broken = true;
    const primary: OtpStore = {
      put: (...args) =>
        broken ? Promise.reject(new Error('down')) : memory.put(...args),
      take: (...args) =>
        broken ? Promise.reject(new Error('down')) : memory.take(...args),
      drop: (...args) =>
        broken ? Promise.reject(new Error('down')) : memory.drop(...args),
      allowSend: (...args) =>
        broken ? Promise.reject(new Error('down')) : memory.allowSend(...args),
    };
    const store = new FailSoftOtpStore(primary, quietLogger(), 0);

    await store.allowSend('a@example.com', 3, 600_000);
    broken = false;
    await store.put('a@example.com', {
      code: '654321',
      expiresAt: Date.now() + 60_000,
      purpose: 'signup',
    });

    expect((await memory.take('a@example.com'))?.code).toBe('654321');
  });
});
