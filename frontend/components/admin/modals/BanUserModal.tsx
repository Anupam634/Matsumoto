'use client';

import React, { useState } from 'react';
import { setBlocked, ApiError, type SetBlockedResult } from '../../../lib/admin-api';

/** Just what the modal needs, so any tab with a user row can open it. */
export interface BanTarget {
  id: string;
  email: string | null;
  isBlocked: boolean;
}

interface BanUserModalProps {
  user: BanTarget;
  onClose: () => void;
  onSuccess: () => void;
}

const REASON_MAX = 500;

export function BanUserModal({ user, onClose, onSuccess }: BanUserModalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<SetBlockedResult | null>(null);

  const suspending = !user.isBlocked;
  const who = user.email ?? user.id;

  async function handleToggle() {
    setBusy(true);
    setError(null);
    try {
      setResult(await setBlocked(user.id, suspending, reason));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Action failed.');
    } finally {
      setBusy(false);
    }
  }

  // After the change: say whether the user was actually told, since a failed
  // email (e.g. the mail provider's hourly cap) doesn't undo the change.
  if (result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
        <div className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h3 className="text-lg font-black text-white">
            {result.isBlocked ? 'Account suspended' : 'Account reinstated'}
          </h3>
          <p className="mt-2 text-xs text-slate-400">{who}</p>
          <div
            className={`mt-4 rounded-xl border p-3 text-xs ${
              result.emailed
                ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                : 'border-amber-500/40 bg-amber-950/30 text-amber-300'
            }`}
          >
            {result.emailed
              ? '✓ The user has been emailed about this.'
              : !result.hasEmail
                ? 'This account has no email address, so no notification was sent.'
                : '⚠ The change is saved, but the notification email could not be sent. Check the mail logs; the user was not told.'}
          </div>
          <div className="mt-6 flex justify-end">
            <button
              onClick={onSuccess}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
      <div className="card w-full max-w-md border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h3 className="text-lg font-black text-white">
          {suspending ? 'Suspend / Ban Miner Account' : 'Unsuspend Miner Account'}
        </h3>
        <p className="mt-2 text-xs leading-relaxed text-slate-400">
          {suspending
            ? `Suspending ${who} will immediately block them from signing in, tapping Mine, receiving referral commissions, and submitting withdrawals.`
            : `Re-enabling ${who} will restore their mining accrual and withdrawal privileges.`}
        </p>

        <label className="mt-4 block">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {suspending ? 'Reason' : 'Note'}{' '}
            <span className="font-normal normal-case text-slate-500">(optional, included in the email)</span>
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, REASON_MAX))}
            rows={3}
            placeholder={
              suspending
                ? 'e.g. Multiple accounts created on the same device to collect referral rewards.'
                : 'e.g. Review complete, thank you for your patience.'
            }
            className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-amber-500"
          />
          <span className="mt-1 block text-right text-[10px] text-slate-500">
            {reason.length}/{REASON_MAX}
          </span>
        </label>

        <p className="mt-2 text-[11px] text-slate-500">
          {user.email
            ? `An email will be sent to ${user.email}.`
            : 'This account has no email address; no notification will be sent.'}
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
              suspending
                ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            {busy ? 'Processing…' : suspending ? 'Confirm Suspension' : 'Confirm Unsuspend'}
          </button>
        </div>
      </div>
    </div>
  );
}
