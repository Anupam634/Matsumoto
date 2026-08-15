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
        className="btn-primary px-4 py-2 text-sm"
      >
        {dashboardLabel} →
      </Link>
    );
  }
  return (
    <>
      <Link
        href={`/${locale}/login`}
        className="whitespace-nowrap text-slate-600 hover:text-indigo-600"
      >
        {signInLabel}
      </Link>
      <Link
        href={`/${locale}/login?mode=register`}
        className="btn-primary whitespace-nowrap px-4 py-2 text-sm"
      >
        {getStartedLabel} →
      </Link>
    </>
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
      className={className}
    >
      {authed ? dashboardLabel : label} →
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
