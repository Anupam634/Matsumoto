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
  const isMarketplace = pathname.includes('/marketplace');
  const isWithdraw = pathname.includes('/withdraw');
  const isProfile = pathname.includes('/profile') || pathname.includes('/kyc') || pathname.includes('/support');

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-white/10 bg-slate-950/95 backdrop-blur-2xl shadow-2xl"
      style={{ paddingBottom: 'max(0.6rem, env(safe-area-inset-bottom))' }}
      aria-label="Mobile Navigation"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-2">
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

        {/* 3. Marketplace (New Ecosystem Feature) */}
        <Link
          href={`/${locale}/marketplace`}
          className={`relative flex flex-col items-center justify-center gap-1 text-center transition-colors ${
            isMarketplace
              ? 'text-cyan-400 font-extrabold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className={`relative grid h-7 w-7 place-items-center rounded-xl transition-all ${
            isMarketplace ? 'bg-cyan-500/20 text-cyan-300 scale-105 ring-1 ring-cyan-400/40' : ''
          }`}>
            <IconMarket />
            <span className="absolute -top-1 -right-1 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
            </span>
          </div>
          <span className="text-[10px] font-bold tracking-tight text-cyan-300">
            Market
          </span>
        </Link>

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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
      <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
      <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
    </svg>
  );
}

function IconMarket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  );
}

function IconSwap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
