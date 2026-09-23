/**
 * Bounded concurrency for fan-out queries.
 *
 * The admin dashboard fires a dozen aggregates through one `Promise.all`,
 * which asks the connection pool for a dozen connections at once. The pool
 * holds ten, so the dashboard alone could exhaust it — and anything needing a
 * transaction then failed with "Unable to start a transaction in the given
 * time" while the dashboard waited on itself.
 *
 * Wrapping each query in a gate keeps the fan-out inside the pool's budget
 * without changing how the caller reads: still one `Promise.all`, still the
 * same destructuring, just never more than `limit` in flight.
 */
export type Gate = <T>(task: () => Promise<T>) => Promise<T>;

export function createGate(limit: number): Gate {
  const max = Math.max(1, Math.floor(limit));
  let active = 0;
  const waiting: (() => void)[] = [];

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return <T>(task: () => Promise<T>): Promise<T> => {
    const run = async (): Promise<T> => {
      active++;
      try {
        return await task();
      } finally {
        release();
      }
    };

    if (active < max) return run();
    // Queued tasks start in the order they were handed over, so a fan-out
    // does not reorder itself under load.
    return new Promise<void>((resolve) => waiting.push(resolve)).then(run);
  };
}
