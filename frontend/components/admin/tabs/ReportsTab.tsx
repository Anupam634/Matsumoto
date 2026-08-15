'use client';

import React, { useState } from 'react';

export function ReportsTab() {
  const [downloading, setDownloading] = useState<string | null>(null);

  const reports = [
    { id: 'users', title: '👥 Miner Accounts Report', desc: 'Full user directory, registration timestamps, balances, and countries', records: '1,420 records' },
    { id: 'mining', title: '⛏️ Mining Yield & Accrual Report', desc: 'Daily mined points, 24h cycle claims, and effective hashrates', records: '28,400 records' },
    { id: 'withdrawals', title: '💸 Withdrawals & Payouts Report', desc: 'All settled, pending, and rejected BEP-20 withdrawal requests', records: '380 records' },
    { id: 'referrals', title: '🌲 Referral Tree & Multipliers Report', desc: 'Downline network statistics and earned commission bonuses', records: '890 records' },
    { id: 'kyc', title: '🪪 Identity KYC Verification Report', desc: 'Document verification decisions and reviewer timestamps', records: '145 records' },
    { id: 'revenue', title: '💰 Revenue & Booster Payments Report', desc: 'On-chain booster package purchases and treasury accounting', records: '62 records' },
  ];

  function triggerDownload(id: string) {
    setDownloading(id);
    setTimeout(() => {
      // Generate client-side CSV download
      const csvContent = `data:text/csv;charset=utf-8,ID,Report_Type,Generated_At,Status\n1,${id.toUpperCase()},${new Date().toISOString()},EXPORTED\n`;
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `matsumoto_${id}_report_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(null);
    }, 800);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">📑 Automated Reports & CSV Data Exporter</h2>
          <p className="text-xs text-slate-400">
            Export comprehensive accounting, miner telemetry, and financial audit reports in standard .csv format
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div key={r.id} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm">{r.title}</h3>
                <span className="font-mono text-[10px] text-slate-400 font-bold">{r.records}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400 leading-relaxed">{r.desc}</p>
            </div>

            <button
              onClick={() => triggerDownload(r.id)}
              disabled={downloading === r.id}
              className="btn-gold mt-5 w-full rounded-xl py-2.5 text-xs font-black uppercase text-slate-950 shadow-md"
            >
              {downloading === r.id ? 'Generating CSV…' : '📥 Export CSV Data'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
