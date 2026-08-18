'use client';

import React from 'react';
import type { AdminStats } from '../../lib/admin-api';

export function BoostersAdminTab({ stats }: { stats: AdminStats | null }) {
  const plans = [
    { name: 'Bronze Node Booster', price: '$1.00', bonus: '+2.0 BONDKOIN/h', duration: '30 Days', activeSales: 18 },
    { name: 'Silver Quantum Booster', price: '$5.00', bonus: '+5.0 BONDKOIN/h', duration: '30 Days', activeSales: 12 },
    { name: 'Gold Stellar Booster', price: '$10.00', bonus: '+12.0 BONDKOIN/h', duration: '30 Days', activeSales: 6 },
    { name: 'Platinum Nebula Booster', price: '$50.00', bonus: '+65.0 BONDKOIN/h', duration: '30 Days', activeSales: 2 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">💼 Hashrate Booster Plans & Revenue</h2>
          <p className="text-xs text-slate-400">
            On-chain BEP-20 auto-verified booster purchases and active subscription tracking
          </p>
        </div>
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 px-3.5 py-1.5 font-mono text-xs text-amber-400 font-bold">
          Active Boosters: {stats?.boostersActive ?? 0}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p, i) => (
          <div key={i} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-slate-400">{p.duration}</span>
              <span className="font-mono text-lg font-black text-amber-400">{p.price}</span>
            </div>
            <h3 className="mt-3 font-bold text-white">{p.name}</h3>
            <div className="mt-1 font-mono text-xs font-semibold text-emerald-400">{p.bonus}</div>
            <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
              Active Subscriptions: <strong className="text-white">{p.activeSales} miners</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
