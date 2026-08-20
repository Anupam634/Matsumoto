'use client';

import React, { useEffect, useState } from 'react';
import {
  AdminBoosterPurchase,
  listAdminBoosterPurchases,
  forceConfirmBoosterPurchase,
} from '../../../lib/admin-api';

export function PaymentsTab() {
  const [purchases, setPurchases] = useState<AdminBoosterPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [forceConfirmingId, setForceConfirmingId] = useState<string | null>(null);
  const [customTxHash, setCustomTxHash] = useState('');

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    loadPurchases();
  }, [statusFilter]);

  async function loadPurchases() {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminBoosterPurchases(statusFilter, searchQuery);
      setPurchases(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load booster transactions.');
    } finally {
      setLoading(false);
    }
  }

  async function handleForceConfirm(purchaseId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await forceConfirmBoosterPurchase(purchaseId, customTxHash);
      setSuccessMsg(res.message);
      setForceConfirmingId(null);
      setCustomTxHash('');
      await loadPurchases();
    } catch (err: any) {
      setError(err.message || 'Failed to force activate booster.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">💳 On-Chain Booster Payment Records & Audits</h2>
          <p className="text-xs text-slate-400">
            Real-time BEP-20 USDT / BNB blockchain payment records, recipient tracking, and underpayment overrides
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-xs text-rose-300">
          ⚠️ {error}
        </div>
      )}
      {successMsg && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-xs text-emerald-300">
          ✅ {successMsg}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 p-1 text-xs font-semibold">
          {['ALL', 'CONFIRMED', 'AWAITING_PAYMENT', 'FAILED', 'EXPIRED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`rounded-md px-2.5 py-1 transition-all ${
                statusFilter === s
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, wallet, txHash..."
            className="input-field w-64 text-xs"
          />
          <button
            type="button"
            onClick={loadPurchases}
            className="rounded-xl border border-white/15 bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-700"
          >
            🔍 Search
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading live transactions...</div>
      ) : purchases.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/60 p-8 text-center text-xs text-slate-400">
          No booster transactions found matching this filter.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-slate-900/80">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/80 text-slate-400 font-mono">
                <th className="p-3">User & Email</th>
                <th className="p-3">Plan Price</th>
                <th className="p-3">Expected Amount</th>
                <th className="p-3">Payer Wallet (fromAddress)</th>
                <th className="p-3">Status & TxHash</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {purchases.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3">
                    <div className="font-bold text-white">{tx.userEmail}</div>
                    <div className="font-mono text-[10px] text-slate-500">{tx.userId}</div>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-amber-300">${tx.planPriceUsd}.00</span>
                    <div className="text-[11px] text-emerald-400 font-mono">
                      +{tx.rateBonusPoints} /h
                    </div>
                  </td>
                  <td className="p-3 font-mono font-bold text-slate-200">
                    {tx.expectedAmount} {tx.tokenSymbol}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {tx.fromAddress ? (
                      <span title={tx.fromAddress}>
                        {tx.fromAddress.slice(0, 8)}...{tx.fromAddress.slice(-6)}
                      </span>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        tx.status === 'CONFIRMED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : tx.status === 'FAILED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : tx.status === 'AWAITING_PAYMENT'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {tx.status}
                    </span>

                    {tx.failureReason && (
                      <div className="mt-1 text-[10px] text-rose-400 font-semibold max-w-xs break-words">
                        ⚠️ {tx.failureReason}
                      </div>
                    )}

                    {tx.txHash && (
                      <div className="mt-1">
                        <a
                          href={`https://bscscan.com/tx/${tx.txHash}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[10px] text-cyan-400 underline hover:text-cyan-300"
                        >
                          🔗 {tx.txHash.slice(0, 10)}...
                        </a>
                      </div>
                    )}
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-400">
                    {new Date(tx.createdAt).toLocaleDateString()}{' '}
                    {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-3 text-right">
                    {tx.status !== 'CONFIRMED' && (
                      <button
                        type="button"
                        onClick={() => setForceConfirmingId(tx.id)}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-500/20"
                      >
                        ⚡ Force Activate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Force Confirm Modal */}
      {forceConfirmingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="card w-full max-w-md border-emerald-500/40 bg-slate-900 p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white">⚡ Force Confirm & Activate Booster</h3>
            <p className="mt-1 text-xs text-slate-400">
              Override verification and activate the mining hashrate booster for this user immediately.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="field-label">Transaction Hash (Optional)</label>
                <input
                  type="text"
                  value={customTxHash}
                  onChange={(e) => setCustomTxHash(e.target.value)}
                  placeholder="0x... (or leave blank for manual admin approval)"
                  className="input-field mt-1 text-xs font-mono"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setForceConfirmingId(null)}
                  className="rounded-xl border border-white/15 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  onClick={() => handleForceConfirm(forceConfirmingId)}
                  className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-xs font-bold text-slate-950 shadow-md hover:scale-105"
                >
                  {busy ? 'Activating...' : 'Confirm & Activate Booster'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
