'use client';

import React from 'react';

export function ReferralsAdminTab() {
  const tiers = [
    { level: 1, invites: '1 – 4 Direct Invites', multiplier: '1.0× Base Rate', bonusCommission: '10% Tier 1' },
    { level: 2, invites: '5 – 9 Direct Invites', multiplier: '1.2× Boost Multiplier', bonusCommission: '12% Tier 1 + 5% Tier 2' },
    { level: 3, invites: '10 – 19 Direct Invites', multiplier: '1.5× Boost Multiplier', bonusCommission: '15% Tier 1 + 6% Tier 2 + 3% Tier 3' },
    { level: 4, invites: '20 – 49 Direct Invites', multiplier: '1.8× Boost Multiplier', bonusCommission: '18% Tier 1 + 7% Tier 2 + 4% Tier 3' },
    { level: 5, invites: '50 – 99 Direct Invites', multiplier: '2.2× Boost Multiplier', bonusCommission: '22% Tier 1 + 8% Tier 2 + 5% Tier 3' },
    { level: 6, invites: '100+ Direct Invites (VIP)', multiplier: '3.0× Maximum Multiplier', bonusCommission: '25% Tier 1 + 10% Tier 2 + 6% Tier 3' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">🌲 6-Tier Multi-Level Referral Program Matrix</h2>
          <p className="text-xs text-slate-400">
            Network viral commission rules, tier qualification thresholds, and multiplier distribution
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.level} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 text-xs font-black uppercase text-indigo-300">
                Level {t.level}
              </span>
              <span className="font-mono text-sm font-black text-amber-400">{t.multiplier}</span>
            </div>
            <h3 className="mt-3 text-sm font-bold text-white">{t.invites}</h3>
            <p className="mt-2 text-xs text-emerald-400 font-mono">{t.bonusCommission}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
