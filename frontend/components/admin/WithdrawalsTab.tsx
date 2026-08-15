'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listWithdrawals,
  decideWithdrawal,
  ApiError,
  type AdminWithdrawal,
} from '../../lib/admin-api';

export function WithdrawalsTab({
  onChanged,
  onUnauthorized,
}: {
  onChanged: () => void;
  onUnauthorized: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>('PENDING');
  const [rows, setRows] = useState<AdminWithdrawal[]>([]);
  const [busy, setBusy] = useState(false);

  // Reject Modal State (Replaces browser prompt)
  const [rejectingWithdrawal, setRejectingWithdrawal] = useState<AdminWithdrawal | null>(null);
  const [rejectReason, setRejectReason] = useState('Suspicious multi-accounting activity');
  const [submittingReject, setSubmittingReject] = useState(false);

  const rejectionPresets = [
    'Suspicious multi-accounting activity',
    'Invalid recipient BEP-20 wallet address',
    'KYC verification discrepancy',
    'Points earned via automated bot traffic',
  ];

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const data = await listWithdrawals(
        statusFilter === 'ALL' ? undefined : statusFilter,
      );
      setRows(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    } finally {
      setBusy(false);
    }
  }, [statusFilter, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(w: AdminWithdrawal) {
    if (!confirm(`Confirm on-chain payout of ${w.tokenAmount} MATSU to wallet ${w.toAddress}?`)) {
      return;
    }
    setBusy(true);
    try {
      await decideWithdrawal(w.id, true);
      load();
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Approval failed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirmReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingWithdrawal) return;
    setSubmittingReject(true);
    try {
      await decideWithdrawal(rejectingWithdrawal.id, false, rejectReason.trim());
      setRejectingWithdrawal(null);
      load();
      onChanged();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Rejection failed.');
    } finally {
      setSubmittingReject(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Withdrawals Moderation Queue</h2>
          <p className="text-xs text-slate-400">
            Review pending BEP-20 payouts on BNB Smart Chain
          </p>
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
                  <td
                    colSpan={7}
                    className="p-8 text-center text-slate-500 font-sans"
                  >
                    {busy ? 'Loading queue…' : 'No withdrawal requests found for this filter.'}
                  </td>
                </tr>
              ) : (
                rows.map((w) => (
                  <tr key={w.id} className="transition hover:bg-slate-800/40">
                    <td className="p-3.5 text-slate-400">
                      {new Date(w.requestedAt).toLocaleString()}
                    </td>
                    <td className="p-3.5 font-sans font-bold text-white">
                      {w.userEmail ?? w.userId.slice(0, 8)}
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">{w.points} PTS</td>
                    <td className="p-3.5 font-bold text-cyan-400">
                      {w.tokenAmount} MATSU
                    </td>
                    <td className="p-3.5 text-slate-400 truncate max-w-xs" title={w.toAddress}>
                      {w.toAddress}
                    </td>
                    <td className="p-3.5 font-sans">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          w.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : w.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {w.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      {w.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(w)}
                            className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-black uppercase text-slate-950 hover:bg-emerald-400 transition"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => {
                              setRejectingWithdrawal(w);
                              setRejectReason(rejectionPresets[0]);
                            }}
                            className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-900/60 transition"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px]">
                          {w.adminNote ?? '—'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────── Custom In-Modal Rejection Dialog ───────────────── */}
      {rejectingWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
          <form
            onSubmit={handleConfirmReject}
            className="card w-full max-w-lg border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-white">
                  ✕ Reject Withdrawal Payout
                </h3>
                <p className="text-xs text-slate-400">
                  User will be refunded {rejectingWithdrawal.points} PTS back to their balance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRejectingWithdrawal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                Quick Rejection Reasons
              </label>
              <div className="flex flex-wrap gap-1.5">
                {rejectionPresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setRejectReason(preset)}
                    className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                      rejectReason === preset
                        ? 'border-red-500 bg-red-950/60 text-red-300'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1">
                Audit Reason (Logged on Ledger)
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white outline-none focus:border-red-500"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingWithdrawal(null)}
                className="rounded-xl border border-slate-800 px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReject}
                className="rounded-xl bg-red-600 px-5 py-2 text-xs font-black uppercase text-white hover:bg-red-500 transition disabled:opacity-50"
              >
                {submittingReject ? 'Rejecting…' : '✕ Confirm Rejection & Refund'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
