'use client';

import React, { useState } from 'react';
import { adjustRate, ApiError, type AdminUserRow } from '../../../lib/admin-api';

interface RateAdjustModalProps {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}

export function RateAdjustModal({ user, onClose, onSuccess }: RateAdjustModalProps) {
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
      <form
        onSubmit={handleSubmit}
        className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
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
