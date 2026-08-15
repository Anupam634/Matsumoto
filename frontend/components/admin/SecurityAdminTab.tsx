'use client';

import React from 'react';
import type { AdminStats } from '../../lib/admin-api';

export function SecurityAdminTab({ stats }: { stats: AdminStats | null }) {
  const rules = [
    { title: 'Maximum Signups per Device', value: '3 Accounts / Device', status: 'Enforced via FingerprintJS' },
    { title: 'Maximum Signups per IP', value: '5 Accounts / IP Subnet', status: 'Enforced via Redis Token Bucket' },
    { title: 'Mine Claim Window', value: '24 Hours Cooldown', status: 'Enforced on-chain & backend engine' },
    { title: 'Withdrawal Eligibility Rule', value: '100 PTS Min & KYC Approved', status: 'Enforced at Payout Boundary' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">🛡️ Security, Anti-Abuse & Sybil Defense</h2>
          <p className="text-xs text-slate-400">
            Hardware fingerprint limits, IP velocity controls, and automated anomaly blocking
          </p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-1.5 font-mono text-xs text-red-300 font-bold">
          Banned / Suspended Accounts: {stats?.blockedUsers ?? 0}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {rules.map((r, i) => (
          <div key={i} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">{r.title}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="mt-2 text-base font-black text-amber-400">{r.value}</div>
            <div className="mt-1 text-xs text-slate-500">{r.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
