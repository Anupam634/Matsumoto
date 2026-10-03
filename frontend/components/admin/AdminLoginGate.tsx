'use client';

import React, { useState } from 'react';
import { LogoMark } from '../Logo';
import { adminLogin, AdminApiError, ApiError } from '../../lib/admin-api';

interface AdminLoginGateProps {
  onDone: () => void;
}

/**
 * Two steps: the password, then the code the server mails to the operator
 * inbox (ADMIN_OTP_EMAIL). The second step sends the password again with the
 * code — the server keeps no half-signed-in state — so it stays in memory
 * here until the code is accepted or the operator goes back.
 */
export function AdminLoginGate({ onDone }: AdminLoginGateProps) {
  const [step, setStep] = useState<'credentials' | 'code'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /**
   * Ask for a code. Resolves true when the server signed in straight away —
   * which it does only with ADMIN_LOGIN_OTP_ENFORCED=false.
   */
  async function requestCode(): Promise<boolean> {
    try {
      await adminLogin(email.trim(), password);
      return true;
    } catch (err) {
      if (err instanceof AdminApiError && err.code === 'OTP_REQUIRED') {
        setSentTo(err.sentTo ?? []);
        setCode('');
        setStep('code');
        return false;
      }
      throw err;
    }
  }

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (await requestCode()) onDone();
    } catch (err) {
      // PASSWORD_PUBLISHED, throttling and SMTP failures all arrive with a
      // message written for the operator; show it as-is.
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Enter the 6-digit code from the email.');
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await adminLogin(email.trim(), password, code);
      onDone();
    } catch (err) {
      setCode('');
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (await requestCode()) {
        onDone();
        return;
      }
      setInfo('A new code is on its way. Only the newest code works.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    } finally {
      setBusy(false);
    }
  }

  function back() {
    setStep('credentials');
    setCode('');
    setError(null);
    setInfo(null);
  }

  return (
    <div className="glow-field min-h-dvh flex items-center justify-center bg-slate-950 px-5 text-slate-100">
      <form
        onSubmit={step === 'credentials' ? submitCredentials : submitCode}
        className="card w-full max-w-md border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-2xl"
      >
        <div className="mb-6 flex items-center gap-3 border-b border-white/[0.08] pb-4">
          <LogoMark size={36} priority />
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">BONDKOIN Command Console</h1>
            <p className="text-xs font-semibold text-amber-400">Enterprise Operator Administration</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <span className="font-bold">⚠</span> {error}
          </div>
        )}
        {info && (
          <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300">
            ✓ {info}
          </div>
        )}

        {step === 'credentials' ? (
          <>
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
                placeholder="admin@bondkoinlabs.com"
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
              {busy ? 'Verifying Credentials…' : 'Continue →'}
            </button>
            <p className="mt-3 text-center text-[11px] text-slate-500">
              A one-time sign-in code is emailed to the operator inbox after this step.
            </p>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
              <div className="font-bold">📧 Check the operator inbox</div>
              <div className="mt-1 text-amber-100/90">
                {sentTo.length > 0
                  ? `Code sent to ${sentTo.join(', ')}.`
                  : 'A sign-in code was emailed to the operator inbox.'}{' '}
                It expires in 10 minutes. Check spam if it isn&apos;t there.
              </div>
            </div>

            <label className="mt-4 block">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                6-Digit Sign-in Code
              </span>
              <input
                className="mt-1.5 w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3.5 text-center font-mono text-2xl font-black tracking-[0.5em] text-amber-400 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••••"
                autoFocus
                required
              />
            </label>

            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="btn-gold mt-6 w-full rounded-xl py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50"
            >
              {busy ? 'Verifying Code…' : 'Verify & Access Console →'}
            </button>

            <div className="mt-4 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={back}
                disabled={busy}
                className="font-bold text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={resend}
                disabled={busy}
                className="font-bold text-amber-400 transition hover:text-amber-300 disabled:opacity-40"
              >
                Resend Code
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
