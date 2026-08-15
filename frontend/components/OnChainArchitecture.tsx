'use client';

import { useTranslations } from 'next-intl';

export function OnChainArchitecture() {
  const t = useTranslations('landing.architecture');

  const specs = [
    { label: 'Blockchain Network', value: 'BNB Smart Chain (BSC)', icon: '⛓️' },
    { label: 'Token Standard', value: 'BEP-20 Standard', icon: '💎' },
    { label: 'Point-to-Token Ratio', value: '3 Points = 1 $MATSU', icon: '⚖️' },
    { label: 'Settlement Engine', value: 'Scheduled Smart Contract Payout', icon: '⚡' },
    { label: 'Minimum Withdrawal', value: '100 Matsumoto Points', icon: '🎯' },
    { label: 'Target Listing Milestone', value: '500,000 Active Users', icon: '🚀' },
  ];

  const allocations = [
    { name: 'Community Cloud Mining Accrual', percent: 70, color: 'bg-amber-400', desc: 'Direct daily tap-to-earn rewards & booster yield' },
    { name: 'DEX & CEX Liquidity Pool', percent: 15, color: 'bg-cyan-400', desc: 'Locked liquidity for BNB Chain trading pairs' },
    { name: 'Cloud Infrastructure & Security', percent: 10, color: 'bg-indigo-400', desc: 'Cluster servers, Redis rate-limiting & anti-abuse' },
    { name: 'Referral & Social Bounties', percent: 5, color: 'bg-emerald-400', desc: 'Syndicate multiplier rewards & quest bounties' },
  ];

  return (
    <div className="space-y-12">
      {/* 3D Glass Specs Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specs.map((spec, i) => (
          <div
            key={i}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-slate-900/40 p-6 backdrop-blur-2xl transition-all duration-300 hover:border-amber-400/40 hover:bg-slate-900/60 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl transition-opacity group-hover:opacity-100" />
            
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-xl">
                {spec.icon}
              </span>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {spec.label}
                </span>
                <h4 className="mt-0.5 font-mono text-base font-extrabold text-slate-100">
                  {spec.value}
                </h4>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Transparent Tokenomics & Distribution Architecture */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-slate-950/90 via-slate-900/40 to-slate-950/90 p-8 sm:p-12 shadow-2xl backdrop-blur-2xl">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-6 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span>BEP-20 Tokenomics Architecture</span>
            </span>

            <h3 className="text-2xl font-black tracking-tight sm:text-4xl text-slate-100">
              Mathematically Guaranteed{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                Fair Distribution
              </span>
            </h3>

            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              The Matsumoto reward engine strictly couples daily user participation with verified on-chain payouts on BNB Smart Chain. No hidden pre-mines, no speculative hardware fees.
            </p>

            <div className="pt-2 flex flex-wrap gap-4 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                <span className="text-slate-500">CONVERSION: </span>
                <span className="font-bold text-amber-400">3 PTS = 1 $MATSU</span>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5">
                <span className="text-slate-500">PAYOUT NETWORK: </span>
                <span className="font-bold text-cyan-400">BNB SMART CHAIN</span>
              </div>
            </div>
          </div>

          {/* Allocation Progress Bars */}
          <div className="lg:col-span-6 space-y-5">
            {allocations.map((item, idx) => (
              <div key={idx} className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-200">{item.name}</div>
                  <div className="font-mono text-sm font-black text-amber-400">{item.percent}%</div>
                </div>
                
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-400">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
