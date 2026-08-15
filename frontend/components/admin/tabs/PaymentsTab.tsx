'use client';

import React from 'react';

export function PaymentsTab() {
  const transactions = [
    { id: 'tx_01', user: 'miner92@gmail.com', plan: 'Silver Booster', amount: '$5.00 USDT', txHash: '0x8f2c...49a1', status: 'CONFIRMED', date: '2026-08-15 19:30' },
    { id: 'tx_02', user: 'alex.crypto@yahoo.com', plan: 'Bronze Booster', amount: '$1.00 USDT', txHash: '0x3a1b...229f', status: 'CONFIRMED', date: '2026-08-15 18:14' },
    { id: 'tx_03', user: 'node_alpha@proton.me', plan: 'Gold Booster', amount: '$10.00 USDT', txHash: '0x992c...e1b0', status: 'CONFIRMED', date: '2026-08-15 17:02' },
    { id: 'tx_04', user: 'sam88@outlook.com', plan: 'Bronze Booster', amount: '$1.00 USDT', txHash: '0x12bb...cc01', status: 'CONFIRMED', date: '2026-08-15 15:45' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">💳 Booster Payment Records & Revenue</h2>
          <p className="text-xs text-slate-400">
            On-chain USDT/BNB payments for mining hashrate booster packages
          </p>
        </div>
      </div>

      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">User</th>
                <th className="p-3.5">Plan Purchased</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Transaction Hash</th>
                <th className="p-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                  <td className="p-3.5 text-slate-400">{tx.date}</td>
                  <td className="p-3.5 font-sans font-bold text-white">{tx.user}</td>
                  <td className="p-3.5 font-sans text-amber-400 font-bold">{tx.plan}</td>
                  <td className="p-3.5 font-bold text-emerald-400">{tx.amount}</td>
                  <td className="p-3.5 text-slate-400">{tx.txHash}</td>
                  <td className="p-3.5 text-right font-sans">
                    <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
