'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getToken } from '../lib/api';

/**
 * Whether a miner session exists in this browser.
 *
 * The landing page is statically generated, so the server has no idea who
 * the visitor is — the JWT lives in localStorage. This starts as `false` so
 * the first client render matches the prerendered HTML exactly (no hydration
 * mismatch), then flips after mount if a token is present.
 */
function useIsAuthed(): boolean {
  const [authed, setAuthed] = useState(false);
  useEffect(() => setAuthed(!!getToken()), []);
  return authed;
}

/**
 * Nav pair. Signed out shows "Sign in" + "Get started"; signed in collapses
 * to a single link through to the dashboard, so a logged-in visitor isn't
 * invited to create a second account.
 */
export function NavAuth({
  locale,
  signInLabel,
  getStartedLabel,
  dashboardLabel,
}: {
  locale: string;
  signInLabel: string;
  getStartedLabel: string;
  dashboardLabel: string;
}) {
  const authed = useIsAuthed();

  if (authed) {
    return (
      <Link
        href={`/${locale}/dashboard`}
        className="btn-gold inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition-all hover:scale-105"
      >
        <span>{dashboardLabel}</span>
        <span className="text-sm font-bold">→</span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
      <Link
        href={`/${locale}/login`}
        className="hidden sm:inline-flex items-center whitespace-nowrap text-xs font-bold uppercase tracking-wider text-slate-300 hover:text-blue-400 transition"
      >
        {signInLabel}
      </Link>
      <Link
        href={`/${locale}/login?mode=register`}
        className="btn-gold inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition-all hover:scale-105"
      >
        <span>{getStartedLabel}</span>
        <span className="text-sm font-bold">→</span>
      </Link>
    </div>
  );
}

/**
 * A call-to-action that points at signup while signed out and at the
 * dashboard once signed in.
 */
export function AuthAwareCta({
  locale,
  href,
  className,
  label,
  dashboardLabel,
}: {
  locale: string;
  /** Where to send a signed-out visitor. */
  href: string;
  className?: string;
  label: string;
  dashboardLabel: string;
}) {
  const authed = useIsAuthed();
  return (
    <Link
      href={authed ? `/${locale}/dashboard` : href}
      className={`inline-flex items-center justify-center gap-2 text-center transition-all ${className ?? ''}`}
    >
      <span>{authed ? dashboardLabel : label}</span>
      <span className="text-base leading-none font-bold">→</span>
    </Link>
  );
}

/**
 * Wrapper that hides its children once the visitor is signed in — used for
 * the "I already have an account" secondary CTA, which is meaningless then.
 */
export function HideWhenAuthed({ children }: { children: React.ReactNode }) {
  const authed = useIsAuthed();
  if (authed) return null;
  return <>{children}</>;
}
