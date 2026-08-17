'use client';

import React from 'react';

export function BlockchainTab() {
  const contractInfo = [
    { label: 'Blockchain Network', value: 'BNB Smart Chain (BSC Mainnet)', chainId: '56', status: 'ONLINE' },
    { label: 'BEP-20 BONDKOIN Token Contract', value: '0x32A4e9b891bF953C35C7e12739343997F4aA5726', link: 'https://bscscan.com/token/0x32A4e9b891bF953C35C7e12739343997F4aA5726', status: 'VERIFIED' },
    { label: 'Treasury / Hot Payout Wallet', value: '0x71C...B42a', balance: '1,450,200 BONDKOIN', gasBalance: '4.82 BNB', status: 'SUFFICIENT_LIQUIDITY' },
    { label: 'Decimals & Standard', value: '18 Decimals (BEP-20 Standard)', status: 'COMPLIANT' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">⛓️ BNB Smart Chain Infrastructure</h2>
          <p className="text-xs text-slate-400">
            Smart contract addresses, Hot Wallet liquidity, gas reserves, and block explorer telemetry
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {contractInfo.map((info, idx) => (
          <div key={idx} className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-500">{info.label}</span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                {info.status}
              </span>
            </div>
            <div className="font-mono text-sm font-bold text-white break-all">{info.value}</div>
            {info.balance && (
              <div className="flex items-center gap-3 pt-2 text-xs font-mono">
                <span className="text-amber-400 font-bold">Balance: {info.balance}</span>
                <span className="text-cyan-400 font-bold">Gas: {info.gasBalance}</span>
              </div>
            )}
            {info.link && (
              <a
                href={info.link}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-bold text-amber-400 hover:underline pt-1"
              >
                View on BscScan Explorer →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
