'use client';

import Link from 'next/link';
import { LogoMark } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * The sticky header shared by every secondary screen (boosters, KYC,
 * profile, withdraw): a way back to the dashboard on one side, the mark on
 * the other. The dashboard itself has its own header with full navigation.
 */
export function AppHeader({
  locale,
  backLabel,
  maxWidth = 'max-w-4xl',
}: {
  locale: string;
  backLabel: string;
  /** Match the page's own container so the header lines up with its content. */
  maxWidth?: string;
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-white/5 bg-[#05070f]/85 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-3.5 sm:px-6`}
      >
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-indigo-300"
        >
          ← {backLabel}
        </Link>
        <span className="flex items-center gap-2.5">
          <LocaleSwitcher locale={locale} />
          <LogoMark size={32} />
        </span>
      </div>
    </header>
  );
}
