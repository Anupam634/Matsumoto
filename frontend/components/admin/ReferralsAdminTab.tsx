'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  getReferralAudit,
  ApiError,
  type ReferralAuditResult,
} from '../../lib/admin-api';

export function ReferralsAdminTab() {
  const [audit, setAudit] = useState<ReferralAuditResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'SUSPICIOUS' | 'CLEAN'>('ALL');

  const loadAudit = useCallback(async () => {
    setBusy(true);
    try {
      const data = await getReferralAudit();
      setAudit(data);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to fetch referral audit.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    loadAudit();
  }, [loadAudit]);

  const tiers = [
    { level: 1, invites: '1 – 4 Direct Invites', multiplier: '1.0× Base Rate', bonusCommission: '10% Tier 1' },
    { level: 2, invites: '5 – 9 Direct Invites', multiplier: '1.2× Boost Multiplier', bonusCommission: '12% Tier 1 + 5% Tier 2' },
    { level: 3, invites: '10 – 19 Direct Invites', multiplier: '1.5× Boost Multiplier', bonusCommission: '15% Tier 1 + 6% Tier 2 + 3% Tier 3' },
    { level: 4, invites: '20 – 49 Direct Invites', multiplier: '1.8× Boost Multiplier', bonusCommission: '18% Tier 1 + 7% Tier 2 + 4% Tier 3' },
    { level: 5, invites: '50 – 99 Direct Invites', multiplier: '2.2× Boost Multiplier', bonusCommission: '22% Tier 1 + 8% Tier 2 + 5% Tier 3' },
    { level: 6, invites: '100+ Direct Invites (VIP)', multiplier: '3.0× Maximum Multiplier', bonusCommission: '25% Tier 1 + 10% Tier 2 + 6% Tier 3' },
  ];

  const filteredLogs = (audit?.auditLogs ?? []).filter((log) => {
    if (filter === 'SUSPICIOUS') return log.severity !== 'CLEAN';
    if (filter === 'CLEAN') return log.severity === 'CLEAN';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-white">
              🌲 6-Tier Referral Network & Anti-Bypass Auditor
            </h2>
            <span className="rounded-full bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300">
              Sybil Defense Active
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time downline network verification, shared device/IP detection, and self-referral bypass protection
          </p>
        </div>

        <button
          onClick={loadAudit}
          disabled={busy}
          className="rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-300 hover:border-amber-500 hover:text-amber-400 transition"
        >
          {busy ? 'Scanning Network…' : '🔄 Scan Referral Graph'}
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-4 text-xs text-red-300">
          <span className="font-bold">⚠ Error:</span> {error}
        </div>
      )}

      {/* Referral Integrity KPI Counters */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total Miners Registered
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-white">
            {audit?.totalMiners ?? '…'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Live platform population</div>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active Downline Links
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-amber-400">
            {audit?.totalReferralLinks ?? '…'}
          </div>
          <div className="mt-1 text-xs text-slate-500">Connected referral edges</div>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Legitimate Referrals
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-emerald-400">
            {audit?.cleanReferralsCount ?? '…'}
          </div>
          <div className="mt-1 text-xs text-emerald-400/80 font-bold">
            {audit?.integrityScore ?? 100}% Clean Integrity Score
          </div>
        </div>

        <div className="card border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Flagged Bypass Attempts
          </div>
          <div className="mt-2 text-3xl font-black tabular-nums text-red-400">
            {audit?.suspiciousReferralsCount ?? 0}
          </div>
          <div className="mt-1 text-xs text-red-400/80 font-bold">
            Shared device or subnet flagged
          </div>
        </div>
      </div>

      {/* ───────────────── Multiplier Levels Matrix ───────────────── */}
      <div className="card border-slate-800 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-md">
        <h3 className="text-sm font-black uppercase tracking-wider text-white border-b border-slate-800 pb-3">
          📊 6-Tier Level Qualification Matrix
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.level} className="rounded-xl border border-slate-800 bg-slate-950 p-3.5">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-indigo-500/15 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-black uppercase text-indigo-300">
                  Level {t.level}
                </span>
                <span className="font-mono text-xs font-black text-amber-400">{t.multiplier}</span>
              </div>
              <div className="mt-2 font-bold text-slate-200 text-xs">{t.invites}</div>
              <div className="mt-1 font-mono text-[11px] text-emerald-400">{t.bonusCommission}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────── Real-Time Anti-Bypass & Sybil Audit Scanner ───────────────── */}
      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-slate-950/80 p-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              🔍 Referral Fraud & Device Handshake Audit Log
            </h3>
            <p className="text-xs text-slate-400">
              Automated cross-check comparing inviter vs invitee device fingerprints and IP subnets
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {(['ALL', 'SUSPICIOUS', 'CLEAN'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                  filter === f
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950 font-bold uppercase text-[10px] text-slate-400">
              <tr>
                <th className="p-3.5">Invitee Account</th>
                <th className="p-3.5">Inviter Account</th>
                <th className="p-3.5">Invitee IP / Handshake</th>
                <th className="p-3.5">Inviter IP / Handshake</th>
                <th className="p-3.5">Detection Status</th>
                <th className="p-3.5 text-right">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono text-[11px]">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                    {busy ? 'Analyzing referral graphs…' : 'No referral logs matching filter.'}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-white">{log.inviteeEmail}</div>
                      <div className="text-[10px] text-slate-500">{log.inviteeId.slice(0, 10)}…</div>
                    </td>
                    <td className="p-3.5 font-sans">
                      <div className="font-bold text-slate-300">{log.inviterEmail}</div>
                      <div className="text-[10px] text-slate-500">{log.inviterId.slice(0, 10)}…</div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{log.inviteeIp}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={log.inviteeFingerprint}>
                        FP: {log.inviteeFingerprint.slice(0, 10)}…
                      </div>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-200">{log.inviterIp}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]" title={log.inviterFingerprint}>
                        FP: {log.inviterFingerprint.slice(0, 10)}…
                      </div>
                    </td>
                    <td className="p-3.5 font-sans">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          log.flagReason === 'CLEAN_VERIFIED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : log.flagReason === 'SAME_DEVICE_FINGERPRINT'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {log.flagReason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          log.severity === 'CLEAN'
                            ? 'text-emerald-400'
                            : log.severity === 'HIGH'
                            ? 'bg-red-950 text-red-300 border border-red-500/30'
                            : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
