'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getAdminToken,
  getAdminInfo,
  adminLogout,
  type AdminSelf,
} from '../../../../lib/admin-api';
import {
  listCryptoPayments,
  getCollectorStatus,
  ApiError,
  type CryptoPayment,
  type CollectorStatus,
} from '../../../../lib/finance-api';
import { AdminLoginGate } from '../../../../components/admin/AdminLoginGate';

export default function FinanceClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => setAuthed(!!getAdminToken()), []);

  if (authed === null) return null;
  if (!authed) return <AdminLoginGate onDone={() => setAuthed(true)} />;
  return (
    <Panel
      onSignOut={() => {
        adminLogout();
        setAuthed(false);
      }}
    />
  );
}

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'AWAITING_PAYMENT', 'FAILED', 'EXPIRED'];

function Panel({ onSignOut }: { onSignOut: () => void }) {
  const self = getAdminInfo();
  const authorized = self?.role === 'super' || !!self?.permissions?.includes('CRYPTO_PAYMENT_VIEW');

  if (!authorized) {
    return <AccessDenied self={self} onSignOut={onSignOut} />;
  }
  return <FinanceDashboard self={self!} onSignOut={onSignOut} />;
}

function AccessDenied({ self, onSignOut }: { self: AdminSelf | null; onSignOut: () => void }) {
  return (
    <div className="glow-field flex min-h-dvh items-center justify-center bg-slate-950 px-5 text-slate-100">
      <div className="card max-w-md border-slate-800 bg-slate-900/90 p-8 text-center shadow-2xl backdrop-blur-2xl">
        <div className="mb-3 text-3xl">🔒</div>
        <h1 className="mb-2 text-lg font-black text-white">Finance module — restricted</h1>
        <p className="mb-6 text-xs text-slate-400">
          {self?.email ?? 'This account'} does not hold the{' '}
          <code className="rounded bg-slate-950 px-1.5 py-0.5 text-amber-300">CRYPTO_PAYMENT_VIEW</code>{' '}
          permission. Ask a super admin to grant it, or sign in with a super admin account.
        </p>
        <button
          type="button"
          onClick={onSignOut}
          className="rounded-xl border border-white/15 bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

function FinanceDashboard({ self, onSignOut }: { self: AdminSelf; onSignOut: () => void }) {
  const [collectors, setCollectors] = useState<CollectorStatus[]>([]);
  const [payments, setPayments] = useState<CryptoPayment[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [collectorFilter, setCollectorFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [c, p] = await Promise.all([
        getCollectorStatus(),
        listCryptoPayments({ status: statusFilter, collectorId: collectorFilter, search }),
      ]);
      setCollectors(c);
      setPayments(p);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSignOut();
      if (err instanceof ApiError && err.status === 403) {
        setError('This account no longer has CRYPTO_PAYMENT_VIEW access.');
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, collectorFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      <header className="flex items-center justify-between border-b border-white/[0.08] bg-slate-900/60 px-6 py-4">
        <div>
          <h1 className="text-lg font-black text-white">💰 Crypto Finance</h1>
          <p className="text-xs text-slate-400">
            Every collector wallet's payments · not part of the general admin panel
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">
            {self.email} · <span className="text-amber-300 font-bold">{self.role}</span>
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className="rounded-lg border border-white/15 bg-slate-800 px-3 py-1.5 font-bold text-white hover:bg-slate-700"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-8">
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
            ⚠️ {error}
          </div>
        )}

        {/* Collector wallets & daily cap status */}
        <div className="grid gap-4 sm:grid-cols-2">
          {collectors.map((c) => (
            <div key={c.id} className="rounded-xl border border-white/10 bg-slate-900/80 p-4">
              <div className="flex items-center justify-between">
                <div className="font-bold text-white">{c.label}</div>
                {c.capReached && (
                  <span className="rounded-full border border-rose-500/40 bg-rose-950/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    CAP REACHED
                  </span>
                )}
              </div>
              <div className="mt-1 font-mono text-[11px] text-slate-500" title={c.walletAddress}>
                {c.walletAddress.slice(0, 10)}...{c.walletAddress.slice(-8)}
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-xl font-black text-amber-300">${c.collectedTodayUsd.toFixed(2)}</span>
                <span className="text-xs text-slate-400">
                  today {c.dailyCapUsd == null ? '(no cap)' : `of $${c.dailyCapUsd}/day`}
                </span>
              </div>
              {c.dailyCapUsd != null && (
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full rounded-full ${c.capReached ? 'bg-rose-500' : 'bg-amber-400'}`}
                    style={{
                      width: `${Math.min(100, (c.collectedTodayUsd / c.dailyCapUsd) * 100)}%`,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-1 text-xs font-semibold">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-2.5 py-1 transition-all ${
                  statusFilter === s
                    ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setCollectorFilter('ALL')}
              className={`rounded-md px-2.5 py-1 ${collectorFilter === 'ALL' ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All wallets
            </button>
            {collectors.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCollectorFilter(c.id)}
                className={`rounded-md px-2.5 py-1 ${collectorFilter === c.id ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, wallet, txHash..."
              className="input-field w-64 text-xs"
            />
            <button
              type="button"
              onClick={load}
              className="rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
            >
              🔍 Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading payments...</div>
        ) : payments.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
            No crypto payments match this filter.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/80">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/80 font-mono text-slate-400">
                  <th className="p-3">User</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Collector wallet</th>
                  <th className="p-3">Network</th>
                  <th className="p-3">Status &amp; TxHash</th>
                  <th className="p-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {payments.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-white/[0.02]">
                    <td className="p-3">
                      <div className="font-bold text-white">{p.userEmail}</div>
                      <div className="font-mono text-[10px] text-slate-500">{p.userId}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-amber-300">${p.amountUsd}.00</span>
                      <div className="font-mono text-[11px] text-slate-400">
                        {p.expectedAmount} {p.tokenSymbol}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-slate-200">{p.collectorLabel}</div>
                      <div className="font-mono text-[10px] text-slate-500" title={p.receivingWallet}>
                        {p.receivingWallet.slice(0, 8)}...{p.receivingWallet.slice(-6)}
                      </div>
                    </td>
                    <td className="p-3 text-slate-400">{p.network}</td>
                    <td className="p-3">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                          p.status === 'CONFIRMED'
                            ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
                            : p.status === 'FAILED'
                              ? 'border-rose-500/40 bg-rose-950/40 text-rose-300'
                              : p.status === 'EXPIRED'
                                ? 'border-slate-600/40 bg-slate-800/60 text-slate-400'
                                : 'border-amber-500/40 bg-amber-950/40 text-amber-300'
                        }`}
                      >
                        {p.status.replace('_', ' ')}
                      </span>
                      {p.txHash && (
                        <div className="mt-1 font-mono text-[10px] text-slate-500" title={p.txHash}>
                          {p.txHash.slice(0, 10)}...{p.txHash.slice(-8)}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-slate-400">{new Date(p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
