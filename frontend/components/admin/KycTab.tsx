'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  listKyc,
  getKycDetail,
  decideKyc,
  ApiError,
  type AdminKycRow,
  type AdminKycDetail,
} from '../../lib/admin-api';
import { countryFlag, countryName } from '../../lib/countries';
import { KycInspectModal } from './modals/KycInspectModal';

interface KycTabProps {
  onUnauthorized: () => void;
}

/** Wait this long after the last keystroke before querying. */
const SEARCH_DEBOUNCE_MS = 300;

export function KycTab({ onUnauthorized }: KycTabProps) {
  const [status, setStatus] = useState<string>('PENDING');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<AdminKycRow[]>([]);
  const [selected, setSelected] = useState<AdminKycDetail | null>(null);
  const [busy, setBusy] = useState(false);
  // Responses can land out of order while typing; only the latest may win.
  const latest = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setBusy(true);
    try {
      const data = await listKyc(status === 'ALL' ? undefined : status, query);
      if (id === latest.current) setRows(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) return onUnauthorized();
    } finally {
      if (id === latest.current) setBusy(false);
    }
  }, [status, query, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  async function openDetail(userId: string) {
    try {
      const detail = await getKycDetail(userId);
      setSelected(detail);
    } catch {
      alert('Failed to load KYC document details.');
    }
  }

  async function handleDecide(approve: boolean, note?: string) {
    if (!selected) return;
    try {
      await decideKyc(selected.userId, approve, note);
      setSelected(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Decision failed.');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Identity Verification (KYC) Queue</h2>
          <p className="text-xs text-slate-400">Review government-issued documents & selfies</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {['PENDING', 'APPROVED', 'REJECTED', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatus(st)}
              className={`rounded-lg px-3 py-1.5 font-bold uppercase transition ${
                status === st
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-md">
        <span aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          🔎
        </span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by user email…"
          aria-label="Search KYC applicants by email"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-9 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded px-1.5 text-slate-500 hover:text-slate-200"
          >
            ✕
          </button>
        )}
      </div>

      <div className="card overflow-hidden border-slate-800 bg-slate-900/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-white/[0.08] bg-slate-950/80 font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="p-3.5">Submitted</th>
                <th className="p-3.5">Applicant</th>
                <th className="p-3.5">Full Legal Name</th>
                <th className="p-3.5">Network</th>
                <th className="p-3.5">Document</th>
                <th className="p-3.5">Status</th>
                {/* Pinned so the one action on the row never scrolls off-screen. */}
                <th className="sticky right-0 border-l border-slate-800 bg-slate-950 p-3.5 text-right">
                  Inspect
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    {busy
                      ? 'Loading KYC applicants…'
                      : query
                      ? `No KYC records match “${query}”.`
                      : 'No KYC records found.'}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.userId} className="group transition hover:bg-slate-800/40">
                    <td className="whitespace-nowrap p-3.5 text-slate-400">
                      {r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="max-w-[240px] break-all font-bold text-white">
                        {r.userEmail ?? r.userId.slice(0, 8)}
                      </div>
                      <div className="mt-1">
                        <CountryCell code={r.countryCode} signupCode={r.userCountryCode} />
                      </div>
                    </td>
                    <td className="p-3.5 font-semibold text-slate-200">{r.fullName ?? '—'}</td>
                    <td className="p-3.5">
                      <NetworkCell
                        ip={r.lastIp}
                        sameIp={r.sameIpAccounts}
                        sameSubnet={r.sameSubnetAccounts}
                      />
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-amber-300">{r.documentType ?? '—'}</div>
                      <div className="mt-0.5 font-mono text-slate-400">{r.documentNumber ?? '—'}</div>
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/15 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="sticky right-0 border-l border-slate-800 bg-slate-900 p-3.5 text-right group-hover:bg-slate-800">
                      <button
                        onClick={() => openDetail(r.userId)}
                        className="whitespace-nowrap rounded-lg border border-amber-500/40 bg-amber-950/30 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-900/50 transition"
                      >
                        🔍 Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <KycInspectModal
          selected={selected}
          onClose={() => setSelected(null)}
          onDecide={handleDecide}
        />
      )}
    </div>
  );
}

/** How many accounts on one /24 counts as a farm rather than a household. */
const SUBNET_FARM_THRESHOLD = 10;
/** Accounts on a single address before it stops looking like one family. */
const IP_SHARED_THRESHOLD = 3;

/**
 * Where this applicant signed in from, and how crowded that address and its
 * /24 are.
 *
 * A reviewer cannot tell a farm's document from a real one by looking, but
 * "112 accounts on this range" decides it at a glance — the farms seen so far
 * spread a hundred-odd accounts across one rented /24 while keeping each
 * address nearly empty, which is why the range matters more than the address.
 */
function NetworkCell({
  ip,
  sameIp,
  sameSubnet,
}: {
  ip?: string | null;
  sameIp?: number;
  sameSubnet?: number;
}) {
  if (!ip) return <span className="text-slate-600">—</span>;

  const subnet = sameSubnet ?? 0;
  const onIp = sameIp ?? 0;
  const farm = subnet >= SUBNET_FARM_THRESHOLD;
  const shared = !farm && onIp >= IP_SHARED_THRESHOLD;

  return (
    <div className="whitespace-nowrap">
      <div className="font-mono text-[11px] text-slate-300">{ip}</div>
      <div
        className={`mt-0.5 text-[10px] font-bold ${
          farm ? 'text-red-400' : shared ? 'text-amber-400' : 'text-slate-500'
        }`}
      >
        {farm && '⚠ '}
        {subnet.toLocaleString()} on /24 · {onIp.toLocaleString()} on IP
      </div>
    </div>
  );
}

/**
 * Flag + code for the document's country, falling back to the signup country.
 * The code is always printed beside the flag because Windows renders flag
 * emoji as bare letters. When the document and signup countries differ, the
 * signup one is shown underneath — worth a second look during review.
 */
function CountryCell({
  code,
  signupCode,
}: {
  code: string | null;
  signupCode?: string | null;
}) {
  const shown = code || signupCode;
  if (!shown) return <span className="text-slate-600">—</span>;

  const mismatch =
    !!code && !!signupCode && code.toUpperCase() !== signupCode.toUpperCase();

  return (
    <div title={countryName(shown)} className="whitespace-nowrap">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className="text-base leading-none">
          {countryFlag(shown)}
        </span>
        <span className="font-mono font-bold text-slate-200">{shown.toUpperCase()}</span>
      </span>
      {mismatch && (
        <span
          title={`Signed up from ${countryName(signupCode!)}`}
          className="mt-0.5 block text-[10px] font-semibold text-amber-400"
        >
          signup: {countryFlag(signupCode!)} {signupCode!.toUpperCase()}
        </span>
      )}
    </div>
  );
}
