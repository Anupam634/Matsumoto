'use client';

import React, { useState } from 'react';
import { airdrop, ApiError, type AdminUserRow } from '../../../lib/admin-api';

interface AirdropModalProps {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}

export function AirdropModal({ user, onClose, onSuccess }: AirdropModalProps) {
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
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
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
