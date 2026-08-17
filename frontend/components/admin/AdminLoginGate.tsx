'use client';

import React, { useState } from 'react';
import { LogoMark } from '../Logo';
import { adminLogin, ApiError } from '../../lib/admin-api';

interface AdminLoginGateProps {
  onDone: () => void;
}

export function AdminLoginGate({ onDone }: AdminLoginGateProps) {
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
    <div className="glow-field min-h-dvh flex items-center justify-center bg-slate-950 px-5 text-slate-100">
      <form
        onSubmit={submit}
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
          {busy ? 'Verifying Credentials…' : 'Access Operator Console →'}
        </button>
      </form>
    </div>
  );
}
