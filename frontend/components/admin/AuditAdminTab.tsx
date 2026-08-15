'use client';

import React from 'react';
import type { AdminStats } from '../../lib/admin-api';

export function AuditAdminTab({ stats }: { stats: AdminStats | null }) {
  const configs = [
    { label: 'Blockchain Network', value: 'BNB Smart Chain (BSC Mainnet)' },
    { label: 'Token Standard', value: 'BEP-20 Official Matsumoto' },
    { label: 'Conversion Ratio', value: '3 Points : 1 MATSU Token (Fixed)' },
    { label: 'Payout Automation', value: 'Admin Approval Escrow Queue' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">⚙️ Smart Contract & System Audit Telemetry</h2>
          <p className="text-xs text-slate-400">
            Decentralized network parameters, transaction verification pipeline, and smart contract configuration
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {configs.map((c, i) => (
          <div key={i} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="text-[10px] font-bold uppercase text-slate-500">{c.label}</div>
            <div className="mt-1 font-bold text-white text-sm">{c.value}</div>
          </div>
        ))}
      </div>

      {stats?.recentActivity && (
        <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
          <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-800 pb-3">
            📜 Immutable Ledger Transactions
          </h3>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs font-mono text-slate-300">
              <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500 font-sans">
                <tr>
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">User</th>
                  <th className="pb-2">Reason</th>
                  <th className="pb-2 text-right">Points Delta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {stats.recentActivity.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2 text-slate-500">{new Date(act.timestamp).toLocaleString()}</td>
                    <td className="py-2 font-bold text-slate-200 font-sans">{act.userEmail}</td>
                    <td className="py-2 text-amber-300 font-bold">{act.reason}</td>
                    <td className={`py-2 text-right font-black ${act.points >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {act.points >= 0 ? `+${act.points.toFixed(2)}` : act.points.toFixed(2)} PTS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
