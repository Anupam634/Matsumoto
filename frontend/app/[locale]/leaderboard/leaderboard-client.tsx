'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  getLeaderboard,
  getToken,
  LeaderboardCategory,
  LeaderboardEntry,
  LeaderboardPeriod,
  LeaderboardResponse,
} from '../../../lib/api';
import { countryFlag, countryName } from '../../../lib/countries';
import { AppHeader } from '../../../components/AppHeader';
import { MobileTabBar } from '../../../components/MobileTabBar';

const CATEGORIES: {
  key: LeaderboardCategory;
  icon: string;
  labelKey: 'catEarnings' | 'catBalance' | 'catReferrals';
  hintKey: 'catEarningsHint' | 'catBalanceHint' | 'catReferralsHint';
}[] = [
  {
    key: 'EARNINGS',
    icon: '⛏️',
    labelKey: 'catEarnings',
    hintKey: 'catEarningsHint',
  },
  {
    key: 'BALANCE',
    icon: '💎',
    labelKey: 'catBalance',
    hintKey: 'catBalanceHint',
  },
  {
    key: 'REFERRALS',
    icon: '👥',
    labelKey: 'catReferrals',
    hintKey: 'catReferralsHint',
  },
];

const PERIODS: {
  key: LeaderboardPeriod;
  labelKey: 'periodAllTime' | 'periodMonth' | 'periodWeek';
}[] = [
  { key: 'ALL_TIME', labelKey: 'periodAllTime' },
  { key: 'MONTH', labelKey: 'periodMonth' },
  { key: 'WEEK', labelKey: 'periodWeek' },
];

export default function LeaderboardClient({ locale }: { locale: string }) {
  const t = useTranslations('leaderboard');
  const router = useRouter();

  const [category, setCategory] = useState<LeaderboardCategory>('EARNINGS');
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setBoard(await getLeaderboard({ category, period, limit: 100 }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('error'));
    } finally {
      setLoading(false);
    }
  }, [category, period, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login`);
      return;
    }
    load();
  }, [load, locale, router]);

  const activeCategory = CATEGORIES.find((c) => c.key === category)!;
  const unit = board?.unit === 'miners' ? t('unitMiners') : t('unitPoints');
  const decimals = board?.unit === 'miners' ? 0 : 2;

  const formatValue = useCallback(
    (value: number) =>
      value.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }),
    [decimals, locale],
  );

  const entries = board?.entries ?? [];
  const podium = entries.slice(0, 3);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.displayName.toLowerCase().includes(q) ||
        e.countryCode.toLowerCase().includes(q) ||
        String(e.rank) === q,
    );
  }, [entries, search]);

  return (
    <div className="glow-field min-h-screen bg-cyber-grid bg-slate-950 pb-28 text-slate-100">
      <AppHeader locale={locale} backLabel={t('back')} maxWidth="max-w-5xl" />

      <main className="mx-auto max-w-5xl space-y-6 px-4 pt-6 sm:px-6">
        {/* ─────────────── Hero: title + the caller's own standing ─────────────── */}
        <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-900/90 via-[#131622] to-slate-950 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-72 w-72 animate-pulse rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 h-72 w-72 rounded-full bg-indigo-500/15 blur-3xl" />

          <div className="relative z-10 grid items-center gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-amber-300">
                <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
                <span>🏆 BONDKOIN Global Rankings</span>
              </div>

              <h1 className="text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                {t('title')}
              </h1>

              <p className="max-w-xl text-xs leading-relaxed text-slate-300 sm:text-sm">
                {t('subtitle')}
              </p>
            </div>

            <div className="lg:col-span-5">
              <YourRankCard
                board={board}
                loading={loading}
                unit={unit}
                formatValue={formatValue}
              />
            </div>
          </div>
        </section>

        {/* ─────────────── Category + period selectors ─────────────── */}
        <section className="card space-y-4 rounded-3xl border-slate-800 bg-slate-900/80 p-5 backdrop-blur-xl sm:p-6">
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('categoryLabel')}
            </span>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CATEGORIES.map((c) => {
                const active = c.key === category;
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setCategory(c.key)}
                    aria-pressed={active}
                    className={`rounded-2xl border p-3 text-left transition-all active:scale-[0.98] ${
                      active
                        ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                        : 'border-white/10 bg-slate-950/60 hover:border-white/20 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{c.icon}</span>
                      <span
                        className={`text-sm font-black ${
                          active ? 'text-amber-300' : 'text-slate-200'
                        }`}
                      >
                        {t(c.labelKey)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                      {t(c.hintKey)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {t('periodLabel')}
              </span>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-slate-950 p-1 text-xs font-semibold">
                {PERIODS.map((p) => {
                  const active = p.key === (board?.period ?? period);
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPeriod(p.key)}
                      aria-pressed={active}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        active
                          ? 'border border-amber-500/30 bg-amber-500/20 font-bold text-amber-300'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t(p.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {board && (
                <span className="font-mono text-[11px] text-slate-500">
                  {t('updated', {
                    time: new Date(board.generatedAt).toLocaleTimeString(locale),
                  })}
                </span>
              )}
              <button
                type="button"
                onClick={load}
                disabled={loading}
                className="rounded-xl border border-white/15 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-200 transition-all hover:bg-slate-700 disabled:opacity-50"
              >
                ↻ {t('refresh')}
              </button>
            </div>
          </div>

          {/* Balance is a snapshot: say so rather than showing a period that
              silently did not apply. */}
          {board && !board.periodSupported && (
            <p className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 py-2 text-[11px] text-sky-300">
              ℹ️ {t('snapshotNotice')}
            </p>
          )}
        </section>

        {error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-300">
            <p>{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-2 rounded-xl bg-red-500/20 px-4 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/30"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {/* ─────────────── Podium ─────────────── */}
        {podium.length > 0 && (
          <section className="card space-y-5 rounded-3xl border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl sm:p-8">
            <div>
              <h2 className="text-lg font-black text-white sm:text-xl">
                🏅 {t('podium')}
              </h2>
              <p className="text-xs text-slate-400">
                {activeCategory.icon} {t(activeCategory.labelKey)} ·{' '}
                {t('outOf', { total: board?.totalRanked ?? 0 })}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {podium.map((entry) => (
                <PodiumCard
                  key={entry.id}
                  entry={entry}
                  unit={unit}
                  locale={locale}
                  formatValue={formatValue}
                  youLabel={t('you')}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─────────────── Full board ─────────────── */}
        <section className="card space-y-5 rounded-3xl border-slate-800 bg-slate-900/80 p-6 backdrop-blur-xl sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-white sm:text-xl">
                📊 {t('fullBoard')}
              </h2>
              <p className="text-xs text-slate-400">
                {t('outOf', { total: board?.totalRanked ?? 0 })}
              </p>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="input-field w-full py-1.5 text-xs sm:w-52"
            />
          </div>

          {loading && !board ? (
            <div className="p-8 text-center text-xs text-slate-400">
              {t('loading')}
            </div>
          ) : entries.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
              <div className="text-3xl">🏆</div>
              <p className="mx-auto mt-3 max-w-md">{t('empty')}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-8 text-center text-xs text-slate-400">
              {t('noMatches')}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/90 font-mono text-slate-400">
                    <th className="p-3.5">{t('rank')}</th>
                    <th className="p-3.5">{t('miner')}</th>
                    <th className="hidden p-3.5 sm:table-cell">
                      {t('country')}
                    </th>
                    <th className="hidden p-3.5 sm:table-cell">
                      {t('statusCol')}
                    </th>
                    <th className="p-3.5 text-right">{t('score')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {filtered.map((entry) => (
                    <tr
                      key={entry.id}
                      className={
                        entry.isCurrentUser
                          ? 'bg-amber-500/[0.07] ring-1 ring-inset ring-amber-500/30'
                          : 'transition-colors hover:bg-white/[0.02]'
                      }
                    >
                      <td className="p-3.5 font-mono font-black text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <span>#{entry.rank}</span>
                          {entry.badge.medal && <span>{entry.badge.medal}</span>}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">
                        <span className="inline-flex items-center gap-2">
                          <span className="truncate">{entry.displayName}</span>
                          {entry.isCurrentUser && (
                            <span className="rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
                              {t('you')}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="hidden p-3.5 font-mono text-[11px] text-slate-300 sm:table-cell">
                        {entry.countryCode === 'GLOBAL'
                          ? '🌐 —'
                          : `${countryFlag(entry.countryCode)} ${countryName(
                              entry.countryCode,
                              locale,
                            )}`}
                      </td>
                      <td className="hidden p-3.5 sm:table-cell">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            entry.isMiningActive
                              ? 'border border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                              : 'border border-slate-700 bg-slate-800 text-slate-400'
                          }`}
                        >
                          {entry.isMiningActive ? t('active') : t('idle')}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-amber-300">
                        {formatValue(entry.value)}{' '}
                        <span className="text-[10px] font-bold text-slate-500">
                          {unit}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* A miner outside the page still gets their own line, so the board
              is never a list they cannot find themselves in. */}
          {board && board.me.rank !== null && !board.me.inTopList && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.07] p-4">
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg font-black text-amber-300">
                  #{board.me.rank}
                </span>
                <div>
                  <div className="text-xs font-black text-white">
                    {t('yourRank')}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {t('outOf', { total: board.totalRanked })}
                  </div>
                </div>
              </div>
              <div className="text-right font-mono text-sm font-black text-amber-300">
                {formatValue(board.me.value)}{' '}
                <span className="text-[10px] font-bold text-slate-500">
                  {unit}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ─────────────── How ranks are calculated ─────────────── */}
        <section className="space-y-1.5 rounded-2xl border border-white/10 bg-slate-900/60 p-5 text-xs text-slate-400 backdrop-blur-md">
          <div className="flex items-center gap-2 font-bold text-slate-200">
            <span>🧮</span>
            <span>{t('integrityTitle')}</span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {t('integrityBody')}
          </p>
        </section>
      </main>

      <MobileTabBar locale={locale} />
    </div>
  );
}

/* ───────────────────────── Your standing ───────────────────────── */

function YourRankCard({
  board,
  loading,
  unit,
  formatValue,
}: {
  board: LeaderboardResponse | null;
  loading: boolean;
  unit: string;
  formatValue: (value: number) => string;
}) {
  const t = useTranslations('leaderboard');
  const ranked = board?.me.rank ?? null;

  return (
    <div className="card relative overflow-hidden rounded-2xl border-amber-500/40 bg-slate-950/90 p-5 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {t('yourRank')}
        </span>
        <span className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 font-mono text-[10px] font-bold text-amber-300">
          {board?.me.badge.label ?? '—'}
        </span>
      </div>

      {loading && !board ? (
        <div className="mt-4 text-xs text-slate-400">{t('loading')}</div>
      ) : ranked === null ? (
        <div className="mt-3 space-y-1">
          <div className="text-2xl font-black text-slate-300">
            {t('unranked')}
          </div>
          <p className="text-[11px] leading-relaxed text-slate-400">
            {t('unrankedHint')}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-4xl font-black text-white">
              #{ranked}
            </span>
            {board!.me.badge.medal && (
              <span className="text-2xl">{board!.me.badge.medal}</span>
            )}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-slate-400">
            {t('outOf', { total: board!.totalRanked })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-3.5">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {t('yourScore')}
              </div>
              <div className="mt-0.5 font-mono text-sm font-black text-amber-300">
                {formatValue(board!.me.value)}{' '}
                <span className="text-[10px] text-slate-500">{unit}</span>
              </div>
            </div>
            {board!.me.percentile !== null && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {t('topPercent', { percent: board!.me.percentile })}
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full border border-white/10 bg-slate-900">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-700"
                    style={{ width: `${101 - board!.me.percentile}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ───────────────────────────── Podium ──────────────────────────── */

function PodiumCard({
  entry,
  unit,
  locale,
  formatValue,
  youLabel,
}: {
  entry: LeaderboardEntry;
  unit: string;
  locale: string;
  formatValue: (value: number) => string;
  youLabel: string;
}) {
  const accent =
    entry.rank === 1
      ? 'border-amber-400/50 from-amber-500/20'
      : entry.rank === 2
        ? 'border-slate-400/40 from-slate-400/15'
        : 'border-orange-500/40 from-orange-500/15';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-gradient-to-b to-slate-950 p-4 text-center ${accent} ${
        entry.rank === 1 ? 'sm:-translate-y-2 sm:shadow-xl' : ''
      }`}
    >
      <div className="text-3xl">{entry.badge.medal || '🎖️'}</div>
      <div className="mt-2 truncate font-mono text-sm font-black text-white">
        {entry.displayName}
      </div>
      <div className="mt-0.5 text-[11px] text-slate-400">
        {entry.countryCode === 'GLOBAL'
          ? '🌐'
          : `${countryFlag(entry.countryCode)} ${countryName(
              entry.countryCode,
              locale,
            )}`}
      </div>
      <div className="mt-2 font-mono text-lg font-black text-amber-300">
        {formatValue(entry.value)}
      </div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {unit}
      </div>
      {entry.isCurrentUser && (
        <span className="absolute right-2 top-2 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black text-amber-300">
          {youLabel}
        </span>
      )}
    </div>
  );
}
