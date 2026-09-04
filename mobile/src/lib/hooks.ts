import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import type { MiningStatus } from '../api/endpoints';

/** How often the live accrual counter repaints. 10fps reads as smooth. */
const TICK_MS = 100;

/**
 * The pending-points counter, extrapolated between polls.
 *
 * The server is polled every 20 seconds; in between, points are projected from
 * the last known figure at the current rate and clamped at the 24-hour ceiling,
 * so the number moves continuously without ever overstating what the server
 * would actually pay.
 */
export function useLiveAccrual(status: MiningStatus | null): number {
  const [pending, setPending] = useState(status?.pendingPoints ?? 0);
  const anchor = useRef({ at: Date.now(), base: status?.pendingPoints ?? 0 });

  useEffect(() => {
    if (!status) return;
    anchor.current = { at: Date.now(), base: status.pendingPoints };
    setPending(status.pendingPoints);
  }, [status?.pendingPoints, status]);

  useEffect(() => {
    if (!status) return;
    const perMs = status.ratePerHour / 3_600_000;
    const cap = status.maxPendingPoints;
    const id = setInterval(() => {
      // Only animate while visible: a timer firing at 10Hz behind a locked
      // screen is pure battery burn, and the value is recomputed on resume.
      if (AppState.currentState !== 'active') return;
      const { at, base } = anchor.current;
      setPending(Math.min(cap, base + (Date.now() - at) * perMs));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status?.ratePerHour, status?.maxPendingPoints, status]);

  return pending;
}

/** Eases a number towards a new target, so balances roll rather than jump. */
export function useCountUp(target: number, duration = 800): number {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);
  const raf = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const origin = from.current;
    if (origin === target) return;

    const start = Date.now();
    if (raf.current) clearInterval(raf.current);
    raf.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(origin + (target - origin) * eased);
      if (p >= 1) {
        from.current = target;
        if (raf.current) clearInterval(raf.current);
        raf.current = null;
      }
    }, 16);

    return () => {
      if (raf.current) clearInterval(raf.current);
      raf.current = null;
      from.current = target;
    };
  }, [target, duration]);

  return display;
}

/** A value that re-renders once a second, for live countdowns. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') setNow(Date.now());
    }, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Load-once-and-refresh helper for screens with their own endpoint.
 *
 * Returns the data, an error already surfaced as a string, and a `reload` that
 * can be wired straight to pull-to-refresh.
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  toMessage: (err: unknown) => string,
): {
  data: T | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  reload: (opts?: { silent?: boolean }) => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
} {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setRefreshing(true);
      try {
        const next = await loader();
        if (!mounted.current) return;
        setData(next);
        setError(null);
      } catch (err) {
        if (!mounted.current) return;
        setError(toMessage(err));
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [loader, toMessage],
  );

  useEffect(() => {
    void reload({ silent: true });
  }, [reload]);

  return { data, error, loading, refreshing, reload, setData };
}
