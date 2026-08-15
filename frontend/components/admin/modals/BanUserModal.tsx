'use client';

import React, { useState } from 'react';
import { setBlocked, ApiError, type AdminUserRow } from '../../../lib/admin-api';

interface BanUserModalProps {
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => void;
}

export function BanUserModal({ user, onClose, onSuccess }: BanUserModalProps) {
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
