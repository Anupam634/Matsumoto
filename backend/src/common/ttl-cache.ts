/**
 * A small in-process cache for expensive read aggregates.
 *
 * Two things it does beyond a plain `Map`:
 *
 *  - **Single-flight.** The *promise* is cached, not the resolved value, so
 *    fifty dashboards landing on a cold key run the query once and share the
 *    answer. Caching only the value means a popular key recomputes once per
 *    concurrent caller at exactly the moment the box is busiest, which is the
 *    opposite of what a cache is for.
 *  - **A real bound.** Eviction sweeps expired entries first and, if that is
 *    not enough, drops the oldest — so the map cannot grow with the number of
 *    distinct callers, which is what happens when the key includes a user id.
 *
 * A rejected load is evicted immediately: a failed query must not be served
 * as the answer for the rest of the TTL.
 *
 * In-process on purpose. It holds derived, non-authoritative data, so two
 * instances disagreeing for a few seconds is fine — anything that must be
 * consistent across instances belongs in Redis or the database.
 */
interface Entry {
  at: number;
  value: Promise<unknown>;
}

export class TtlCache {
  private readonly entries = new Map<string, Entry>();

  constructor(
    private readonly ttlMs: number,
    private readonly maxEntries = 1_000,
  ) {}

  /** Serve `key` from cache, or run `load` and remember it for the TTL. */
  async wrap<T>(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = this.entries.get(key);
    if (hit && now - hit.at < this.ttlMs) return hit.value as Promise<T>;

    const value = load();
    this.entries.set(key, { at: now, value });
    this.evict(now);

    // Don't let a failure stick around as this key's answer.
    value.catch(() => {
      if (this.entries.get(key)?.value === value) this.entries.delete(key);
    });

    return value;
  }

  /** Drop everything, or everything under a key prefix. */
  invalidate(prefix?: string): void {
    if (prefix === undefined) {
      this.entries.clear();
      return;
    }
    for (const key of this.entries.keys()) {
      if (key.startsWith(prefix)) this.entries.delete(key);
    }
  }

  private evict(now: number): void {
    if (this.entries.size <= this.maxEntries) return;

    for (const [key, entry] of this.entries) {
      if (now - entry.at >= this.ttlMs) this.entries.delete(key);
    }
    // Map iterates in insertion order, so the front is the oldest.
    for (const key of this.entries.keys()) {
      if (this.entries.size <= this.maxEntries) break;
      this.entries.delete(key);
    }
  }
}
