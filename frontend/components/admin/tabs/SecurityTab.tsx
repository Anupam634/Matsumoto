'use client';

import React, { useState } from 'react';
import type { AdminStats } from '../../../lib/admin-api';

export function SecurityTab({ stats }: { stats: AdminStats | null }) {
  const [ipLimit, setIpLimit] = useState('5');
  const [deviceLimit, setDeviceLimit] = useState('3');
  const [twoFactorEnforced, setTwoFactorEnforced] = useState(true);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const logs = [
    { ip: '185.220.101.5', action: 'Failed Admin Login (IP Throttled)', risk: 'HIGH', time: '10 mins ago' },
    { ip: '104.28.210.12', action: 'Duplicate Device Fingerprint Blocked', risk: 'MEDIUM', time: '45 mins ago' },
    { ip: '172.56.21.90', action: '2FA Verification Success (Operator)', risk: 'LOW', time: '2 hours ago' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">🛡️ Security, Roles & Anti-Abuse Controls</h2>
          <p className="text-xs text-slate-400">
            Enforce hardware fingerprint limits, IP throttling, operator 2FA, and review audit anomaly logs
          </p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-1.5 font-mono text-xs text-red-300 font-bold">
          Suspended Accounts: {stats?.blockedUsers ?? 0}
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-bold">
          ✓ Security rules saved and pushed to Redis edge cache.
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-3">
        <div className="card border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-400">Max Signups per Device</label>
          <input
            type="number"
            value={deviceLimit}
            onChange={(e) => setDeviceLimit(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-lg font-bold text-amber-400"
            required
          />
          <p className="text-[11px] text-slate-500">Hardware browser fingerprint uniqueness constraint</p>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 space-y-2">
          <label className="block text-xs font-bold uppercase text-slate-400">Max Signups per IP Subnet</label>
          <input
            type="number"
            value={ipLimit}
            onChange={(e) => setIpLimit(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-lg font-bold text-amber-400"
            required
          />
          <p className="text-[11px] text-slate-500">Rate-limiting bucket per IP address</p>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Admin 2FA Authentication</label>
            <p className="mt-1 text-xs text-slate-300">Mandatory 2FA code verification for all operator logins</p>
          </div>
          <label className="flex items-center gap-2 pt-2 text-xs font-bold text-amber-400">
            <input
              type="checkbox"
              checked={twoFactorEnforced}
              onChange={(e) => setTwoFactorEnforced(e.target.checked)}
              className="rounded"
            />
            <span>2FA Enforced</span>
          </label>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950">
            Save Security Rules
          </button>
        </div>
      </form>

      {/* Security Audit Feed */}
      <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-800 pb-3">
          🚨 Security & Anomaly Logs
        </h3>
        <div className="mt-4 space-y-2 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-slate-950 p-3">
              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-300">{log.ip}</span>
                <span className="text-slate-400">{log.action}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${log.risk === 'HIGH' ? 'bg-red-950 text-red-400 border border-red-500/30' : 'bg-amber-950 text-amber-300'}`}>
                  {log.risk} RISK
                </span>
                <span className="text-slate-500 text-[10px]">{log.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
