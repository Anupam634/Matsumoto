'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getAdminToken, adminLogout, getStats, ApiError, type AdminStats } from '../../../lib/admin-api';
import type { AdminTab } from '../../../components/admin/types';
import { AdminLoginGate } from '../../../components/admin/AdminLoginGate';
import { AdminHeader } from '../../../components/admin/AdminHeader';
import { AnalyticsTab } from '../../../components/admin/AnalyticsTab';
import { MinersTab } from '../../../components/admin/MinersTab';
import { WithdrawalsTab } from '../../../components/admin/WithdrawalsTab';
import { KycTab } from '../../../components/admin/KycTab';
import { SupportTab } from '../../../components/admin/SupportTab';
import { TasksTab } from '../../../components/admin/TasksTab';
import { BoostersAdminTab } from '../../../components/admin/BoostersAdminTab';
import { ReferralsAdminTab } from '../../../components/admin/ReferralsAdminTab';
import { SecurityAdminTab } from '../../../components/admin/SecurityAdminTab';
import { AuditAdminTab } from '../../../components/admin/AuditAdminTab';

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
  const [tab, setTab] = useState<AdminTab>('analytics');
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
    const interval = setInterval(loadStats, 20_000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="glow-field min-h-dvh bg-slate-950 text-slate-100">
      <AdminHeader
        currentTab={tab}
        onSelectTab={setTab}
        stats={stats}
        onSignOut={onSignOut}
      />

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6">
        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
            <span className="font-bold">⚠</span> {error}
          </div>
        )}

        {tab === 'analytics' && <AnalyticsTab stats={stats} onRefresh={loadStats} />}
        {tab === 'miners' && <MinersTab onChanged={loadStats} onUnauthorized={onSignOut} />}
        {tab === 'withdrawals' && <WithdrawalsTab onChanged={loadStats} onUnauthorized={onSignOut} />}
        {tab === 'kyc' && <KycTab onUnauthorized={onSignOut} />}
        {tab === 'support' && <SupportTab onUnauthorized={onSignOut} />}
        {tab === 'tasks' && <TasksTab onUnauthorized={onSignOut} />}
        {tab === 'boosters' && <BoostersAdminTab stats={stats} />}
        {tab === 'referrals' && <ReferralsAdminTab />}
        {tab === 'security' && <SecurityAdminTab stats={stats} />}
        {tab === 'audit' && <AuditAdminTab stats={stats} />}
      </main>
    </div>
  );
}
