'use client';

import React, { useState, useMemo } from 'react';
import type { AdminRevenueAnalytics, AdminStats } from '../../lib/admin-api';
import { countryFlag, countryName } from '../../lib/countries';

interface AnalyticsTabProps {
  stats: AdminStats | null;
  /** Loaded and refreshed alongside `stats` by the panel. */
  revenue: AdminRevenueAnalytics | null;
  onRefresh: () => void;
  /** Jumps to the full revenue tab. */
  onOpenRevenue?: () => void;
}

type Timeframe = '24h' | '7d' | '30d';

/**
 * Bar height as a percentage of the tallest bar in view. Anything above zero
 * keeps a visible minimum so a small day is still hoverable; a zero day
 * genuinely draws nothing.
 */
function barHeight(value: number, max: number): number {
  if (value <= 0) return 0;
  return Math.max(6, Math.round((value / max) * 100));
}

/** Whole dollars — the dashboard strip is a glance, not an invoice. */
function usd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function AnalyticsTab({
  stats,
  revenue,
  onRefresh,
  onOpenRevenue,
}: AnalyticsTabProps) {
  const [timeframe, setTimeframe] = useState<Timeframe>('7d');

  const revenuePeriod = useMemo(() => {
    const key = timeframe === '24h' ? 'today' : timeframe === '7d' ? 'week' : 'month';
    return revenue?.periods.find((p) => p.key === key) ?? null;
  }, [revenue, timeframe]);
  const totalBalance = stats?.totalBalancePoints ?? 0;
  const tokenEquivalent = totalBalance / 3;
  const estUsdValue = tokenEquivalent * 0.15; // Benchmark market estimate

  const growth = stats?.growth;
  const history = useMemo(() => {
    const raw = growth?.history ?? [];
    if (timeframe === '24h') return raw.slice(-1);
    if (timeframe === '7d') return raw.slice(-7);
    return raw.slice(-30);
  }, [growth, timeframe]);

  const maxUsersInPeriod = useMemo(() => {
    return Math.max(...history.map((h) => h.newUsers), 1);
  }, [history]);

  const maxPointsInPeriod = useMemo(() => {
    return Math.max(...history.map((h) => h.pointsMined), 1);
  }, [history]);

  const periodSignups = useMemo(() => {
    if (timeframe === '24h') return growth?.dailyNewUsers ?? 0;
    if (timeframe === '7d') return growth?.weeklyNewUsers ?? 0;
    return growth?.monthlyNewUsers ?? 0;
  }, [growth, timeframe]);

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
      {/* Top Header with Timeframe Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">Executive Growth & Mining Telemetry</h2>
            <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-amber-400">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time multi-period growth tracking, network minting velocity, and geographic distribution
          </p>
        </div>

        {/* Timeframe Range Selector */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
            {(['24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                  timeframe === tf
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tf === '24h' ? '24 Hours' : tf === '7d' ? '7 Days' : '30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
            title="Refresh Metrics"
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>New Miners ({timeframe.toUpperCase()})</span>
            <span className="text-emerald-400 font-bold">+{periodSignups} joined</span>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {stats?.totalUsers ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            Total on-chain registered accounts
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Active Miners (24h)</span>
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-emerald-400">
            {stats?.activeMiners ?? 0}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {stats ? Math.round(((stats.activeMiners) / (stats.totalUsers || 1)) * 100) : 0}% 24h retention velocity
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>Total Minted Points</span>
            <span className="text-amber-400 font-mono">PTS</span>
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-amber-400">
            {totalBalance.toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-cyan-400 font-semibold truncate">
            ≈ {tokenEquivalent.toFixed(2)} $BONDKOIN (~${estUsdValue.toFixed(2)})
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
          <div className="mt-1 text-xs text-slate-400">
            {stats?.blockedUsers ?? 0} accounts blocked / suspended
          </div>
        </div>
      </div>

      {/* ───────────────── Booster Revenue Snapshot ───────────────── */}
      {revenue && (
        <div className="card border-emerald-500/20 bg-slate-900/80 p-6 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                💰 Booster Revenue ({timeframe === '24h' ? 'Today' : timeframe === '7d' ? 'Last 7 Days' : 'Last 30 Days'})
              </h3>
              <p className="text-xs text-slate-400">
                Confirmed on-chain booster payments — who paid, for which plan, and how much
              </p>
            </div>
            {onOpenRevenue && (
              <button
                onClick={onOpenRevenue}
                className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3.5 py-2 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20"
              >
                Full revenue breakdown →
              </button>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Collected In Period
              </div>
              <div className="mt-1.5 text-2xl font-black tabular-nums text-emerald-400">
                {usd(revenuePeriod?.revenueUsd ?? 0)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {revenuePeriod?.purchases ?? 0} payments from{' '}
                {revenuePeriod?.payingUsers ?? 0} miners
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                All-Time Revenue
              </div>
              <div className="mt-1.5 text-2xl font-black tabular-nums text-white">
                {usd(revenue.totals.revenueUsd)}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {revenue.totals.confirmedPurchases} boosters sold
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Paying Miners
              </div>
              <div className="mt-1.5 text-2xl font-black tabular-nums text-amber-400">
                {revenue.totals.payingUsers}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {revenue.totals.payerConversionPct}% conversion ·{' '}
                {usd(revenue.totals.arppuUsd)} each
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="text-[11px] font-bold uppercase text-slate-400">
                Top Category
              </div>
              <div className="mt-1.5 text-2xl font-black tabular-nums text-cyan-400">
                {revenue.byCategory[0]?.label ?? '—'}
              </div>
              <div className="mt-1 text-[11px] text-slate-400">
                {usd(revenue.byCategory[0]?.revenueUsd ?? 0)} ·{' '}
                {revenue.byCategory[0]?.shareOfRevenuePct ?? 0}% of revenue
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────── Interactive Growth Time-Series Chart ───────────────── */}
      <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              📈 Miner Signups & Points Yield Velocity ({timeframe === '24h' ? '24 Hours' : timeframe === '7d' ? 'Past 7 Days' : 'Past 30 Days'})
            </h3>
            <p className="text-xs text-slate-400">Daily breakdown of user registrations and accrued node mining points</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-amber-600 to-amber-400" />
              <span className="text-slate-300">New Signups</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-gradient-to-t from-cyan-600 to-cyan-400" />
              <span className="text-slate-300">Points Accrued (PTS)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart */}
        <div className="mt-6">
          {history.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">No time-series data available.</div>
          ) : (
            <div className="space-y-2">
              <div className="flex h-44 items-end gap-1.5 sm:gap-2 pt-4">
                {history.map((h, i) => {
                  // A day with nothing on it draws nothing. The old floor of
                  // 12% gave every empty day a visible stub, which read as
                  // activity that never happened.
                  const signupHeight = barHeight(h.newUsers, maxUsersInPeriod);
                  const pointsHeight = barHeight(h.pointsMined, maxPointsInPeriod);

                  return (
                    <div key={i} className="group relative flex flex-1 flex-col items-center h-full justify-end">
                      {/* Tooltip on Hover */}
                      <div className="pointer-events-none absolute -top-12 z-20 hidden w-32 rounded-lg bg-slate-950 p-2 text-center font-mono text-[10px] shadow-2xl border border-slate-700 group-hover:block">
                        <div className="font-bold text-slate-300">{h.date}</div>
                        <div className="text-amber-400 font-bold">+{h.newUsers} Miners</div>
                        <div className="text-cyan-400 font-bold">+{h.pointsMined} PTS</div>
                      </div>

                      {/* Stacked / Twin Bars.
                          `h-32` is load-bearing: the bars are sized in
                          percentages, and a percentage height resolves to
                          `auto` — so, on an empty div, to nothing at all —
                          unless its container's own height is definite. */}
                      <div className="flex h-32 w-full items-end justify-center gap-0.5">
                        <div
                          className="w-1/2 rounded-t-sm bg-gradient-to-t from-amber-600 to-amber-400 transition-all duration-300 group-hover:brightness-125"
                          style={{ height: `${signupHeight}%` }}
                        />
                        <div
                          className="w-1/2 rounded-t-sm bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300 group-hover:brightness-125"
                          style={{ height: `${pointsHeight}%` }}
                        />
                      </div>

                      {/* X-Axis Date label (sparse on 30d) */}
                      <div className="mt-2 truncate font-mono text-[9px] text-slate-500">
                        {timeframe === '30d' && i % 4 !== 0 ? '' : h.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Row: Geographic Regional Distribution & KYC / Security Telemetry */}
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

        {/* KYC Verification Funnel & Withdrawal Pipeline */}
        <div className="card border-slate-800 bg-slate-900/70 p-6 lg:col-span-5 backdrop-blur-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                🪪 KYC & Liquidity Pipeline
              </h3>
              <span className="text-xs text-emerald-400 font-bold">Audited</span>
            </div>

            <div className="mt-4 space-y-4">
              {/* KYC Distribution */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="text-xs font-bold uppercase text-slate-400">KYC Verification Conversion</div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2">
                    <div className="text-lg font-black text-amber-400">{stats?.kycSummary?.pending ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Pending</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2">
                    <div className="text-lg font-black text-emerald-400">{stats?.kycSummary?.approved ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Verified</div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-2">
                    <div className="text-lg font-black text-red-400">{stats?.kycSummary?.rejected ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Rejected</div>
                  </div>
                </div>
              </div>

              {/* Withdrawals Breakdown */}
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold uppercase text-slate-400">Withdrawals Settled vs Pending</div>
                  {!!stats?.withdrawalsByStatus?.APPROVED && (
                    <span
                      className="rounded-md bg-cyan-500/15 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300"
                      title="Payouts reserved but never settled — each one needs checking against the chain."
                    >
                      {stats.withdrawalsByStatus.APPROVED} stuck
                    </span>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 p-2">
                    <div className="text-lg font-black text-amber-400">{stats?.withdrawalsByStatus?.PENDING ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">In Queue</div>
                  </div>
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 p-2">
                    {/* PAID, not APPROVED. APPROVED is the lock held while a
                        payout is in flight, so it reads ~0 almost always —
                        this tile showed no payouts however many had settled. */}
                    <div className="text-lg font-black text-emerald-400">{stats?.withdrawalsByStatus?.PAID ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Paid Out</div>
                  </div>
                  <div className="rounded-lg bg-red-500/10 border border-red-500/25 p-2">
                    <div className="text-lg font-black text-red-400">{stats?.withdrawalsByStatus?.REJECTED ?? 0}</div>
                    <div className="text-[10px] font-sans font-bold text-slate-400 uppercase">Refunded</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───────────────── Recent Activity Audit Stream ───────────────── */}
      {stats?.recentActivity && stats.recentActivity.length > 0 && (
        <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              📜 Live Protocol Activity Stream (Audit Feed)
            </h3>
            <span className="text-xs font-mono text-slate-500">Immutable Ledger Events</span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-sans">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Miner Account</th>
                  <th className="pb-2">Ledger Event</th>
                  <th className="pb-2 text-right">Points Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {stats.recentActivity.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 text-slate-500">{new Date(act.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 font-bold text-slate-200 font-sans">{act.userEmail}</td>
                    <td className="py-2.5">
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {act.reason}
                      </span>
                    </td>
                    <td className={`py-2.5 text-right font-black ${act.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {act.points >= 0 ? `+${act.points.toFixed(2)}` : act.points.toFixed(2)} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
