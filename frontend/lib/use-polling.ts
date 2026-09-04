'use client';

import { useEffect, useRef } from 'react';

/**
 * Run `fn` every `intervalMs`, but only while the tab is actually being
 * looked at.
 *
 * A plain `setInterval` keeps firing in a backgrounded tab, so a phone left on
 * the dashboard overnight spent the night polling — and every one of those
 * requests is a fan-out of database reads on the server. Browsers already
 * throttle background timers, but not to zero, and not predictably.
 *
 * Two things fall out of pausing properly: a tab that comes back to the
 * foreground refreshes immediately rather than showing stale numbers until
 * the next tick, and an idle tab costs nothing.
 */
export function usePolling(fn: () => void, intervalMs: number) {
  // Keep the latest callback without restarting the timer on every render —
  // `load` is usually a new function identity each time the component renders.
  const saved = useRef(fn);
  useEffect(() => {
    saved.current = fn;
  }, [fn]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (timer === null) timer = setInterval(() => saved.current(), intervalMs);
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        // Catch up on whatever was missed while hidden, then resume.
        saved.current();
        start();
      }
    };

    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [intervalMs]);
}
