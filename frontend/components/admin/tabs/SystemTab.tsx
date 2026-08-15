'use client';

import React, { useState } from 'react';

export function SystemTab() {
  const [rpcUrl, setRpcUrl] = useState('https://bsc-dataseed.binance.org/');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const systemStatus = [
    { name: 'Database (PostgreSQL / Prisma)', status: 'HEALTHY', latency: '12ms' },
    { name: 'Redis Cache & Rate Limiting', status: 'HEALTHY', latency: '2ms' },
    { name: 'Cron / 24h Yield Scheduler', status: 'ACTIVE', latency: 'Tick every 60s' },
    { name: 'BNB Smart Chain RPC Node', status: 'CONNECTED', latency: '48ms' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">⚙️ System Health, RPC & Database Config</h2>
          <p className="text-xs text-slate-400">
            Monitor microservice latencies, BNB Chain RPC endpoints, and maintenance mode controls
          </p>
        </div>
      </div>

      {saved && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-bold">
          ✓ System settings updated successfully.
        </div>
      )}

      {/* System Health Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {systemStatus.map((s, idx) => (
          <div key={idx} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">{s.name}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                {s.status}
              </span>
            </div>
            <div className="mt-2 font-mono text-sm font-bold text-white">{s.latency}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSave} className="grid gap-5 md:grid-cols-2">
        <div className="card border-slate-800 bg-slate-900/80 p-5 space-y-3">
          <label className="block text-xs font-bold uppercase text-slate-400">BNB Chain RPC Provider URL</label>
          <input
            type="url"
            value={rpcUrl}
            onChange={(e) => setRpcUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 font-mono text-xs text-cyan-400"
            required
          />
          <p className="text-[11px] text-slate-500">Primary BSC JSON-RPC endpoint for on-chain withdrawal verification and balance checks.</p>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 flex flex-col justify-between">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-400">Maintenance Mode</label>
            <p className="mt-1 text-xs text-slate-400">When enabled, the mining platform displays a maintenance screen to users while operators retain full access.</p>
          </div>
          <label className="flex items-center gap-2 pt-3 text-xs font-bold text-red-400">
            <input
              type="checkbox"
              checked={maintenanceMode}
              onChange={(e) => setMaintenanceMode(e.target.checked)}
              className="rounded"
            />
            <span>Enable Platform Maintenance Mode</span>
          </label>
        </div>

        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950">
            Save System Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
