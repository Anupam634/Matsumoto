'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getAdminToken,
  adminLogout,
  getStats,
  ApiError,
  type AdminStats,
} from '../../../lib/admin-api';
import type { AdminTab } from '../../../components/admin/types';
import { AdminLoginGate } from '../../../components/admin/AdminLoginGate';
import { AdminSidebar } from '../../../components/admin/AdminSidebar';
import { AdminTopNav } from '../../../components/admin/AdminTopNav';

// Modular Tabs
import { AnalyticsTab } from '../../../components/admin/AnalyticsTab';
import { MinersTab } from '../../../components/admin/MinersTab';
import { KycTab } from '../../../components/admin/KycTab';
import { MarketplaceAdminTab } from '../../../components/admin/MarketplaceAdminTab';
import { MiningEngineTab } from '../../../components/admin/tabs/MiningEngineTab';
import { BoostersAdminTab } from '../../../components/admin/BoostersAdminTab';
import { ReferralsAdminTab } from '../../../components/admin/ReferralsAdminTab';
import { WithdrawalsTab } from '../../../components/admin/WithdrawalsTab';
import { PaymentsTab } from '../../../components/admin/tabs/PaymentsTab';
import { BlockchainTab } from '../../../components/admin/tabs/BlockchainTab';
import { TasksTab } from '../../../components/admin/TasksTab';
import { SupportTab } from '../../../components/admin/SupportTab';
import { CmsTab } from '../../../components/admin/tabs/CmsTab';
import { ReportsTab } from '../../../components/admin/tabs/ReportsTab';
import { SecurityTab } from '../../../components/admin/tabs/SecurityTab';
import { SystemTab } from '../../../components/admin/tabs/SystemTab';
import { usePolling } from '../../../lib/use-polling';

export default function AdminClient() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => setAuthed(!!getAdminToken()), []);

  if (authed === null) return null;
  if (!authed) return <AdminLoginGate onDone={() => setAuthed(true)} />;
  return (
    <Panel
      onSignOut={() => {
        adminLogout();
        setAuthed(false);
      }}
    />
  );
}

function Panel({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<AdminTab>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      setStats(await getStats());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onSignOut();
      setError(err instanceof ApiError ? err.message : 'Cannot reach the server.');
    }
  }, [onSignOut]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Paused while the tab is hidden. An admin panel is the tab most likely to
  // be left open and forgotten, and `stats` is the heaviest read in the API.
  usePolling(loadStats, 20_000);

  return (
    <div className="flex min-h-dvh bg-slate-950 text-slate-100 antialiased selection:bg-amber-500 selection:text-slate-950">
      {/* Left Collapsible Enterprise Sidebar */}
      <AdminSidebar
        currentTab={tab}
        onSelectTab={setTab}
        stats={stats}
        onSignOut={onSignOut}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((o) => !o)}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <AdminTopNav
          currentTab={tab}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          stats={stats}
          onRefresh={loadStats}
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          <div className="mx-auto max-w-7xl">
            {error && (
              <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
                <span className="font-bold">⚠</span> {error}
              </div>
            )}

            {tab === 'dashboard' && <AnalyticsTab stats={stats} onRefresh={loadStats} />}
            {tab === 'users' && <MinersTab onChanged={loadStats} onUnauthorized={onSignOut} />}
            {tab === 'kyc' && <KycTab onUnauthorized={onSignOut} />}
            {tab === 'mining-engine' && <MiningEngineTab />}
            {tab === 'boosters' && <BoostersAdminTab stats={stats} />}
            {tab === 'referrals' && <ReferralsAdminTab />}
            {tab === 'withdrawals' && <WithdrawalsTab onChanged={loadStats} onUnauthorized={onSignOut} />}
            {tab === 'payments' && <PaymentsTab />}
            {tab === 'blockchain' && <BlockchainTab />}
            {tab === 'marketplace' && <MarketplaceAdminTab />}
            {tab === 'tasks' && <TasksTab onUnauthorized={onSignOut} />}
            {tab === 'support' && <SupportTab onUnauthorized={onSignOut} />}
            {tab === 'cms' && <CmsTab />}
            {tab === 'reports' && <ReportsTab />}
            {tab === 'security' && <SecurityTab stats={stats} />}
            {tab === 'system' && <SystemTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
