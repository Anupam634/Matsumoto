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
  const sections = [
    {
      group: 'DASHBOARD',
      items: [
        { key: 'analytics' as AdminTab, label: '📊 Platform Analytics', badge: null },
      ],
    },
    {
      group: 'USERS & KYC',
      items: [
        { key: 'miners' as AdminTab, label: `👥 Miners (${stats?.totalUsers ?? '…'})`, badge: null },
        {
          key: 'kyc' as AdminTab,
          label: '🪪 Identity KYC',
          badge: stats?.kycSummary?.pending ? `${stats.kycSummary.pending} PENDING` : null,
        },
      ],
    },
    {
      group: 'BUSINESS & FINANCE',
      items: [
        {
          key: 'withdrawals' as AdminTab,
          label: '💸 Withdrawals Queue',
          badge: stats?.pendingWithdrawals ? `${stats.pendingWithdrawals} PENDING` : null,
        },
        { key: 'boosters' as AdminTab, label: '💼 Boosters & Plans', badge: null },
      ],
    },
    {
      group: 'GROWTH & MARKETING',
      items: [
        { key: 'tasks' as AdminTab, label: '🎯 Tasks & Bounties', badge: null },
        { key: 'referrals' as AdminTab, label: '🌲 6-Tier Referrals', badge: null },
      ],
    },
    {
      group: 'SYSTEM & SUPPORT',
      items: [
        { key: 'support' as AdminTab, label: '💬 Support Tickets', badge: null },
        { key: 'security' as AdminTab, label: '🛡️ Security & Anti-Abuse', badge: null },
        { key: 'audit' as AdminTab, label: '⚙️ Audit & Chain', badge: null },
      ],
    },
  ];

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
                  Cluster v2.4 Active
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

      {/* Categorized Enterprise Navigation Bar */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-4">
          {sections.map((sec) => (
            <div key={sec.group} className="flex items-center gap-1.5 mr-2 mb-1">
              {sec.items.map((item) => {
                const active = currentTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelectTab(item.key)}
                    className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider transition-all ${
                      active
                        ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                        : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.badge && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${
                          active
                            ? 'bg-slate-950 text-amber-400'
                            : 'bg-amber-400 text-slate-950'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
