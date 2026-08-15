'use client';

import { Fragment, useCallback, useEffect, useState, useMemo } from 'react';
import { LogoMark } from '../../../components/Logo';
import {
  ApiError,
  adjustRate,
  adminLogin,
  adminLogout,
  airdrop,
  decideKyc,
  decideWithdrawal,
  getAdminToken,
  getStats,
  getKycDetail,
  listSupport,
  replySupport,
  type AdminSupportTicket,
  getUserDetail,
  listKyc,
  listUsers,
  listWithdrawals,
  setBlocked,
  type AdminStats,
  type AdminUserDetail,
  type AdminKycDetail,
  type AdminKycRow,
  type AdminUserRow,
  type AdminWithdrawal,
  type TreeNode,
  listAdminTasks,
  updateAdminTask,
  createAdminTask,
  deleteAdminTask,
  type AdminTaskItem,
  type AdminQuizQuestion,
} from '../../../lib/admin-api';
import { countryFlag, countryName } from '../../../lib/countries';

type Tab = 'analytics' | 'miners' | 'withdrawals' | 'kyc' | 'support' | 'tasks';

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => setAuthed(!!getAdminToken()), []);

  if (authed === null) return null;
  if (!authed) return <LoginGate onDone={() => setAuthed(true)} />;
  return (
    <Panel
      onSignOut={() => {
        adminLogout();
        setAuthed(false);
      }}
    />
  );
}

/* ─────────────────────────── Login Gate ─────────────────────────── */

function LoginGate({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminLogin(email, password);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glow-field min-h-dvh flex items-center justify-center bg-slate-950 px-5 text-slate-100">
      <form onSubmit={submit} className="card w-full max-w-md border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl">
        <div className="mb-6 flex items-center gap-3 border-b border-white/[0.08] pb-4">
          <LogoMark size={36} priority />
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Matsumoto Operator Console</h1>
            <p className="text-xs font-semibold text-amber-400">Restricted Administration Access</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <span className="font-bold">⚠</span> {error}
          </div>
        )}

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Operator Email
          </span>
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            placeholder="admin@matsumoto.io"
            required
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Password
          </span>
          <input
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </label>

        <button
          type="submit"
          disabled={busy}
          className="btn-gold mt-6 w-full rounded-xl py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50"
        >
          {busy ? 'Verifying Credentials…' : 'Access Operator Console →'}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────── Main Admin Panel ─────────────────────────── */

function Panel({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('analytics');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSignOut();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    }
  }, [onSignOut]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="glow-field min-h-dvh bg-slate-950 text-slate-100">
      {/* Top Console Navigation */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark size={34} priority />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-white sm:text-lg">Matsumoto Command Center</span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
                  Cluster v2.4 Live
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">BNB Chain Mainnet Node Controller</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/50 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
            <span className="font-bold">⚠</span> {error}
          </div>
        )}

        {/* Global Tab Switcher */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
          <button
            onClick={() => setTab('analytics')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Analytics & Insights
          </button>
          <button
            onClick={() => setTab('miners')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'miners'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Miner Accounts ({stats?.totalUsers ?? '…'})
          </button>
          <button
            onClick={() => setTab('withdrawals')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'withdrawals'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            💸 Withdrawals Queue
            {stats?.pendingWithdrawals ? (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                {stats.pendingWithdrawals} PENDING
              </span>
            ) : ''}
          </button>
          <button
            onClick={() => setTab('kyc')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'kyc'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            🪪 KYC Verifications
          </button>
          <button
            onClick={() => setTab('support')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'support'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Support Tickets
          </button>
          <button
            onClick={() => setTab('tasks')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              tab === 'tasks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Tasks & Bounties
          </button>
        </div>

        {/* Tab Content Panels */}
        <div className="mt-6">
          {tab === 'analytics' && <AnalyticsTab stats={stats} onRefresh={loadStats} />}
          {tab === 'miners' && <MinersTab onChanged={loadStats} onUnauthorized={onSignOut} />}
          {tab === 'withdrawals' && <WithdrawalsTab onChanged={loadStats} onUnauthorized={onSignOut} />}
          {tab === 'kyc' && <KycTab onUnauthorized={onSignOut} />}
          {tab === 'support' && <SupportTab onUnauthorized={onSignOut} />}
          {tab === 'tasks' && <TasksTab onUnauthorized={onSignOut} />}
        </div>
      </main>
    </div>
  );
}

/* ─────────────────────────── TAB 1: Analytics & Insights ─────────────────────────── */

function AnalyticsTab({ stats, onRefresh }: { stats: AdminStats | null; onRefresh: () => void }) {
  const totalBalance = stats?.totalBalancePoints ?? 0;
  const tokenEquivalent = totalBalance / 3;
  const estUsdValue = tokenEquivalent * 0.15; // Benchmark estimated valuation

  const topCountries = useMemo(() => {
    if (!stats?.usersByCountry) return [];
    const sorted = [...stats.usersByCountry].sort((a, b) => b.users - a.users);
    const max = sorted[0]?.users || 1;
    return sorted.map((c) => ({
      ...c,
      percentage: Math.round((c.users / (stats.totalUsers || 1)) * 100),
      barWidth: Math.round((c.users / max) * 100),
    }));
  }, [stats]);

  return (
    <div className="space-y-6">
      {/* Header & Quick Action */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Platform Health & Yield Analytics</h2>
          <p className="text-xs text-slate-400">Real-time telemetry and network accrual overview</p>
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
          <div className="mt-1 text-xs text-slate-500">Registered cloud mining nodes</div>
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
            {stats ? Math.round(((stats.activeMiners) / (stats.totalUsers || 1)) * 100) : 0}% 24h retention rate
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
              🌍 Global Node Distribution
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {topCountries.length} Countries Active
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {topCountries.length === 0 ? (
              <p className="text-xs text-slate-500">No geo-distribution data recorded yet.</p>
            ) : (
              topCountries.slice(0, 7).map((c) => (
                <div key={c.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span>{countryFlag(c.countryCode || 'US')}</span>
                      <span className="text-slate-200">{countryName(c.countryCode || 'US')}</span>
                      <span className="font-mono text-slate-500">({c.countryCode || '—'})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-400">{c.users} nodes</span>
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
              🛡️ Security & Liquidity
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
                Self-referral detection is active via fingerprinting & shared IP throttling. Banned users cannot tap or request withdrawals.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── TAB 2: Miners Management ─────────────────────────── */

function MinersTab({
  onChanged,
  onUnauthorized,
}: {
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED' | 'KYC_APPROVED' | 'BOOSTED'>('ALL');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Modals state
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [inspectUserId, setInspectUserId] = useState<string | null>(null);
  const [rateModalUser, setRateModalUser] = useState<AdminUserRow | null>(null);
  const [airdropModalUser, setAirdropModalUser] = useState<AdminUserRow | null>(null);
  const [banModalUser, setBanModalUser] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const res = await listUsers(search, page);
      setRows(res.users);
      setTotal(res.total);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }, [search, page, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  // Client-side filtering on current dataset
  const filteredRows = useMemo(() => {
    return rows.filter((u) => {
      if (filter === 'BLOCKED') return u.isBlocked;
      if (filter === 'ACTIVE') return !u.isBlocked;
      if (filter === 'KYC_APPROVED') return u.kycStatus === 'APPROVED';
      if (filter === 'BOOSTED') return u.activeBoosters > 0;
      return true;
    });
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 min-w-[280px]">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by Email, User ID, Referral Code, or Wallet…"
            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {(['ALL', 'ACTIVE', 'BLOCKED', 'KYC_APPROVED', 'BOOSTED'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                filter === f
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Miners Table */}
      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Miner Account</th>
                <th className="p-3.5">Country</th>
                <th className="p-3.5">Rate / Hour</th>
                <th className="p-3.5">Balance</th>
                <th className="p-3.5">Referrals</th>
                <th className="p-3.5">KYC</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    {busy ? 'Loading miners…' : 'No miner accounts match the query.'}
                  </td>
                </tr>
              ) : (
                filteredRows.map((u) => (
                  <tr key={u.id} className="transition hover:bg-slate-800/40">
                    <td className="p-3.5">
                      <div className="font-bold text-white">{u.email ?? 'No email (wallet user)'}</div>
                      <div className="font-mono text-[10px] text-slate-500">{u.id}</div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span>{u.countryCode ? countryFlag(u.countryCode) : '🌐'}</span>
                        <span>{u.countryCode ?? '—'}</span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-amber-400">
                        {u.ratePerHour.toFixed(2)} /h
                      </span>
                      {u.rateAdjustMilli !== 0 && (
                        <span className="ml-1 text-[10px] text-cyan-400">
                          ({u.rateAdjustMilli > 0 ? '+' : ''}{(u.rateAdjustMilli / 1000).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-white">{u.balancePoints.toFixed(2)}</span>
                      <span className="ml-1 text-[10px] text-slate-400">PTS</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-200">{u.referralCount}</span>
                      <span className="ml-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                        L{u.referralTier.level} ({u.referralTier.multiplier}×)
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.kycStatus === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : u.kycStatus === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : u.kycStatus === 'REJECTED'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {u.kycStatus}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {u.isBlocked ? (
                        <span className="rounded-full bg-red-500/20 border border-red-500/40 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-red-300">
                          🛑 Suspended
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-emerald-400">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setInspectUserId(u.id)}
                          className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-slate-200 hover:border-amber-400 hover:text-amber-300 transition"
                          title="Inspect Account Details"
                        >
                          🔍 Details
                        </button>
                        <button
                          onClick={() => setBanModalUser(u)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition border ${
                            u.isBlocked
                              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                              : 'border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/60'
                          }`}
                        >
                          {u.isBlocked ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button
                          onClick={() => setRateModalUser(u)}
                          className="rounded-lg border border-indigo-500/30 bg-indigo-950/30 px-2.5 py-1.5 text-xs font-bold text-indigo-300 hover:bg-indigo-900/50 transition"
                        >
                          ⚡ Rate
                        </button>
                        <button
                          onClick={() => setAirdropModalUser(u)}
                          className="rounded-lg border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition"
                        >
                          🎁 Airdrop
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-slate-950/60 px-4 py-3 text-xs text-slate-400">
          <div>
            Showing <strong className="text-white">{filteredRows.length}</strong> of{' '}
            <strong className="text-white">{total}</strong> total registered accounts
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1 || busy}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-bold disabled:opacity-40"
            >
              ← Prev
            </button>
            <span className="font-mono font-bold text-slate-300">Page {page}</span>
            <button
              disabled={page * 25 >= total || busy}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 font-bold disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* ───────────────── MODAL: Deep Account Inspection Drawer ───────────────── */}
      {inspectUserId && (
        <InspectUserModal
          userId={inspectUserId}
          onClose={() => setInspectUserId(null)}
          onChanged={() => {
            load();
            onChanged();
          }}
        />
      )}

      {/* ───────────────── MODAL: Suspend / Ban Account ───────────────── */}
      {banModalUser && (
        <BanUserModal
          user={banModalUser}
          onClose={() => setBanModalUser(null)}
          onSuccess={() => {
            setBanModalUser(null);
            load();
            onChanged();
          }}
        />
      )}

      {/* ───────────────── MODAL: Hash Rate Adjustment ───────────────── */}
      {rateModalUser && (
        <RateAdjustModal
          user={rateModalUser}
          onClose={() => setRateModalUser(null)}
          onSuccess={() => {
            setRateModalUser(null);
            load();
            onChanged();
          }}
        />
      )}

      {/* ───────────────── MODAL: Airdrop Points ───────────────── */}
      {airdropModalUser && (
        <AirdropModal
          user={airdropModalUser}
          onClose={() => setAirdropModalUser(null)}
          onSuccess={() => {
            setAirdropModalUser(null);
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── MODALS: Ban, Rate, Airdrop, Inspect ─────────────────────────── */

function BanUserModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setBusy(true);
    setError(null);
    try {
      await setBlocked(user.id, !user.isBlocked);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white">
          {user.isBlocked ? 'Unsuspend Miner Account' : 'Suspend / Ban Miner Account'}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {user.isBlocked
            ? `Re-enabling ${user.email ?? user.id} will restore their mining accrual and withdrawal privileges.`
            : `Suspending ${user.email ?? user.id} will immediately block them from tapping Mine, receiving referral commissions, and submitting withdrawals.`}
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleToggle}
            disabled={busy}
            className={`rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider ${
              user.isBlocked
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-red-600 text-white shadow-md shadow-red-600/30'
            }`}
          >
            {busy ? 'Processing…' : user.isBlocked ? 'Confirm Unsuspend' : 'Confirm Suspension'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RateAdjustModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [pointsPerHour, setPointsPerHour] = useState(String(user.rateAdjustMilli / 1000));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = Number(pointsPerHour);
    if (!Number.isFinite(val)) {
      setError('Please enter a valid numeric value.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adjustRate(user.id, Math.round(val * 1000));
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Adjustment failed.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white">Manual Hash Rate Adjustment</h3>
        <p className="mt-1 text-xs text-slate-400">
          Target user: <strong className="text-white">{user.email ?? user.id}</strong>
        </p>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Rate Adjustment (PTS / Hour)
          </label>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Positive boosts mining; negative throttles suspicious accounts.
          </p>
          <input
            type="number"
            step="0.1"
            value={pointsPerHour}
            onChange={(e) => setPointsPerHour(e.target.value)}
            className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-lg font-bold text-amber-400 outline-none focus:border-amber-500"
            required
          />
        </div>

        {/* Preset speed pills */}
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {[0, 1.0, 2.0, 5.0, -0.5].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setPointsPerHour(String(v))}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-slate-300 hover:border-amber-400"
            >
              {v > 0 ? `+${v}` : v}/h
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-gold rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950"
          >
            {busy ? 'Saving…' : 'Apply Hashrate'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AirdropModal({
  user,
  onClose,
  onSuccess,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [points, setPoints] = useState('100');
  const [note, setNote] = useState('Community promotional grant');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pts = Number(points);
    if (!Number.isFinite(pts) || pts <= 0) {
      setError('Enter a valid positive number of points.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await airdrop(user.id, Math.round(pts), note);
      onSuccess();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Airdrop grant failed.');
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <form onSubmit={handleSubmit} className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white">🎁 Grant Manual Airdrop</h3>
        <p className="mt-1 text-xs text-slate-400">
          Credited instantly to: <strong className="text-white">{user.email ?? user.id}</strong>
        </p>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Points Amount (PTS)
          </label>
          <input
            type="number"
            step="1"
            min="1"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xl font-bold text-amber-400 outline-none focus:border-amber-500"
            required
          />
        </div>

        <div className="mt-3 flex gap-2 text-xs">
          {['50', '100', '250', '500', '1000'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPoints(p)}
              className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 font-mono text-slate-300 hover:border-amber-400"
            >
              +{p}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
            Ledger Audit Note
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. VIP bounty reward"
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-200 outline-none focus:border-amber-500"
          />
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="btn-gold rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950"
          >
            {busy ? 'Granting…' : 'Credit Points'}
          </button>
        </div>
      </form>
    </div>
  );
}

function InspectUserModal({
  userId,
  onClose,
  onChanged,
}: {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    getUserDetail(userId)
      .then((d) => {
        setData(d);
        setBusy(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load user details.');
        setBusy(false);
      });
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-xl font-black text-white">Miner Account Deep Inspection</h3>
            <p className="font-mono text-xs text-slate-400">ID: {userId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ✕ Close
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {busy || !data ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading comprehensive account telemetry…</div>
        ) : (
          <div className="mt-6 space-y-6">
            {/* Account Profile Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Email</div>
                <div className="mt-1 font-bold text-white truncate">{data.user.email ?? 'Wallet Account'}</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Points Balance</div>
                <div className="mt-1 font-mono text-base font-black text-amber-400">{data.user.balancePoints.toFixed(2)} PTS</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Effective Hashrate</div>
                <div className="mt-1 font-mono text-base font-black text-emerald-400">{data.user.ratePerHour.toFixed(2)} /h</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">KYC Status</div>
                <div className="mt-1 font-bold text-cyan-400">{data.user.kycStatus}</div>
              </div>
            </div>

            {/* 6-Level Referral Downline Hierarchy */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  🌲 6-Tier Referral Network Tree
                </span>
                <span className="text-xs font-bold text-indigo-400">
                  Direct Invites: {data.user.referralCount}
                </span>
              </div>
              <div className="mt-3 max-h-48 overflow-y-auto font-mono text-xs">
                {data.referralTree.length === 0 ? (
                  <p className="text-slate-500">No downline referrals registered under this account.</p>
                ) : (
                  <div className="space-y-1.5 pl-2">
                    {data.referralTree.map((child) => (
                      <TreeBranch key={child.id} node={child} depth={1} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ledger Transactions History */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                📜 Recent Ledger Transactions (Audit Trail)
              </span>
              <div className="mt-3 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="pb-1.5">Timestamp</th>
                      <th className="pb-1.5">Reason</th>
                      <th className="pb-1.5 text-right">Points Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-mono">
                    {data.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-slate-500">No ledger entries.</td>
                      </tr>
                    ) : (
                      data.ledger.map((l) => (
                        <tr key={l.id}>
                          <td className="py-1.5 text-slate-400">{new Date(l.createdAt).toLocaleString()}</td>
                          <td className="py-1.5 text-slate-200">{l.reason}</td>
                          <td className={`py-1.5 text-right font-bold ${l.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {l.points >= 0 ? `+${l.points.toFixed(2)}` : l.points.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-0.5 text-slate-300">
        <span className="text-slate-600">{'—'.repeat(depth)}</span>
        <span className="font-bold text-white">{node.email ?? node.id.slice(0, 8)}</span>
        <span className="text-[10px] text-amber-400">({node.balancePoints.toFixed(1)} PTS)</span>
        {node.isBlocked && <span className="text-[10px] text-red-400">[BANNED]</span>}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="pl-3">
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── TAB 3: Withdrawals Queue ─────────────────────────── */

function WithdrawalsTab({
  onChanged,
  onUnauthorized,
}: {
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await listWithdrawals(statusFilter === 'ALL' ? undefined : statusFilter);
      setRows(data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }, [statusFilter, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecision(id: string, approve: boolean) {
    let note: string | undefined;
    if (!approve) {
      const promptNote = prompt('Reason for rejecting withdrawal (refunds user PTS):', 'Suspicious activity');
      if (promptNote === null) return;
      note = promptNote;
    }
    setBusy(true);
    try {
      await decideWithdrawal(id, approve, note);
      load();
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Decision failed.');
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Withdrawals Moderation Queue</h2>
          <p className="text-xs text-slate-400">Review pending BEP-20 payouts on BNB Smart Chain</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Requested At</th>
                <th className="p-3.5">Applicant</th>
                <th className="p-3.5">Points Deducted</th>
                <th className="p-3.5">Token Payout</th>
                <th className="p-3.5">Target Wallet Address</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Decision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 font-sans">
                    {busy ? 'Loading queue…' : 'No withdrawal requests found for this filter.'}
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="transition hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-400">{new Date(w.requestedAt).toLocaleString()}</td>
                    <td className="p-3.5 font-sans font-bold text-white">{w.userEmail ?? w.userId.slice(0, 8)}</td>
                    <td className="p-3.5 font-bold text-amber-400">{w.points} PTS</td>
                    <td className="p-3.5 font-bold text-cyan-400">{w.tokenAmount} MATSU</td>
                    <td className="p-3.5 text-slate-400 truncate max-w-xs">{w.toAddress}</td>
                    <td className="p-3.5 font-sans">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        w.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : w.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      {w.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDecision(w.id, true)}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950 hover:bg-emerald-400 transition"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleDecision(w.id, false)}
                            className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60 transition"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── TAB 4: KYC Verifications ─────────────────────────── */

function KycTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [status, setStatus] = useState<string>('PENDING');
  const [rows, setRows] = useState<AdminKycRow[]>([]);
  const [selected, setSelected] = useState<AdminKycDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await listKyc(status === 'ALL' ? undefined : status);
      setRows(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    } finally {
      setBusy(false);
    }
  }, [status, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(id: string) {
    try {
      const detail = await getKycDetail(id);
      setSelected(detail);
    } catch {
      alert('Failed to load KYC document details.');
    }
  }

  async function handleDecide(approve: boolean) {
    if (!selected) return;
    const note = prompt(approve ? 'Approval note (optional):' : 'Rejection reason:', approve ? 'Verified' : 'Document unreadable');
    if (note === null) return;
    try {
      await decideKyc(selected.userId, approve, note);
      setSelected(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Decision failed.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Identity Verification (KYC) Queue</h2>
          <p className="text-xs text-slate-400">Review government-issued documents & selfies</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                status === st
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Submitted</th>
                <th className="p-3.5">User Account</th>
                <th className="p-3.5">Full Legal Name</th>
                <th className="p-3.5">Document Type</th>
                <th className="p-3.5">Document Number</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Inspect Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {busy ? 'Loading KYC applicants…' : 'No KYC records found.'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId} className="transition hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-400">{r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}</td>
                    <td className="p-3.5 font-bold text-white">{r.userEmail ?? r.userId.slice(0, 8)}</td>
                    <td className="p-3.5 font-semibold text-slate-200">{r.fullName ?? '—'}</td>
                    <td className="p-3.5 text-amber-300 font-bold">{r.documentType ?? '—'}</td>
                    <td className="p-3.5 font-mono text-slate-400">{r.documentNumber ?? '—'}</td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        r.status === 'APPROVED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : r.status === 'PENDING'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : 'bg-red-500/15 text-red-400 border border-red-500/30'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => openDetail(r.userId)}
                        className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition"
                      >
                        🔍 Inspect Media
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* KYC Inspection Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <div className="card max-h-[90vh] w-full max-w-3xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div>
                <h3 className="text-lg font-black text-white">KYC Document Inspection</h3>
                <p className="text-xs text-slate-400">Applicant: {selected.fullName} ({selected.userEmail})</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400">✕ Close</button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              {selected.documents?.map((doc, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                  <div className="text-xs font-bold uppercase text-amber-400">{doc.kind} Document</div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={doc.dataUrl} alt={doc.kind} className="mt-2 h-48 w-full rounded-lg object-contain bg-black/50" />
                </div>
              ))}
            </div>

            {selected.status === 'PENDING' && (
              <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-800 pt-4">
                <button onClick={() => handleDecide(false)} className="rounded-xl border border-red-500/40 bg-red-950/40 px-5 py-2.5 text-xs font-bold text-red-300">
                  ✕ Reject Applicant
                </button>
                <button onClick={() => handleDecide(true)} className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950">
                  ✓ Approve Identity
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── TAB 5: Support Tickets ─────────────────────────── */

function SupportTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [tickets, setTickets] = useState<AdminSupportTicket[]>([]);
  const [selected, setSelected] = useState<AdminSupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await listSupport();
      setTickets(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    } finally {
      setBusy(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !replyMessage.trim()) return;
    setBusy(true);
    try {
      await replySupport(selected.id, replyMessage, 'ANSWERED');
      setReplyMessage('');
      setSelected(null);
      load();
    } catch {
      alert('Failed to send operator reply.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-white">Customer Support Tickets</h2>
      <div className="card overflow-hidden border-slate-800 bg-slate-900/80">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase text-slate-400">
            <tr>
              <th className="p-3.5">Date</th>
              <th className="p-3.5">User</th>
              <th className="p-3.5">Subject</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {tickets.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500">No support tickets filed.</td></tr>
            ) : (
              tickets.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40">
                  <td className="p-3.5 text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="p-3.5 font-bold text-white">{t.userEmail}</td>
                  <td className="p-3.5 text-slate-200">{t.subject}</td>
                  <td className="p-3.5 font-bold text-amber-400">{t.status}</td>
                  <td className="p-3.5 text-right">
                    <button onClick={() => setSelected(t)} className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1 text-xs font-bold text-amber-300">
                      Reply
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <form onSubmit={handleReply} className="card w-full max-w-lg border-slate-800 bg-slate-900 p-6">
            <h3 className="text-lg font-black text-white">{selected.subject}</h3>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {selected.messages?.map((m) => (
                <div key={m.id} className={`rounded-xl p-3 text-xs leading-relaxed border ${m.fromAdmin ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-200' : 'bg-slate-950 border-slate-800 text-slate-300'}`}>
                  <div className="text-[10px] font-bold uppercase text-slate-500 mb-1">{m.fromAdmin ? 'Operator' : 'Miner'}</div>
                  {m.body}
                </div>
              ))}
            </div>

            <div className="mt-4">
              <label className="block text-xs font-bold uppercase text-slate-400">Operator Reply</label>
              <textarea
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                rows={4}
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-white outline-none focus:border-amber-500"
                placeholder="Type resolution reply to the miner…"
                required
              />
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button type="button" onClick={() => setSelected(null)} className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
              <button type="submit" disabled={busy} className="btn-gold rounded-xl px-5 py-2 text-xs font-black uppercase text-slate-950">Send & Resolve</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── TAB 6: Tasks & Bounties ─────────────────────────── */

function TasksTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [tasks, setTasks] = useState<AdminTaskItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [editTask, setEditTask] = useState<AdminTaskItem | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await listAdminTasks();
      setTasks(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    } finally {
      setBusy(false);
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveTask(dto: any) {
    if (!editTask) return;
    try {
      await updateAdminTask(editTask.id, dto);
      setEditTask(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Task update failed.');
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-white">Daily Tasks, Quizzes & Bounties Configuration</h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tasks.map((task) => (
          <div key={task.id} className="card border-slate-800 bg-slate-900/80 p-5">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                {task.type}
              </span>
              <span className="font-mono text-sm font-bold text-amber-400">+{task.rewardPoints} PTS</span>
            </div>
            <h3 className="mt-3 font-bold text-white">{task.title}</h3>
            <p className="mt-1 text-xs text-slate-400">Cooldown: {task.cooldownHours}h • Status: {task.active ? 'Active' : 'Disabled'}</p>

            <button
              onClick={() => setEditTask(task)}
              className="btn-gold mt-4 w-full rounded-xl py-2 text-xs font-black uppercase text-slate-950"
            >
              ⚙️ Configure Task
            </button>
          </div>
        ))}
      </div>

      {editTask && (
        <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSave={handleSaveTask} />
      )}
    </div>
  );
}

function EditTaskModal({
  task,
  onClose,
  onSave,
}: {
  task: AdminTaskItem;
  onClose: () => void;
  onSave: (dto: any) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [rewardPoints, setRewardPoints] = useState(String(task.rewardPoints));
  const [cooldownHours, setCooldownHours] = useState(String(task.cooldownHours));
  const [active, setActive] = useState(task.active);
  const [actionUrl, setActionUrl] = useState(task.actionUrl ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onSave({
      title,
      rewardPoints: Number(rewardPoints),
      cooldownHours: Number(cooldownHours),
      active,
      actionUrl: actionUrl || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <form onSubmit={submit} className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white">Configure Task: {task.type}</h3>

        <div className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Task Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Reward (PTS)</label>
            <input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white font-mono font-bold text-amber-400"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Cooldown (Hours)</label>
            <input
              type="number"
              value={cooldownHours}
              onChange={(e) => setCooldownHours(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
              required
            />
          </div>
          {task.type !== 'QUIZ' && task.type !== 'SPIN_WHEEL' && (
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400">Social Action URL</label>
              <input
                type="url"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="https://x.com/..."
                className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white"
              />
            </div>
          )}
          <label className="flex items-center gap-2 pt-2 text-xs font-bold text-slate-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="rounded"
            />
            <span>Active & Visible to Miners</span>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400">Cancel</button>
          <button type="submit" className="btn-gold rounded-xl px-5 py-2 text-xs font-black uppercase text-slate-950">Save Settings</button>
        </div>
      </form>
    </div>
  );
}
