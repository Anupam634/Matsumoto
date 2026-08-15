'use client';

import { useTranslations } from 'next-intl';

export function NetworkStatusBar() {
  const t = useTranslations('landing.network');

  return (
    <div className="border-b border-amber-500/20 bg-slate-950/80 px-4 py-2 text-xs backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-slate-300">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-medium text-amber-400">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>{t('mainnetStatus')}</span>
          </div>
          <span className="hidden text-slate-600 sm:inline">|</span>
          <span className="hidden text-slate-400 sm:inline">{t('chain')}</span>
          <span className="hidden text-slate-600 sm:inline">|</span>
          <span className="font-mono text-cyan-400">{t('blockHeight')}</span>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <span className="hidden md:inline text-amber-300/90 font-medium">
            {t('poolHashrate')}
          </span>
          <span className="hidden md:inline text-slate-600">|</span>
          <span className="text-slate-300">
            <span className="font-semibold text-emerald-400">{t('activeMinersCount')}</span>
          </span>
          <span className="hidden sm:inline rounded bg-amber-500/10 px-2 py-0.5 font-mono text-amber-300 border border-amber-500/30">
            {t('gasPrice')}
          </span>
        </div>
      </div>
    </div>
  );
}
