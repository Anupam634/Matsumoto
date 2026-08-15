'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  listUsers,
  ApiError,
  type AdminUserRow,
} from '../../lib/admin-api';
import { countryFlag } from '../../lib/countries';
import { InspectUserModal } from './modals/InspectUserModal';
import { BanUserModal } from './modals/BanUserModal';
import { RateAdjustModal } from './modals/RateAdjustModal';
import { AirdropModal } from './modals/AirdropModal';

interface MinersTabProps {
  onChanged: () => void;
  onUnauthorized: () => void;
}

export function MinersTab({ onChanged, onUnauthorized }: MinersTabProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<
    'ALL' | 'ACTIVE' | 'BLOCKED' | 'KYC_APPROVED' | 'BOOSTED'
  >('ALL');
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active Modals
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
          {(['ALL', 'ACTIVE', 'BLOCKED', 'KYC_APPROVED', 'BOOSTED'] as const).map(
            (f) => (
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
            ),
          )}
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
                      <div className="font-bold text-white">
                        {u.email ?? 'Wallet Account'}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {u.id}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center gap-1.5 font-semibold">
                        <span>
                          {u.countryCode && u.countryCode !== 'unknown'
                            ? countryFlag(u.countryCode)
                            : '🌐'}
                        </span>
                        <span>
                          {u.countryCode && u.countryCode !== 'unknown'
                            ? u.countryCode
                            : 'Global'}
                        </span>
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-amber-400">
                        {u.ratePerHour.toFixed(2)} /h
                      </span>
                      {u.rateAdjustMilli !== 0 && (
                        <span className="ml-1 text-[10px] text-cyan-400">
                          ({u.rateAdjustMilli > 0 ? '+' : ''}
                          {(u.rateAdjustMilli / 1000).toFixed(2)})
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-white">
                        {u.balancePoints.toFixed(2)}
                      </span>
                      <span className="ml-1 text-[10px] text-slate-400">PTS</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-slate-200">
                        {u.referralCount}
                      </span>
                      <span className="ml-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 text-[10px] font-bold text-indigo-300">
                        L{u.referralTier.level} ({u.referralTier.multiplier}×)
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          u.kycStatus === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : u.kycStatus === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : u.kycStatus === 'REJECTED'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
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

      {/* Modals */}
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
