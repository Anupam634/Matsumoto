'use client';

import { useTranslations } from 'next-intl';

const TIERS = [
  { level: 1, invites: '0', multiplier: 1 },
  { level: 2, invites: '1–5', multiplier: 3 },
  { level: 3, invites: '6–10', multiplier: 4 },
  { level: 4, invites: '11–20', multiplier: 5 },
  { level: 5, invites: '21–30', multiplier: 6 },
  { level: 6, invites: '31+', multiplier: 8, isMax: true },
];

export function ReferralTierMatrix() {
  const t = useTranslations('landing.referrals');

  return (
    <div className="glass-panel p-6 sm:p-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <h3 className="text-2xl font-black text-slate-100">{t('title')}</h3>
          <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
        </div>

        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-bold text-amber-300 backdrop-blur-md">
          🚀 {t('bonusNote')}
        </span>
      </div>

      {/* Tier Grid Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {TIERS.map((tier) => (
          <div
            key={tier.level}
            className={`card card-lift relative flex flex-col justify-between p-5 ${
              tier.isMax
                ? 'border-amber-400/60 bg-gradient-to-b from-amber-950/40 to-slate-900 shadow-xl shadow-amber-500/10'
                : 'border-white/[0.08] bg-slate-950/60'
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-white/[0.06] border border-white/[0.08] px-2.5 py-0.5 font-mono text-[11px] font-extrabold text-slate-300">
                  Level {tier.level}
                </span>
                {tier.isMax && (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-black text-slate-950">
                    MAX TIER
                  </span>
                )}
              </div>

              <div className="mt-5 text-center">
                <div className="font-mono text-3xl font-black text-amber-400">
                  ×{tier.multiplier}
                </div>
                <div className="mt-1 text-[11px] uppercase font-bold text-slate-400">
                  {t('multiplier')}
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl bg-slate-900/80 border border-white/[0.06] p-2.5 text-center">
              <div className="text-[10px] uppercase text-slate-500 font-bold">{t('invited')}</div>
              <div className="font-mono text-sm font-extrabold text-slate-200 mt-0.5">
                {tier.invites} Miners
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
