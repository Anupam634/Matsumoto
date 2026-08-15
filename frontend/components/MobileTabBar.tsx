'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMiningFX } from '../lib/use-mining-fx';

export function MobileTabBar({
  locale,
  onMine,
  ready = false,
  claiming = false,
}: {
  locale: string;
  onMine?: () => void;
  ready?: boolean;
  claiming?: boolean;
}) {
  const t = useTranslations('dashboard');
  const pathname = usePathname() || '';
  const [clicked, setClicked] = useState(false);
  const { playMiningStrike } = useMiningFX();

  const handleMineClick = () => {
    playMiningStrike();
    setClicked(true);
    setTimeout(() => setClicked(false), 800);
    onMine?.();
  };

  const isDashboard = pathname.endsWith(`/${locale}/dashboard`) || pathname.endsWith(`/${locale}`);
  const isBoosters = pathname.includes('/boosters');
  const isWithdraw = pathname.includes('/withdraw');
  const isProfile = pathname.includes('/profile') || pathname.includes('/kyc') || pathname.includes('/support');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl shadow-2xl"
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobile Navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-3 pt-2">
        {/* 1. Home / Dashboard */}
        <Link
          href={`/${locale}/dashboard`}
          className={`flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            isDashboard
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${
            isDashboard ? 'bg-amber-500/15 text-amber-400 scale-105' : ''
          }`}>
            <IconHome />
          </div>
          <span className="text-[10px] font-bold tracking-tight">
            {t('navDashboard')}
          </span>
        </Link>

        {/* 2. Boosters */}
        <Link
          href={`/${locale}/boosters`}
          className={`flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            isBoosters
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${
            isBoosters ? 'bg-amber-500/15 text-amber-400 scale-105' : ''
          }`}>
            <IconRocket />
          </div>
          <span className="text-[10px] font-bold tracking-tight">
            {t('navBoosters')}
          </span>
        </Link>

        {/* 3. Center Mining Action Button (FAB) */}
        <div className="relative flex flex-col items-center justify-center -mt-6">
          {clicked && <div className="mine-shockwave" />}
          {onMine ? (
            <button
              type="button"
              onClick={handleMineClick}
              disabled={!ready}
              aria-label={t('mineButton')}
              className={`relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-xl shadow-amber-500/40 ring-4 ring-slate-950 transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:grayscale ${
                ready ? 'animate-bounce shadow-2xl shadow-amber-400/60' : ''
              }`}
            >
              {claiming ? (
                <IconSpinner />
              ) : (
                <span className="text-2xl drop-shadow-md">⚡</span>
              )}
            </button>
          ) : (
            <Link
              href={`/${locale}/dashboard`}
              onClick={playMiningStrike}
              aria-label={t('mineButton')}
              className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 text-slate-950 shadow-xl shadow-amber-500/40 ring-4 ring-slate-950 transition-all duration-200 active:scale-95"
            >
              <span className="text-2xl drop-shadow-md">⚡</span>
            </Link>
          )}
          <span className="mt-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
            {t('mineButton')}
          </span>
        </div>

        {/* 4. Withdraw */}
        <Link
          href={`/${locale}/withdraw`}
          className={`flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            isWithdraw
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${
            isWithdraw ? 'bg-amber-500/15 text-amber-400 scale-105' : ''
          }`}>
            <IconSwap />
          </div>
          <span className="text-[10px] font-bold tracking-tight">
            {t('navWithdraw')}
          </span>
        </Link>

        {/* 5. Profile */}
        <Link
          href={`/${locale}/profile`}
          className={`flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            isProfile
              ? 'text-amber-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`grid h-7 w-7 place-items-center rounded-xl transition-all ${
            isProfile ? 'bg-amber-500/15 text-amber-400 scale-105' : ''
          }`}>
            <IconUser />
          </div>
          <span className="text-[10px] font-bold tracking-tight">
            {t('navProfile')}
          </span>
        </Link>
      </div>
    </nav>
  );
}

function IconHome() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 3h5v5" />
      <path d="m21 3-7 7" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 7-7" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="animate-spin text-slate-950" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
