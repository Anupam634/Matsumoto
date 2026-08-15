'use client';

import React, { useMemo } from 'react';
import type { AdminStats } from '../../lib/admin-api';
import { countryFlag, countryName } from '../../lib/countries';

interface AnalyticsTabProps {
  stats: AdminStats | null;
  onRefresh: () => void;
}

export function AnalyticsTab({ stats, onRefresh }: AnalyticsTabProps) {
  const totalBalance = stats?.totalBalancePoints ?? 0;
  const tokenEquivalent = totalBalance / 3;
  const estUsdValue = tokenEquivalent * 0.15; // Benchmark market estimate

  const topCountries = useMemo(() => {
    if (!stats?.usersByCountry) return [];
    const sorted = [...stats.usersByCountry].sort((a, b) => b.users - a.users);
    const max = sorted[0]?.users || 1;
    return sorted.map((c) => {
      const isUnknown = !c.countryCode || c.countryCode.toLowerCase() === 'unknown';
      return {
        ...c,
        displayName: isUnknown ? 'International / Unspecified' : countryName(c.countryCode),
        displayFlag: isUnknown ? '🌐' : countryFlag(c.countryCode),
        displayCode: isUnknown ? 'Global' : c.countryCode.toUpperCase(),
        percentage: Math.round((c.users / (stats.totalUsers || 1)) * 100),
        barWidth: Math.round((c.users / max) * 100),
      };
    });
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Platform Health & Yield Analytics</h2>
          <p className="text-xs text-slate-400">
            Real-time network telemetry, liquidity metrics, and miner analytics
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="rounded-xl border border-white/10 bg-slate-900/80 px-4 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
        >
          🔄 Refresh Telemetry
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Miners</span>
            <span className="text-emerald-400 font-bold">100% On-Chain</span>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {stats?.totalUsers ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">Registered cloud mining accounts</div>
        </div>

        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Active Yielding (24h)</span>
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-emerald-400">
            {stats?.activeMiners ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats ? Math.round(((stats.activeMiners) / (stats.totalUsers || 1)) * 100) : 0}% 24h mining retention
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Accrued Points</span>
            <span className="text-amber-400 font-mono">PTS</span>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-amber-400">
            {totalBalance.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-cyan-400 font-semibold">
            ≈ {tokenEquivalent.toFixed(2)} $MATSU (~${estUsdValue.toFixed(2)})
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Pending Payouts</span>
            <span className="text-amber-400 font-bold">QUEUE</span>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-amber-300">
            {stats?.pendingWithdrawals ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {stats?.blockedUsers ?? 0} suspended / banned accounts
          </div>
        </div>
      </div>

      {/* Secondary Analytics: Country Distribution & Withdrawal Pipeline */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Country Breakdown */}
        <div className="card border-slate-800 bg-slate-900/70 p-6 lg:col-span-7 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              🌍 Global Miner Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {topCountries.length} Regions Active
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {topCountries.length === 0 ? (
              <p className="text-xs text-slate-500">No geo-distribution data recorded yet.</p>
            ) : (
              topCountries.slice(0, 8).map((c, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{c.displayFlag}</span>
                      <span className="text-slate-200">{c.displayName}</span>
                      <span className="font-mono text-slate-500">({c.displayCode})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{c.users} miners</span>
                      <span className="text-slate-500">({c.percentage}%)</span>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                      style={{ width: `${c.barWidth}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Withdrawal Pipeline & Security Telemetry */}
        <div className="card border-slate-800 bg-slate-900/70 p-6 lg:col-span-5 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              🛡️ Security & Liquidity Telemetry
            </h3>
            <span className="text-xs text-emerald-400 font-bold">Audited</span>
          </div>

          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-bold uppercase text-slate-400">Withdrawal Pipeline Status</div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2">
                  <div className="font-mono text-lg font-black text-amber-400">
                    {stats?.withdrawalsByStatus?.PENDING ?? 0}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Pending</div>
                </div>
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2">
                  <div className="font-mono text-lg font-black text-emerald-400">
                    {stats?.withdrawalsByStatus?.APPROVED ?? 0}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Settled</div>
                </div>
                <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-2">
                  <div className="font-mono text-lg font-black text-red-400">
                    {stats?.withdrawalsByStatus?.REJECTED ?? 0}
                  </div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">Rejected</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-xs font-bold uppercase text-slate-400">Sybil & Device Defense</div>
              <div className="mt-2 text-xs leading-relaxed text-slate-300">
                Self-referral defense active via hardware fingerprinting & IP throttling. Suspended miners cannot tap or submit withdrawals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
