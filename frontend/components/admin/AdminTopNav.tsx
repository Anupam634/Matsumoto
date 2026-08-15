'use client';

import React from 'react';
import type { AdminTab } from './types';
import type { AdminStats } from '../../lib/admin-api';

interface AdminTopNavProps {
  currentTab: AdminTab;
  onToggleSidebar: () => void;
  stats: AdminStats | null;
  onRefresh: () => void;
}

export function AdminTopNav({
  currentTab,
  onToggleSidebar,
  stats,
  onRefresh,
}: AdminTopNavProps) {
  const titles: Record<AdminTab, string> = {
    dashboard: '📊 Dashboard & Platform Telemetry',
    users: '👥 Miner Accounts & Identity Directory',
    'mining-engine': '⛏️ Mining Engine & Accrual Controller',
    boosters: '⚡ Hashrate Booster Plans & Subscriptions',
    referrals: '🌲 6-Tier Viral Referral Network Matrix',
    withdrawals: '💸 Withdrawals Queue & Payout Escrow',
    blockchain: '⛓️ BNB Smart Chain (BEP-20) Infrastructure',
    kyc: '🪪 Identity Verification (KYC) Queue',
    tasks: '🎯 Tasks, Quizzes & Lucky Wheel 360°',
    payments: '💳 On-Chain Booster Payment Audits',
    support: '💬 Customer Support Helpdesk',
    cms: '📝 Content Management & Platform Legal Terms',
    reports: '📑 Automated Reports & CSV Data Exporter',
    security: '🛡️ Security, Anti-Abuse & Sybil Defense',
    system: '⚙️ System Health, RPC & Database Config',
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/[0.08] bg-slate-950/80 px-4 sm:px-6 backdrop-blur-2xl">
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white lg:hidden"
        >
          ☰
        </button>
        <div>
          <h1 className="text-sm font-black text-white sm:text-base">{titles[currentTab]}</h1>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span>Admin</span>
            <span>/</span>
            <span className="text-amber-400 capitalize">{currentTab.replace('-', ' ')}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Network Health Indicator */}
        <div className="hidden sm:flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-400">
          <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
          <span>BNB Mainnet Sync 100%</span>
        </div>

        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-500 hover:text-amber-400 transition"
        >
          <span>🔄</span>
          <span className="hidden sm:inline">Sync</span>
        </button>
      </div>
    </header>
  );
}
