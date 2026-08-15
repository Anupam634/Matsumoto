'use client';

import { useTranslations } from 'next-intl';

export function NetworkStatusBar() {
  const t = useTranslations('landing.network');

  return (
    <div className="border-b border-white/[0.08] bg-slate-950/90 px-4 py-2 text-xs backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>{t('mainnetStatus')}</span>
          </div>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span className="hidden text-slate-300 font-medium sm:inline">{t('chain')}</span>
          <span className="hidden text-slate-700 sm:inline">|</span>
          <span className="font-mono text-cyan-400 font-semibold">{t('tokenStandard')}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden md:inline text-amber-300 font-mono font-semibold">
            {t('baseRateSpec')}
          </span>
          <span className="hidden md:inline text-slate-700">|</span>
          <span className="text-slate-300 font-mono">
            <span className="font-bold text-emerald-400">{t('conversionSpec')}</span>
          </span>
          <span className="hidden sm:inline rounded-full bg-amber-500/10 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-300 border border-amber-500/30">
            {t('minWithdrawalSpec')}
          </span>
        </div>
      </div>
    </div>
  );
}
