'use client';

/**
 * Admin panel (SPEC §6). Internal operator tooling, so the copy is English-only
 * rather than routed through next-intl — the three-locale requirement is for
 * the miner-facing app.
 */

import { Fragment, useCallback, useEffect, useState } from 'react';
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
} from '../../../lib/admin-api';
import { countryFlag, countryName } from '../../../lib/countries';

type Tab = 'miners' | 'withdrawals' | 'kyc' | 'support';

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => setAuthed(!!getAdminToken()), []);

  if (authed === null) return null; // avoid a login flash before hydration
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

/* ─────────────────────────── Login ─────────────────────────── */

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
    <div className="glow-field-light flex min-h-dvh items-center justify-center px-5">
      <form onSubmit={submit} className="card-soft w-full max-w-sm p-7">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <h1 className="font-bold">Admin panel</h1>
            <p className="text-xs text-slate-500">Operators only</p>
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Email
          </span>
          <input
            className="input-field mt-1.5"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="mt-4 block">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Password
          </span>
          <input
            className="input-field mt-1.5"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn-primary mt-6 w-full py-3">
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}

/* ─────────────────────────── Panel ─────────────────────────── */

function Panel({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('miners');
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
  }, [loadStats]);

  return (
    <div className="glow-field-light min-h-dvh text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <span className="flex items-center gap-2 font-bold">
            <LogoMark size={32} /> Admin panel
          </span>
          <button onClick={onSignOut} className="btn-outline-brand px-4 py-2 text-sm">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-6 sm:px-6">
        {error && (
          <p className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <StatCard label="Active miners (24h)" value={stats?.activeMiners} />
          <StatCard label="Total users" value={stats?.totalUsers} />
          <StatCard
            label="Total balance"
            value={stats?.totalBalancePoints}
            suffix=" pts"
            decimals={2}
          />
          <StatCard label="Pending withdrawals" value={stats?.pendingWithdrawals} />
          <StatCard label="Blocked" value={stats?.blockedUsers} />
        </div>

        {/* Users by country */}
        {stats && stats.usersByCountry.length > 0 && (
          <section className="card-soft mt-4 p-5">
            <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Users by country
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.usersByCountry.map((c) => (
                <span
                  key={c.countryCode}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm"
                >
                  <Country code={c.countryCode} />{' '}
                  <span className="font-semibold text-slate-500">{c.users}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Tabs */}
        <div className="tab-switch mt-6 inline-flex">
          <button data-active={tab === 'miners'} onClick={() => setTab('miners')}>
            Miners
          </button>
          <button
            data-active={tab === 'withdrawals'}
            onClick={() => setTab('withdrawals')}
          >
            Withdrawals
            {stats?.pendingWithdrawals ? ` (${stats.pendingWithdrawals})` : ''}
          </button>
          <button data-active={tab === 'kyc'} onClick={() => setTab('kyc')}>
            KYC
          </button>
          <button data-active={tab === 'support'} onClick={() => setTab('support')}>
            Support
          </button>
        </div>

        <div className="mt-4">
          {tab === 'miners' && (
            <MinersTab onChanged={loadStats} onUnauthorized={onSignOut} />
          )}
          {tab === 'withdrawals' && (
            <WithdrawalsTab onChanged={loadStats} onUnauthorized={onSignOut} />
          )}
          {tab === 'kyc' && <KycTab onUnauthorized={onSignOut} />}
          {tab === 'support' && <SupportTab onUnauthorized={onSignOut} />}
        </div>
      </main>
    </div>
  );
}

/** Flag + full country name; falls back to a dash when unknown. */
function Country({ code }: { code: string | null }) {
  if (!code || code === 'unknown') {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span title={code}>
      {countryFlag(code)} {countryName(code)}
    </span>
  );
}

function StatCard({
  label,
  value,
  suffix = '',
  decimals = 0,
}: {
  label: string;
  value?: number;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div className="card-soft p-4">
      <div className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">
        {value === undefined ? (
          <span className="skeleton block h-7 w-16" />
        ) : (
          `${value.toFixed(decimals)}${suffix}`
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────── Miners ────────────────────────── */

function MinersTab({
  onChanged,
  onUnauthorized,
}: {
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function act(fn: () => Promise<unknown>) {
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    }
  }

  const pages = Math.max(1, Math.ceil(total / 25));

  return (
    <section className="card-soft overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
        <input
          className="input-field max-w-xs"
          placeholder="Search email, id, referral code…"
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
        />
        <span className="text-sm text-slate-500">{total} miners</span>
      </div>

      {error && <p className="bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[62rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Miner</th>
              <th className="p-3">Country</th>
              <th className="p-3">Rate</th>
              <th className="p-3">Balance</th>
              <th className="p-3">Refs / tier</th>
              <th className="p-3">KYC</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <MinerRow
                key={u.id}
                u={u}
                open={openId === u.id}
                onToggle={() => setOpenId(openId === u.id ? null : u.id)}
                onAct={act}
              />
            ))}
            {!rows.length && !busy && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No miners match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 p-3 text-sm">
          <button
            className="btn-outline-brand px-3 py-1.5 disabled:opacity-40"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <span className="text-slate-500">
            Page {page} of {pages}
          </span>
          <button
            className="btn-outline-brand px-3 py-1.5 disabled:opacity-40"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}

function MinerRow({
  u,
  open,
  onToggle,
  onAct,
}: {
  u: AdminUserRow;
  open: boolean;
  onToggle: () => void;
  onAct: (fn: () => Promise<unknown>) => Promise<void>;
}) {
  return (
    <>
      <tr className="border-t border-slate-100 align-middle hover:bg-slate-50/60">
        <td className="p-3">
          <button onClick={onToggle} className="text-left">
            <div className="font-medium text-indigo-700 hover:underline">
              {u.email ?? '(no email)'}
            </div>
            <div className="font-mono text-xs text-slate-400">{u.id.slice(0, 14)}…</div>
          </button>
        </td>
        <td className="p-3"><Country code={u.countryCode} /></td>
        <td className="p-3 tabular-nums">
          {u.ratePerHour} /h
          {u.rateAdjustMilli !== 0 && (
            <span
              className={`ml-1 text-xs ${u.rateAdjustMilli > 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              ({u.rateAdjustMilli > 0 ? '+' : ''}
              {u.rateAdjustMilli / 1000})
            </span>
          )}
        </td>
        <td className="p-3 tabular-nums">{u.balancePoints.toFixed(2)}</td>
        <td className="p-3">
          {u.referralCount}{' '}
          <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-600">
            L{u.referralTier.level}×{u.referralTier.multiplier}
          </span>
        </td>
        <td className="p-3">
          <KycBadge status={u.kycStatus} />
        </td>
        <td className="p-3">
          {u.isBlocked ? (
            <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
              Blocked
            </span>
          ) : (
            <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-600">
              Active
            </span>
          )}
        </td>
        <td className="p-3">
          <div className="flex justify-end gap-2">
            <button
              onClick={() =>
                onAct(() => setBlocked(u.id, !u.isBlocked))
              }
              className="btn-outline-brand px-3 py-1.5 text-xs"
            >
              {u.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button
              onClick={() => {
                const v = prompt(
                  `Hash-rate adjustment for ${u.email ?? u.id}, in points/hour.\nApplied before the referral multiplier. Negative throttles.`,
                  String(u.rateAdjustMilli / 1000),
                );
                if (v === null) return;
                const pts = Number(v);
                if (!Number.isFinite(pts)) return alert('Not a number.');
                onAct(() => adjustRate(u.id, Math.round(pts * 1000)));
              }}
              className="btn-outline-brand px-3 py-1.5 text-xs"
            >
              Rate
            </button>
            <button
              onClick={() => {
                const v = prompt(`Airdrop how many points to ${u.email ?? u.id}?`, '100');
                if (v === null) return;
                const pts = Number(v);
                if (!Number.isFinite(pts) || pts <= 0) return alert('Enter a positive number.');
                const note = prompt('Reason (optional)') ?? undefined;
                onAct(() => airdrop(u.id, Math.round(pts), note));
              }}
              className="btn-outline-brand px-3 py-1.5 text-xs"
            >
              Airdrop
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-slate-100 bg-slate-50/60">
          <td colSpan={8} className="p-4">
            <MinerDetail id={u.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function KycBadge({ status }: { status: string }) {
  const tone =
    status === 'APPROVED'
      ? 'bg-emerald-50 text-emerald-600'
      : status === 'PENDING'
        ? 'bg-amber-50 text-amber-700'
        : status === 'REJECTED'
          ? 'bg-red-50 text-red-600'
          : 'bg-slate-100 text-slate-500';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

/** Expanded row: referral tree + recent ledger. */
function MinerDetail({ id }: { id: string }) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserDetail(id)
      .then(setData)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load.'),
      );
  }, [id]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!data) return <div className="skeleton h-24 w-full" />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Referral tree ({data.user.referralCount} direct)
        </h3>
        {data.referralTree.length ? (
          <div className="mt-2">
            <Tree nodes={data.referralTree} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No referrals yet.</p>
        )}
      </div>

      <div>
        <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Recent activity
        </h3>
        {data.ledger.length ? (
          <ul className="mt-2 space-y-1 text-sm">
            {data.ledger.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-slate-600">{l.reason}</span>
                <span
                  className={`tabular-nums font-medium ${l.points >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                >
                  {l.points >= 0 ? '+' : ''}
                  {l.points.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No ledger entries.</p>
        )}
      </div>
    </div>
  );
}

function Tree({ nodes }: { nodes: TreeNode[] }) {
  return (
    <ul className="space-y-1 border-l border-slate-200 pl-3 text-sm">
      {nodes.map((n) => (
        <li key={n.id}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-700">{n.email ?? n.id.slice(0, 12)}</span>
            {n.countryCode && (
              <span className="text-xs text-slate-400">
                {countryFlag(n.countryCode)} {countryName(n.countryCode)}
              </span>
            )}
            <span className="tabular-nums text-xs text-slate-500">
              {n.balancePoints.toFixed(2)} pts
            </span>
            {n.isBlocked && (
              <span className="rounded-full bg-red-50 px-1.5 text-xs text-red-600">
                blocked
              </span>
            )}
          </div>
          {n.children.length > 0 && (
            <div className="mt-1">
              <Tree nodes={n.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ──────────────────────── Withdrawals ──────────────────────── */

function WithdrawalsTab({
  onChanged,
  onUnauthorized,
}: {
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listWithdrawals(status));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    }
  }, [status, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(w: AdminWithdrawal, approve: boolean) {
    const note = prompt(
      approve
        ? `Approve ${w.points} pts → ${w.tokenAmount} $Matsumoto to ${w.toAddress}?\nOptional note:`
        : 'Reason for rejection (points are refunded):',
      approve ? 'Verified' : 'Failed review',
    );
    if (note === null) return;
    setBusyId(w.id);
    try {
      await decideWithdrawal(w.id, approve, note);
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card-soft overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
        {['PENDING', 'PAID', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatus(s)}
            data-active={status === s}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm data-[active=true]:border-indigo-200 data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700"
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[58rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Miner</th>
              <th className="p-3">Points</th>
              <th className="p-3">$Matsumoto</th>
              <th className="p-3">To address</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="p-3">
                  <div>{w.userEmail ?? w.userId.slice(0, 12)}</div>
                  <div className="text-xs text-slate-400">
                    {new Date(w.requestedAt).toLocaleString()}
                  </div>
                </td>
                <td className="p-3 tabular-nums">{w.points.toFixed(2)}</td>
                <td className="p-3 tabular-nums">
                  {Number(w.tokenAmount).toFixed(4)}
                </td>
                <td className="p-3 font-mono text-xs">
                  {w.toAddress.slice(0, 10)}…{w.toAddress.slice(-6)}
                </td>
                <td className="p-3">
                  <WithdrawalBadge status={w.status} />
                  {w.txHash && (
                    <div className="mt-1 font-mono text-[0.65rem] text-slate-400">
                      {w.txHash.slice(0, 14)}…
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {w.status === 'PENDING' ? (
                    <div className="flex justify-end gap-2">
                      <button
                        disabled={busyId === w.id}
                        onClick={() => decide(w, true)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        Approve
                      </button>
                      <button
                        disabled={busyId === w.id}
                        onClick={() => decide(w, false)}
                        className="btn-outline-brand px-3 py-1.5 text-xs"
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-right text-xs text-slate-400">
                      {w.adminNote ?? '—'}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Nothing in this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WithdrawalBadge({ status }: { status: string }) {
  const tone =
    status === 'PAID'
      ? 'bg-emerald-50 text-emerald-600'
      : status === 'PENDING'
        ? 'bg-amber-50 text-amber-700'
        : status === 'REJECTED'
          ? 'bg-red-50 text-red-600'
          : 'bg-slate-100 text-slate-500';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status}
    </span>
  );
}

/* ─────────────────────────── KYC review ────────────────────── */

function SupportTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [status, setStatus] = useState('OPEN');
  const [rows, setRows] = useState<AdminSupportTicket[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listSupport(status));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    }
  }, [status, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(id: string, close: boolean) {
    if (draft.trim().length === 0) return;
    setBusyId(id);
    try {
      await replySupport(id, draft.trim(), close ? 'CLOSED' : 'ANSWERED');
      setDraft('');
      setOpenId(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="tab-switch inline-flex">
        {['OPEN', 'ANSWERED', 'CLOSED', ''].map((s) => (
          <button key={s || 'all'} data-active={status === s} onClick={() => setStatus(s)}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="admin-error mt-3">{error}</p>}

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No tickets here.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="card-soft p-4">
              <button
                onClick={() => {
                  setOpenId(openId === row.id ? null : row.id);
                  setDraft('');
                }}
                className="flex w-full items-start justify-between gap-3 text-left"
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{row.subject}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {row.userEmail ?? 'no email'} · {row.messages.length} messages ·
                    last activity {new Date(row.updatedAt).toLocaleString()}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {row.status}
                </span>
              </button>

              {openId === row.id && (
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <ol className="space-y-2">
                    {row.messages.map((m) => (
                      <li
                        key={m.id}
                        className={`rounded-lg p-3 text-sm ${
                          m.fromAdmin ? 'bg-indigo-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          {m.fromAdmin ? 'You' : 'Miner'} ·{' '}
                          {new Date(m.createdAt).toLocaleString()}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-slate-700">
                          {m.body}
                        </p>
                      </li>
                    ))}
                  </ol>

                  <textarea
                    className="input-field mt-3 min-h-[5rem] resize-y"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={4000}
                    placeholder="Your reply…"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => send(row.id, false)}
                      disabled={busyId === row.id || draft.trim().length === 0}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      {busyId === row.id ? 'Sending…' : 'Reply'}
                    </button>
                    <button
                      onClick={() => send(row.id, true)}
                      disabled={busyId === row.id || draft.trim().length === 0}
                      className="btn-outline-brand px-4 py-2 text-sm"
                    >
                      Reply and close
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function KycTab({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<AdminKycRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listKyc(status));
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    }
  }, [status, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(row: AdminKycRow, approve: boolean) {
    const note = prompt(
      approve
        ? `Approve ${row.fullName ?? row.userEmail}? Optional note:`
        : `Reason for rejecting ${row.fullName ?? row.userEmail}? (shown to the user, and their documents are deleted)`,
      approve ? 'Documents match' : 'Document unreadable',
    );
    if (note === null) return;
    setBusyId(row.userId);
    try {
      await decideKyc(row.userId, approve, note);
      setOpenId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="card-soft overflow-hidden">
      <div className="flex flex-wrap gap-2 border-b border-slate-200 p-4">
        {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
          <button
            key={s || 'ALL'}
            onClick={() => setStatus(s)}
            data-active={status === s}
            className="rounded-full border border-slate-200 px-3 py-1.5 text-sm data-[active=true]:border-indigo-200 data-[active=true]:bg-indigo-50 data-[active=true]:text-indigo-700"
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {error && <p className="bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="p-3">Applicant</th>
              <th className="p-3">Document</th>
              <th className="p-3">Country</th>
              <th className="p-3">Docs</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Review</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.userId}>
                <tr className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="p-3">
                    <button
                      onClick={() => setOpenId(openId === r.userId ? null : r.userId)}
                      className="text-left"
                    >
                      <div className="font-medium text-indigo-700 hover:underline">
                        {r.fullName ?? '(no name)'}
                      </div>
                      <div className="text-xs text-slate-400">{r.userEmail}</div>
                    </button>
                  </td>
                  <td className="p-3">
                    <div>{r.documentType?.replace('_', ' ') ?? '—'}</div>
                    <div className="font-mono text-xs text-slate-400">
                      {r.documentNumber ?? ''}
                    </div>
                  </td>
                  <td className="p-3"><Country code={r.countryCode} /></td>
                  <td className="p-3 tabular-nums">{r.documentCount}</td>
                  <td className="p-3">
                    <KycBadge status={r.status} />
                  </td>
                  <td className="p-3">
                    {r.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          disabled={busyId === r.userId}
                          onClick={() => decide(r, true)}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Approve
                        </button>
                        <button
                          disabled={busyId === r.userId}
                          onClick={() => decide(r, false)}
                          className="btn-outline-brand px-3 py-1.5 text-xs"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <div className="text-right text-xs text-slate-400">
                        {r.reviewerNote ?? '—'}
                      </div>
                    )}
                  </td>
                </tr>
                {openId === r.userId && (
                  <tr className="border-t border-slate-100 bg-slate-50/60">
                    <td colSpan={6} className="p-4">
                      <KycDocuments userId={r.userId} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  Nothing in this queue.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Loads the applicant's images on demand — they aren't in the list payload. */
function KycDocuments({ userId }: { userId: string }) {
  const [detail, setDetail] = useState<AdminKycDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getKycDetail(userId)
      .then(setDetail)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'Failed to load.'),
      );
  }, [userId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!detail) return <div className="skeleton h-40 w-full" />;
  if (!detail.documents.length)
    return (
      <p className="text-sm text-slate-500">
        No documents on file (they are deleted when an application is rejected).
      </p>
    );

  return (
    <div className="flex flex-wrap gap-4">
      {detail.documents.map((d) => (
        <figure key={d.id}>
          <a href={d.dataUrl} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={d.dataUrl}
              alt={d.kind}
              className="h-44 w-64 rounded-xl border border-slate-200 bg-white object-contain"
            />
          </a>
          <figcaption className="mt-1 text-center text-xs uppercase tracking-wide text-slate-500">
            {d.kind}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
