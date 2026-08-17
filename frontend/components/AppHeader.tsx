'use client';

import Link from 'next/link';
import { LogoMark } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

export function AppHeader({
  locale,
  backLabel,
  maxWidth = 'max-w-4xl',
}: {
  locale: string;
  backLabel: string;
  maxWidth?: string;
}) {
  return (
    <header
      className="sticky top-0 z-20 border-b border-white/5 bg-[#05070f]/85 backdrop-blur-xl"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div
        className={`mx-auto flex ${maxWidth} items-center justify-between px-4 py-3.5 sm:px-6`}
      >
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-blue-400"
        >
          ← {backLabel}
        </Link>
        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
          <LogoMark size={32} />
        </div>
      </div>
    </header>
  );
}
