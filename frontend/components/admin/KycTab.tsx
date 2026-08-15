'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  listKyc,
  getKycDetail,
  decideKyc,
  ApiError,
  type AdminKycRow,
  type AdminKycDetail,
} from '../../lib/admin-api';
import { KycInspectModal } from './modals/KycInspectModal';

interface KycTabProps {
  onUnauthorized: () => void;
}

export function KycTab({ onUnauthorized }: KycTabProps) {
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

  async function openDetail(userId: string) {
    try {
      const detail = await getKycDetail(userId);
      setSelected(detail);
    } catch {
      alert('Failed to load KYC document details.');
    }
  }

  async function handleDecide(approve: boolean) {
    if (!selected) return;
    const note = prompt(
      approve ? 'Approval note (optional):' : 'Rejection reason:',
      approve ? 'Verified' : 'Document unreadable',
    );
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
                    <td className="p-3.5 text-slate-400">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5 font-bold text-white">
                      {r.userEmail ?? r.userId.slice(0, 8)}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">{r.fullName ?? '—'}</td>
                    <td className="p-3.5 text-amber-300 font-bold">{r.documentType ?? '—'}</td>
                    <td className="p-3.5 font-mono text-slate-400">{r.documentNumber ?? '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
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

      {selected && (
        <KycInspectModal
          selected={selected}
          onClose={() => setSelected(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}
