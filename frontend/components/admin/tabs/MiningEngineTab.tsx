'use client';

import React, { useState } from 'react';

export function MiningEngineTab() {
  const [baseRate, setBaseRate] = useState('0.90');
  const [cycleHours, setCycleHours] = useState('24');
  const [conversionRate, setConversionRate] = useState('3.0'); // 3 PTS = 1 MATSU
  const [engineStatus, setEngineStatus] = useState<'RUNNING' | 'PAUSED'>('RUNNING');
  const [savedNote, setSavedNote] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSavedNote('Mining engine configuration updated successfully.');
    setTimeout(() => setSavedNote(null), 4000);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">⛏️ Mining Engine & Accrual Controller</h2>
          <p className="text-xs text-slate-400">
            Global base hashrate, 24-hour cycle length, fixed point-to-token conversion ratio, and emergency killswitch
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              setEngineStatus((s) => (s === 'RUNNING' ? 'PAUSED' : 'RUNNING'))
            }
            className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition ${
              engineStatus === 'RUNNING'
                ? 'border border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/60'
                : 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
            }`}
          >
            {engineStatus === 'RUNNING' ? '🛑 Pause Engine (Killswitch)' : '▶ Resume Mining Engine'}
          </button>
        </div>
      </div>

      {savedNote && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-300 font-bold">
          ✓ {savedNote}
        </div>
      )}

      {/* Engine Status Banner */}
      <div className={`card p-5 border ${engineStatus === 'RUNNING' ? 'border-emerald-500/30 bg-slate-900/80' : 'border-red-500/40 bg-red-950/20'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`pulse-dot h-3 w-3 rounded-full ${engineStatus === 'RUNNING' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div>
              <div className="text-sm font-black text-white">
                Engine Status: {engineStatus}
              </div>
              <div className="text-xs text-slate-400">
                {engineStatus === 'RUNNING'
                  ? 'Node mining devices are actively accruing points with 24h continuous mathematical interpolation.'
                  : 'Mining engine is paused. Users cannot claim pending points or start new cycles.'}
              </div>
            </div>
          </div>
          <span className="font-mono text-xs font-bold text-amber-400">
            {engineStatus === 'RUNNING' ? '99.98% Uptime' : 'Paused by Admin'}
          </span>
        </div>
      </div>

      {/* Engine Settings Form */}
      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-3">
        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Default Base Hashrate
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="0.05"
              value={baseRate}
              onChange={(e) => setBaseRate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xl font-black text-amber-400 outline-none focus:border-amber-500"
              required
            />
            <span className="font-mono text-xs font-bold text-slate-400">PTS/h</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Standard rate awarded to new registered miners before booster and referral tier multipliers.
          </p>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Mining Cycle Duration
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="1"
              value={cycleHours}
              onChange={(e) => setCycleHours(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xl font-black text-amber-400 outline-none focus:border-amber-500"
              required
            />
            <span className="font-mono text-xs font-bold text-slate-400">Hours</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Session length before points must be claimed to trigger the next 24-hour mining cycle.
          </p>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <label className="block text-xs font-bold uppercase text-slate-400">
            Fixed Conversion Ratio
          </label>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={conversionRate}
              onChange={(e) => setConversionRate(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 font-mono text-xl font-black text-cyan-400 outline-none focus:border-cyan-500"
              required
            />
            <span className="font-mono text-xs font-bold text-slate-400">: 1 $BONDKOIN</span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Fixed protocol conversion: 3.00 PTS = 1.00 BONDKOIN Token (BEP-20).
          </p>
        </div>

        <div className="md:col-span-3 flex justify-end">
          <button
            type="submit"
            className="btn-gold rounded-xl px-6 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20"
          >
            Save Mining Parameters
          </button>
        </div>
      </form>
    </div>
  );
}
