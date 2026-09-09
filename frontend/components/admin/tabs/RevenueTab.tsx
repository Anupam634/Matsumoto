'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  downloadReportCsv,
  getRevenueAnalytics,
  type AdminRevenueAnalytics,
  type RevenueBucket,
} from '../../../lib/admin-api';
import { countryFlag, countryName } from '../../../lib/countries';

type Grain = 'daily' | 'weekly' | 'monthly';

const GRAIN_LABEL: Record<Grain, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
};

const GRAIN_CAPTION: Record<Grain, string> = {
  daily: 'Last 30 days, one bar per UTC day',
  weekly: 'Last 12 ISO weeks, Monday to Sunday',
  monthly: 'Last 12 calendar months',
};

/** `$1,250.00` — the panel talks in whole dollars of booster revenue. */
function usd(n: number): string {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function whenever(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function place(code: string | null): { flag: string; name: string } {
  if (!code) return { flag: '🌐', name: 'Unspecified' };
  return { flag: countryFlag(code) || '🌐', name: countryName(code) || code };
}

export function RevenueTab() {
  const [data, setData] = useState<AdminRevenueAnalytics | null>(null);
  const [grain, setGrain] = useState<Grain>('daily');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getRevenueAnalytics());
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load booster revenue.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const series: RevenueBucket[] = useMemo(
    () => data?.series[grain] ?? [],
    [data, grain],
  );

  // One scale for the whole chart, floored at 1 so an all-zero window still
  // renders a flat baseline instead of dividing by nothing.
  const maxRevenue = useMemo(
    () => Math.max(1, ...series.map((b) => b.revenueUsd)),
    [series],
  );

  const seriesTotal = useMemo(
    () => series.reduce((sum, b) => sum + b.revenueUsd, 0),
    [series],
  );

  const payers = useMemo(() => {
    const rows = data?.topPayers ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (p) =>
        (p.email ?? '').toLowerCase().includes(q) ||
        p.userId.toLowerCase().includes(q) ||
        (p.walletAddress ?? '').toLowerCase().includes(q) ||
        (p.countryCode ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  async function handleExport() {
    setDownloading(true);
    try {
      await downloadReportCsv('revenue-by-user');
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to export the payer table.',
      );
    } finally {
      setDownloading(false);
    }
  }

  const totals = data?.totals;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">
              💰 Booster Revenue Analytics
            </h2>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
              Confirmed On-Chain
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Every confirmed booster payment — total taken, which miner paid how
            much, which plan it was for, day by day, week by week and month by
            month.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={downloading || !data}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-500 hover:text-amber-400 disabled:opacity-50"
          >
            {downloading ? '⏳ Building CSV…' : '📥 Export Payers CSV'}
          </button>
          <button
            onClick={load}
            className="rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs font-bold text-slate-300 transition hover:border-amber-500 hover:text-amber-400"
          >
            🔄 Sync
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
          ⚠️ {error}
        </div>
      )}

      {loading && !data ? (
        <div className="p-10 text-center text-xs text-slate-400">
          Querying the payments ledger…
        </div>
      ) : !data ? null : (
        <>
          {/* ── Headline totals ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <div className="card border-emerald-500/25 bg-slate-900/70 p-5 backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Total Collected
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums text-emerald-400">
                {usd(totals!.revenueUsd)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {totals!.confirmedPurchases.toLocaleString()} confirmed booster
                payments
              </div>
            </div>

            <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Paying Miners
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums text-white">
                {totals!.payingUsers.toLocaleString()}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {totals!.payerConversionPct}% of {totals!.totalUsers.toLocaleString()}{' '}
                registered miners
              </div>
            </div>

            <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Avg Per Paying Miner
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums text-amber-400">
                {usd(totals!.arppuUsd)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {usd(totals!.averageOrderUsd)} average order value
              </div>
            </div>

            <div className="card border-slate-800 bg-slate-900/70 p-5 backdrop-blur-md">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Awaiting Payment
              </div>
              <div className="mt-2 text-3xl font-black tabular-nums text-amber-300">
                {usd(totals!.awaitingPaymentUsd)}
              </div>
              <div className="mt-1 text-xs text-slate-400">
                {totals!.awaitingPayment} open · {totals!.failed} failed ·{' '}
                {totals!.expired} expired
              </div>
            </div>
          </div>

          {/* ── Daily / weekly / monthly period cards ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {data.periods.map((p) => {
              const up = (p.changePct ?? 0) >= 0;
              return (
                <div
                  key={p.key}
                  className="card border-slate-800 bg-slate-950/60 p-4 backdrop-blur-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      {p.label}
                    </span>
                    {p.changePct !== null && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${
                          up
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-rose-500/15 text-rose-400'
                        }`}
                      >
                        {up ? '▲' : '▼'} {Math.abs(p.changePct)}%
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-2xl font-black tabular-nums text-white">
                    {usd(p.revenueUsd)}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    {p.purchases} payments · {p.payingUsers} miners
                  </div>
                  {p.changePct !== null && (
                    <div className="mt-1 text-[10px] text-slate-500">
                      previous {p.label.toLowerCase()}: {usd(p.previousRevenueUsd)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Revenue over time ── */}
          <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  📈 Revenue Over Time
                </h3>
                <p className="text-xs text-slate-400">{GRAIN_CAPTION[grain]}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-emerald-400">
                  {usd(seriesTotal)} in view
                </span>
                <div className="flex rounded-xl border border-slate-800 bg-slate-900/90 p-1 text-xs">
                  {(['daily', 'weekly', 'monthly'] as const).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGrain(g)}
                      className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                        grain === g
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {GRAIN_LABEL[g]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex h-48 items-end gap-1.5 sm:gap-2">
              {series.map((b, i) => {
                // Any non-zero bucket keeps a visible stub so a $1 day is
                // still clickable, rather than collapsing to the axis.
                const height = b.revenueUsd
                  ? Math.max(4, Math.round((b.revenueUsd / maxRevenue) * 100))
                  : 0;
                return (
                  <div
                    key={b.key}
                    className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  >
                    <div className="pointer-events-none absolute -top-16 z-20 hidden w-36 rounded-lg border border-slate-700 bg-slate-950 p-2 text-center font-mono text-[10px] shadow-2xl group-hover:block">
                      <div className="font-bold text-slate-300">{b.label}</div>
                      <div className="font-bold text-emerald-400">
                        {usd(b.revenueUsd)}
                      </div>
                      <div className="text-slate-400">
                        {b.purchases} payments · {b.payingUsers} miners
                      </div>
                    </div>

                    <div
                      className="w-full rounded-t-sm bg-gradient-to-t from-emerald-700 to-emerald-400 transition-all duration-300 group-hover:brightness-125"
                      style={{ height: `${height}%` }}
                    />
                    <div className="mt-2 h-3 truncate font-mono text-[9px] text-slate-500">
                      {grain === 'daily' && i % 3 !== 0 ? '' : b.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Per-plan (category) split ── */}
          <div className="card border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                🏷️ Revenue By Booster Category
              </h3>
              <span className="font-mono text-xs text-slate-400">
                {data.byCategory.length} plans in catalogue
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">Category</th>
                    <th className="pb-2 text-right">Sold</th>
                    <th className="pb-2 text-right">Buyers</th>
                    <th className="pb-2 text-right">Active Now</th>
                    <th className="pb-2 text-right">Pending</th>
                    <th className="pb-2 text-right">Revenue</th>
                    <th className="pb-2 pl-4 w-40">Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {data.byCategory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-500">
                        No booster plans configured yet.
                      </td>
                    </tr>
                  ) : (
                    data.byCategory.map((c) => (
                      <tr key={c.planId} className="transition hover:bg-white/[0.02]">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{c.label}</span>
                            {!c.active && (
                              <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-400">
                                Retired
                              </span>
                            )}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            +{c.rateBonusPoints}/h for {c.durationDays} days
                          </div>
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-slate-200">
                          {c.confirmedPurchases}
                        </td>
                        <td className="py-3 text-right font-mono text-slate-300">
                          {c.uniqueBuyers}
                        </td>
                        <td className="py-3 text-right font-mono text-cyan-400">
                          {c.activeBoosters}
                        </td>
                        <td className="py-3 text-right font-mono text-amber-300">
                          {c.awaitingPayment}
                        </td>
                        <td className="py-3 text-right font-mono font-black text-emerald-400">
                          {usd(c.revenueUsd)}
                        </td>
                        <td className="py-3 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400"
                                style={{ width: `${c.shareOfRevenuePct}%` }}
                              />
                            </div>
                            <span className="w-10 text-right font-mono text-[10px] text-slate-400">
                              {c.shareOfRevenuePct}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {data.byToken.length > 0 && (
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">
                  Paid with
                </span>
                {data.byToken.map((t) => (
                  <span
                    key={t.tokenSymbol}
                    className="rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 font-mono text-[11px] text-slate-300"
                  >
                    <span className="font-bold text-cyan-400">{t.tokenSymbol}</span>{' '}
                    · {t.purchases} tx · {usd(t.revenueUsd)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Who paid how much ── */}
          <div className="card border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  👤 Spend Per Miner
                </h3>
                <p className="text-xs text-slate-400">
                  Top {data.topPayers.length} paying accounts of{' '}
                  {totals!.payingUsers.toLocaleString()} — export the CSV for the
                  full list.
                </p>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter email, wallet, country…"
                className="input-field w-64 text-xs"
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                  <tr>
                    <th className="pb-2">#</th>
                    <th className="pb-2">Miner</th>
                    <th className="pb-2">Country</th>
                    <th className="pb-2">Categories Bought</th>
                    <th className="pb-2 text-right">Payments</th>
                    <th className="pb-2 text-right">Total Paid</th>
                    <th className="pb-2 text-right">Share</th>
                    <th className="pb-2 text-right">Last Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {payers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        {data.topPayers.length === 0
                          ? 'No confirmed booster payments yet.'
                          : 'No paying miner matches that filter.'}
                      </td>
                    </tr>
                  ) : (
                    payers.map((p) => {
                      const geo = place(p.countryCode);
                      return (
                        <tr
                          key={p.userId}
                          className="transition hover:bg-white/[0.02]"
                        >
                          <td className="py-3 font-mono font-bold text-slate-500">
                            {p.rank}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">
                                {p.email ?? 'Wallet Account'}
                              </span>
                              {p.isBlocked && (
                                <span className="rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-rose-400">
                                  Blocked
                                </span>
                              )}
                            </div>
                            <div
                              className="font-mono text-[10px] text-slate-500"
                              title={p.walletAddress ?? p.userId}
                            >
                              {p.walletAddress
                                ? `${p.walletAddress.slice(0, 8)}…${p.walletAddress.slice(-6)}`
                                : p.userId}
                            </div>
                          </td>
                          <td className="py-3 text-slate-300">
                            <span className="mr-1">{geo.flag}</span>
                            {geo.name}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {p.plans.map((plan) => (
                                <span
                                  key={plan.planId}
                                  className="rounded-md border border-slate-700 bg-slate-950 px-1.5 py-0.5 font-mono text-[10px] text-amber-300"
                                >
                                  {plan.label} ×{plan.count}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono text-slate-300">
                            {p.purchases}
                          </td>
                          <td className="py-3 text-right font-mono font-black text-emerald-400">
                            {usd(p.revenueUsd)}
                          </td>
                          <td className="py-3 text-right font-mono text-slate-400">
                            {p.shareOfRevenuePct}%
                          </td>
                          <td className="py-3 text-right font-mono text-slate-400">
                            {whenever(p.lastPurchaseAt)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Latest confirmed payments ── */}
          {data.recentPayments.length > 0 && (
            <div className="card border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  🧾 Latest Confirmed Payments
                </h3>
                <span className="font-mono text-[10px] text-slate-500">
                  Synced {new Date(data.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="pb-2">Paid At</th>
                      <th className="pb-2">Miner</th>
                      <th className="pb-2">Category</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Transaction</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {data.recentPayments.map((r) => (
                      <tr key={r.id} className="transition hover:bg-white/[0.02]">
                        <td className="py-2.5 font-mono text-slate-400">
                          {new Date(r.paidAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 font-bold text-slate-200">
                          {r.userEmail ?? 'Wallet Account'}
                        </td>
                        <td className="py-2.5">
                          <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                            {r.label}
                          </span>
                        </td>
                        <td className="py-2.5 font-mono text-emerald-400">
                          {usd(r.priceUsd)}{' '}
                          <span className="text-slate-500">
                            ({r.expectedAmount} {r.tokenSymbol})
                          </span>
                        </td>
                        <td className="py-2.5 font-mono">
                          {r.txHash ? (
                            <a
                              href={`https://bscscan.com/tx/${r.txHash}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-cyan-400 underline hover:text-cyan-300"
                            >
                              🔗 {r.txHash.slice(0, 12)}…
                            </a>
                          ) : (
                            <span className="text-slate-500">Manual approval</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
