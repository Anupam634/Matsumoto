'use client';

import React from 'react';
import { LogoMark } from '../Logo';
import type { AdminTab } from './types';
import type { AdminStats } from '../../lib/admin-api';

interface AdminSidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  stats: AdminStats | null;
  onSignOut: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function AdminSidebar({
  currentTab,
  onSelectTab,
  stats,
  onSignOut,
  isOpen,
  onToggle,
}: AdminSidebarProps) {
  const navSections = [
    {
      group: 'MAIN',
      items: [
        { key: 'dashboard' as AdminTab, label: 'Dashboard', icon: '📊', badge: null },
      ],
    },
    {
      group: 'MINER ACCOUNTS',
      items: [
        { key: 'users' as AdminTab, label: 'All Miners', icon: '👥', badge: stats?.totalUsers ? String(stats.totalUsers) : null },
        { key: 'kyc' as AdminTab, label: 'KYC & Verification', icon: '🪪', badge: stats?.kycSummary?.pending ? `${stats.kycSummary.pending}` : null },
      ],
    },
    {
      group: 'MINING & PROTOCOL',
      items: [
        { key: 'mining-engine' as AdminTab, label: 'Mining Engine', icon: '⛏️', badge: 'LIVE' },
        { key: 'boosters' as AdminTab, label: 'Hashrate Boosters', icon: '⚡', badge: stats?.boostersActive ? `${stats.boostersActive}` : null },
        { key: 'referrals' as AdminTab, label: '6-Tier Referrals', icon: '🌲', badge: '1×–8×' },
      ],
    },
    {
      group: 'TREASURY & ON-CHAIN',
      items: [
        { key: 'withdrawals' as AdminTab, label: 'Withdrawals Queue', icon: '💸', badge: stats?.pendingWithdrawals ? `${stats.pendingWithdrawals}` : null },
        { key: 'payments' as AdminTab, label: 'Booster Payments', icon: '💳', badge: null },
        { key: 'blockchain' as AdminTab, label: 'Blockchain & BSC', icon: '⛓️', badge: 'BEP-20' },
      ],
    },
    {
      group: 'GROWTH & COMMUNITY',
      items: [
        { key: 'tasks' as AdminTab, label: 'Bounties & Tasks', icon: '🎯', badge: 'Quiz/Wheel' },
        { key: 'support' as AdminTab, label: 'Support Helpdesk', icon: '💬', badge: null },
        { key: 'cms' as AdminTab, label: 'Content & FAQs', icon: '📝', badge: null },
      ],
    },
    {
      group: 'ENTERPRISE & OPS',
      items: [
        { key: 'reports' as AdminTab, label: 'Reports & Export', icon: '📑', badge: 'CSV' },
        { key: 'security' as AdminTab, label: 'Security & Abuse', icon: '🛡️', badge: stats?.blockedUsers ? `${stats.blockedUsers} Ban` : null },
        { key: 'system' as AdminTab, label: 'System Settings', icon: '⚙️', badge: null },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-white/[0.08] bg-slate-950 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-5">
          <div className="flex items-center gap-3">
            <LogoMark size={32} priority />
            <div>
              <span className="font-black tracking-tight text-white">BONDKOIN</span>
              <span className="ml-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black text-amber-400">
                PRO
              </span>
              <div className="text-[10px] font-mono text-slate-500">Enterprise Admin Console</div>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 lg:hidden"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.group} className="space-y-1">
              <div className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-500">
                {section.group}
              </div>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const isActive = currentTab === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        onSelectTab(item.key);
                        if (window.innerWidth < 1024) onToggle();
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                          : 'text-slate-400 hover:bg-slate-900/90 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase ${
                            isActive
                              ? 'bg-slate-950 text-amber-400'
                              : 'bg-slate-800 text-amber-400 border border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Operator Account & Sign Out */}
        <div className="border-t border-white/[0.08] p-4">
          <div className="flex items-center justify-between rounded-xl bg-slate-900 p-2.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 font-black text-slate-950 text-xs">
                OP
              </div>
              <div className="overflow-hidden text-left">
                <div className="truncate text-xs font-bold text-white">Super Admin</div>
                <div className="truncate text-[10px] text-slate-400">admin@bondkoinlabs.com</div>
              </div>
            </div>
            <button
              onClick={onSignOut}
              className="rounded-lg p-1.5 text-xs text-red-400 hover:bg-red-950/50 hover:text-red-300"
              title="Sign Out"
            >
              🚪
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
