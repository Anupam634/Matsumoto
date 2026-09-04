import { TtlCache } from './ttl-cache';

const tick = () => new Promise((r) => setImmediate(r));

describe('TtlCache', () => {
  it('serves a cached value within the TTL', async () => {
    const load = jest.fn().mockResolvedValue('v');
    const cache = new TtlCache(10_000);

    expect(await cache.wrap('k', load)).toBe('v');
    expect(await cache.wrap('k', load)).toBe('v');
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reloads once the TTL has passed', async () => {
    const load = jest.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two');
    const cache = new TtlCache(0);

    expect(await cache.wrap('k', load)).toBe('one');
    expect(await cache.wrap('k', load)).toBe('two');
  });

  it('collapses concurrent misses into a single load', async () => {
    // The case that matters: many dashboards hitting a cold key at once must
    // not each run the aggregate.
    const load = jest.fn().mockResolvedValue('v');
    const cache = new TtlCache(10_000);

    const all = await Promise.all([
      cache.wrap('k', load),
      cache.wrap('k', load),
      cache.wrap('k', load),
    ]);

    expect(all).toEqual(['v', 'v', 'v']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('does not cache a rejection', async () => {
    const load = jest
      .fn()
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValueOnce('recovered');
    const cache = new TtlCache(10_000);

    await expect(cache.wrap('k', load)).rejects.toThrow('db down');
    await tick();
    expect(await cache.wrap('k', load)).toBe('recovered');
  });

  it('stays bounded when keys carry a user id', async () => {
    const cache = new TtlCache(10_000, 10);
    for (let i = 0; i < 100; i++) {
      await cache.wrap(`me:${i}`, async () => i);
    }
    // Nothing has expired, so eviction has to fall back to dropping the
    // oldest — otherwise the map grows with the number of callers.
    expect(await cache.wrap('me:99', async () => -1)).toBe(99);
    expect(await cache.wrap('me:0', async () => -1)).toBe(-1);
  });

  it('invalidates by prefix', async () => {
    const cache = new TtlCache(10_000);
    await cache.wrap('board:a', async () => 1);
    await cache.wrap('me:a', async () => 1);

    cache.invalidate('board:');

    expect(await cache.wrap('board:a', async () => 2)).toBe(2);
    expect(await cache.wrap('me:a', async () => 2)).toBe(1);
  });
});
