'use client';

import React from 'react';
import { LogoMark } from '../Logo';
import type { AdminTab } from './types';
import type { AdminStats } from '../../lib/admin-api';

interface AdminHeaderProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  stats: AdminStats | null;
  onSignOut: () => void;
}

export function AdminHeader({
  currentTab,
  onSelectTab,
  stats,
  onSignOut,
}: AdminHeaderProps) {
  return (
    <div>
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <LogoMark size={34} priority />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black tracking-tight text-white sm:text-lg">
                  Matsumoto Command Center
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
                  Cloud Mining Cluster Active
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400">
                BNB Chain BEP-20 Mainnet Controller
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onSignOut}
              className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/50 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Global Tab Switcher */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
          <button
            onClick={() => onSelectTab('analytics')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            📊 Platform Analytics
          </button>
          <button
            onClick={() => onSelectTab('miners')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'miners'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            👥 Miner Accounts ({stats?.totalUsers ?? '…'})
          </button>
          <button
            onClick={() => onSelectTab('withdrawals')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'withdrawals'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            💸 Withdrawals Queue
            {stats?.pendingWithdrawals ? (
              <span className="ml-2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-950">
                {stats.pendingWithdrawals} PENDING
              </span>
            ) : ''}
          </button>
          <button
            onClick={() => onSelectTab('kyc')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'kyc'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            🪪 KYC Verifications
          </button>
          <button
            onClick={() => onSelectTab('support')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'support'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            💬 Support Tickets
          </button>
          <button
            onClick={() => onSelectTab('tasks')}
            className={`rounded-xl px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider transition-all ${
              currentTab === 'tasks'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎯 Tasks & Bounties Editor
          </button>
        </div>
      </div>
    </div>
  );
}
