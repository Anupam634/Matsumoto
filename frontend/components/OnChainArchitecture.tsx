'use client';

export function OnChainArchitecture() {
  const specs = [
    { label: 'Blockchain Network', value: 'BNB Smart Chain (BSC)', icon: '⛓️' },
    { label: 'Token Standard', value: 'BEP-20 Standard', icon: '💎' },
    { label: 'Point-to-Token Ratio', value: '3 Points = 1 $BONDKOIN', icon: '⚖️' },
    { label: 'Total Supply', value: '900 Million Fixed', icon: '🔒' },
    { label: 'Distribution Model', value: 'Inflation-Capped Mining', icon: '⛏️' },
    { label: 'Official Domain', value: 'bondkoinlabs.com', icon: '🌐' },
  ];

  const allocations = [
    { name: '⛏️ Mining Community', percent: 30, amount: '270M $BONDKOIN', color: 'bg-amber-400', desc: 'Direct daily 24h cloud mining rewards, booster yields & referral incentives' },
    { name: '🌱 Ecosystem & Growth', percent: 20, amount: '180M $BONDKOIN', color: 'bg-emerald-400', desc: 'Ecosystem expansion, developer grants, partnerships & community bounties' },
    { name: '👥 Core Team & Contributors', percent: 20, amount: '180M $BONDKOIN', color: 'bg-indigo-400', desc: 'Core protocol development, engineers, smart contract security & long-term vesting' },
    { name: '🏛️ Public & Exchange Liquidity', percent: 20, amount: '180M $BONDKOIN', color: 'bg-cyan-400', desc: 'Locked DEX / CEX liquidity pools & market making on BNB Chain pairs' },
    { name: '🤝 Strategic Institutional Partners', percent: 10, amount: '90M $BONDKOIN', color: 'bg-purple-400', desc: 'Institutional staking partners, advisory backing & cross-chain infrastructure' },
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
          <div className="lg:col-span-5 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
              <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
              <span>Tokenomics & Distribution Strategy</span>
            </span>

            <h3 className="text-2xl font-black tracking-tight sm:text-4xl text-slate-100">
              The Economic Engine of{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                BONDKOIN
              </span>
            </h3>

            <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
              The economic engine of the BONDKOIN network is powered by its Native Digital Token <strong>$BONDKOIN</strong>. Distribution architecture is optimized to incentivize early Adopters, sustain network security, and fund ecosystem expansion.
            </p>

            <div className="pt-2 grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="text-slate-500 text-[10px] uppercase font-sans">TOKEN NAME</div>
                <div className="font-bold text-white text-sm">BONDKOIN</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="text-slate-500 text-[10px] uppercase font-sans">TOTAL SUPPLY</div>
                <div className="font-bold text-amber-400 text-sm">900M Fixed</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="text-slate-500 text-[10px] uppercase font-sans">DISTRIBUTION</div>
                <div className="font-bold text-cyan-400 text-sm">Inflation-Capped</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <div className="text-slate-500 text-[10px] uppercase font-sans">CONVERSION RATIO</div>
                <div className="font-bold text-emerald-400 text-sm">3 PTS = 1 $BONDKOIN</div>
              </div>
            </div>
          </div>

          {/* Allocation Progress Bars */}
          <div className="lg:col-span-7 space-y-4">
            {allocations.map((item, idx) => (
              <div key={idx} className="space-y-1.5 rounded-2xl border border-slate-800/80 bg-slate-900/50 p-4 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-bold text-slate-100 text-sm">{item.name}</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400">{item.amount}</span>
                    <span className="font-mono text-sm font-black text-amber-400">{item.percent}%</span>
                  </div>
                </div>
                
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${item.percent}%` }}
                  />
                </div>

                <div className="text-[11px] text-slate-400 leading-normal">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
