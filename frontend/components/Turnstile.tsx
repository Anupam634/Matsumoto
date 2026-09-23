'use client';

import { useEffect, useRef } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * Renders nothing at all when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset, so the
 * site works unchanged until the key is configured — the backend is gated on
 * its own key the same way.
 *
 * A token is single use and expires, so the parent must treat it as spent
 * after one submit; `resetKey` re-renders the widget to fetch a fresh one.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

declare global {
  interface Window {
    turnstile?: {
      render(el: HTMLElement, opts: Record<string, unknown>): string;
      reset(id: string): void;
      remove(id: string): void;
    };
  }
}

export const turnstileConfigured = !!SITE_KEY;

let scriptLoading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = SCRIPT_SRC;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptLoading = null;
        reject(new Error('Could not load the anti-bot check.'));
      };
      document.head.appendChild(el);
    });
  }
  return scriptLoading;
}

export function Turnstile({
  action,
  onToken,
  onError,
  resetKey = 0,
}: {
  /** Which flow this solve is for; the backend checks it matches. */
  action: string;
  onToken: (token: string | null) => void;
  onError?: (message: string) => void;
  /** Change this to discard the spent token and ask for a fresh one. */
  resetKey?: number;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Keep the latest callbacks without re-rendering the widget on every keystroke.
  const cb = useRef({ onToken, onError });
  cb.current = { onToken, onError };

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !holder.current || !window.turnstile) return;
        cb.current.onToken(null);
        widgetId.current = window.turnstile.render(holder.current, {
          sitekey: SITE_KEY,
          action,
          theme: 'dark',
          callback: (token: string) => cb.current.onToken(token),
          // Both mean the token we hold is no longer usable.
          'expired-callback': () => cb.current.onToken(null),
          'error-callback': () => {
            cb.current.onToken(null);
            cb.current.onError?.('The anti-bot check failed to load. Please refresh and try again.');
          },
        });
      })
      .catch((err: Error) => cb.current.onError?.(err.message));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action]);

  // A spent token is cleared by resetting the existing widget rather than
  // tearing it down, so the box doesn't flicker between attempts.
  useEffect(() => {
    if (!resetKey || !widgetId.current || !window.turnstile) return;
    window.turnstile.reset(widgetId.current);
    cb.current.onToken(null);
  }, [resetKey]);

  if (!SITE_KEY) return null;
  return <div ref={holder} className="mt-2 flex justify-center" />;
}
