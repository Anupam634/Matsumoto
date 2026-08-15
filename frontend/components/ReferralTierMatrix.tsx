'use client';

import { useTranslations } from 'next-intl';

const TIERS = [
  { level: 1, invites: '0', multiplier: 1, color: 'border-slate-700' },
  { level: 2, invites: '1–5', multiplier: 3, color: 'border-blue-500/40' },
  { level: 3, invites: '6–10', multiplier: 4, color: 'border-cyan-500/40' },
  { level: 4, invites: '11–20', multiplier: 5, color: 'border-amber-500/50' },
  { level: 5, invites: '21–30', multiplier: 6, color: 'border-orange-500/60' },
  { level: 6, invites: '31+', multiplier: 8, color: 'border-amber-400', isMax: true },
];

export function ReferralTierMatrix() {
  const t = useTranslations('landing.referrals');

  return (
    <div className="card overflow-hidden p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h3 className="text-xl font-bold text-slate-100">{t('title')}</h3>
          <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
        </div>

        <span className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-semibold text-amber-300">
          🚀 {t('bonusNote')}
        </span>
      </div>

      {/* Tier Grid Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {TIERS.map((tier) => (
          <div
            key={tier.level}
            className={`card card-lift relative flex flex-col justify-between p-4 ${
              tier.isMax
                ? 'ring-2 ring-amber-400 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-300">
                  Level {tier.level}
                </span>
                {tier.isMax && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950">
                    MAX TIER
                  </span>
                )}
              </div>

              <div className="mt-4 text-center">
                <div className="font-mono text-3xl font-black text-amber-400">
                  ×{tier.multiplier}
                </div>
                <div className="mt-1 text-[11px] uppercase font-semibold text-slate-400">
                  {t('multiplier')}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-950/70 p-2.5 text-center">
              <div className="text-[10px] uppercase text-slate-500">{t('invited')}</div>
              <div className="font-mono text-sm font-bold text-slate-200">
                {tier.invites} Miners
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
