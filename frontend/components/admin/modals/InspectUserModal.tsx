'use client';

import React, { useEffect, useState } from 'react';
import {
  getUserDetail,
  ApiError,
  type AdminUserDetail,
  type TreeNode,
} from '../../../lib/admin-api';

interface InspectUserModalProps {
  userId: string;
  onClose: () => void;
  onChanged: () => void;
}

export function InspectUserModal({ userId, onClose }: InspectUserModalProps) {
  const [data, setData] = useState<AdminUserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    getUserDetail(userId)
      .then((d) => {
        setData(d);
        setBusy(false);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Failed to load user details.');
        setBusy(false);
      });
  }, [userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md">
      <div className="card max-h-[90vh] w-full max-w-4xl overflow-y-auto border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div>
            <h3 className="text-xl font-black text-white">Miner Account Deep Inspection</h3>
            <p className="font-mono text-xs text-slate-400">ID: {userId}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            ✕ Close
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {busy || !data ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Loading comprehensive account telemetry…
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Email</div>
                <div className="mt-1 font-bold text-white truncate">
                  {data.user.email ?? 'Wallet Account'}
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Points Balance</div>
                <div className="mt-1 font-mono text-base font-black text-amber-400">
                  {data.user.balancePoints.toFixed(2)} PTS
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">Effective Hashrate</div>
                <div className="mt-1 font-mono text-base font-black text-emerald-400">
                  {data.user.ratePerHour.toFixed(2)} /h
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-[10px] font-bold uppercase text-slate-500">KYC Status</div>
                <div className="mt-1 font-bold text-cyan-400">{data.user.kycStatus}</div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  🌲 6-Tier Referral Network Tree
                </span>
                <span className="text-xs font-bold text-indigo-400">
                  Direct Invites: {data.user.referralCount}
                </span>
              </div>
              <div className="mt-3 max-h-48 overflow-y-auto font-mono text-xs">
                {data.referralTree.length === 0 ? (
                  <p className="text-slate-500">No downline referrals registered under this account.</p>
                ) : (
                  <div className="space-y-1.5 pl-2">
                    {data.referralTree.map((child) => (
                      <TreeBranch key={child.id} node={child} depth={1} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                📜 Recent Ledger Transactions (Audit Trail)
              </span>
              <div className="mt-3 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
                    <tr>
                      <th className="pb-1.5">Timestamp</th>
                      <th className="pb-1.5">Reason</th>
                      <th className="pb-1.5 text-right">Points Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 font-mono">
                    {data.ledger.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-3 text-center text-slate-500">
                          No ledger entries.
                        </td>
                      </tr>
                    ) : (
                      data.ledger.map((l) => (
                        <tr key={l.id}>
                          <td className="py-1.5 text-slate-400">
                            {new Date(l.createdAt).toLocaleString()}
                          </td>
                          <td className="py-1.5 text-slate-200">{l.reason}</td>
                          <td
                            className={`py-1.5 text-right font-bold ${
                              l.points >= 0 ? 'text-emerald-400' : 'text-red-400'
                            }`}
                          >
                            {l.points >= 0 ? `+${l.points.toFixed(2)}` : l.points.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TreeBranch({ node, depth }: { node: TreeNode; depth: number }) {
  return (
    <div>
      <div className="flex items-center gap-2 py-0.5 text-slate-300">
        <span className="text-slate-600">{'—'.repeat(depth)}</span>
        <span className="font-bold text-white">{node.email ?? node.id.slice(0, 8)}</span>
        <span className="text-[10px] text-amber-400">({node.balancePoints.toFixed(1)} PTS)</span>
        {node.isBlocked && <span className="text-[10px] text-red-400">[BANNED]</span>}
      </div>
      {node.children && node.children.length > 0 && (
        <div className="pl-3">
          {node.children.map((c) => (
            <TreeBranch key={c.id} node={c} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
