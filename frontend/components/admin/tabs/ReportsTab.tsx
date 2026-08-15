'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getReportsSummary,
  downloadReportCsv,
  ApiError,
  type AdminReportsSummary,
} from '../../../lib/admin-api';

export function ReportsTab() {
  const [summary, setSummary] = useState<AdminReportsSummary | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getReportsSummary();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not fetch report database counts.');
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  async function handleExport(
    id: 'users' | 'mining' | 'withdrawals' | 'referrals' | 'kyc' | 'revenue',
    name: string,
  ) {
    setDownloading(id);
    setError(null);
    try {
      await downloadReportCsv(id);
      setSuccess(`Exported ${name} successfully.`);
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to export ${name}.`);
    } finally {
      setDownloading(null);
    }
  }

  const reports: {
    id: 'users' | 'mining' | 'withdrawals' | 'referrals' | 'kyc' | 'revenue';
    title: string;
    desc: string;
    count: number;
    badge: string;
  }[] = [
    {
      id: 'users',
      title: '👥 Miner Accounts Directory',
      desc: 'All registered users, balances, live rates, countries, referral counts, and account statuses.',
      count: summary?.usersCount ?? 0,
      badge: 'Database Users',
    },
    {
      id: 'mining',
      title: '⛏️ Mining Yield & Accrual Ledger',
      desc: 'Immutable points ledger entries, yield accruals, airdrop grants, and claim history.',
      count: summary?.miningEntriesCount ?? 0,
      badge: 'Ledger Events',
    },
    {
      id: 'withdrawals',
      title: '💸 Withdrawals & Payouts Queue',
      desc: 'All settled, pending, approved, and rejected BEP-20 payouts on BNB Smart Chain.',
      count: summary?.withdrawalsCount ?? 0,
      badge: 'Payout Records',
    },
    {
      id: 'referrals',
      title: '🌲 Referral Downlines & Matrix',
      desc: 'Active referral links, parent inviter mapping, direct downlines, and tier qualifications.',
      count: summary?.referralsCount ?? 0,
      badge: 'Downline Links',
    },
    {
      id: 'kyc',
      title: '🪪 Identity KYC Applications',
      desc: 'Government document submissions, applicant full names, document numbers, and reviewer notes.',
      count: summary?.kycCount ?? 0,
      badge: 'KYC Records',
    },
    {
      id: 'revenue',
      title: '💰 Booster Purchases & Revenue',
      desc: 'On-chain hashrate booster package payments, transaction hashes, and confirmed revenues.',
      count: summary?.revenueCount ?? 0,
      badge: 'Purchases',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">
              📑 Real-Time Database Reports & CSV Exporter
            </h2>
            <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-400">
              Live PostgreSQL
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Export real operational accounting, miner telemetry, and financial audit records directly from the database into standard .csv files
          </p>
        </div>

        <button
          onClick={loadSummary}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:border-amber-500 hover:text-amber-400 transition"
        >
          🔄 Refresh Counts
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
          <span className="font-bold">⚠ Error:</span> {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-4 text-xs text-emerald-300 font-bold">
          ✓ {success}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div
            key={r.id}
            className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{r.title}</h3>
                <span className="rounded-full bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] font-mono font-bold text-amber-400">
                  {r.badge}
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-black text-white">
                  {summary ? r.count.toLocaleString() : '…'}
                </span>
                <span className="text-xs text-slate-400 font-semibold">
                  records in database
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-400 leading-relaxed">
                {r.desc}
              </p>
            </div>

            <button
              onClick={() => handleExport(r.id, r.title)}
              disabled={downloading === r.id || !summary}
              className="btn-gold mt-6 w-full rounded-xl py-2.5 text-xs font-black uppercase text-slate-950 shadow-md transition disabled:opacity-50"
            >
              {downloading === r.id ? '⚡ Querying & Generating CSV…' : '📥 Export Real CSV Data'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
