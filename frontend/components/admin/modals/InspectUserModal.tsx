'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  getUserDetail,
  resetUserTwoFactor,
  revokeUserSessions,
  ApiError,
  type AdminUserDetail,
  type TreeNode,
  type UserSecurityEvent,
  type WithdrawalSecondFactor,
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

  const load = useCallback(async () => {
    try {
      setData(await getUserDetail(userId));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load user details.');
    } finally {
      setBusy(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

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

            {data.security && (
              <AccountSecurity
                userId={userId}
                who={data.user.email ?? userId}
                security={data.security}
                onDone={load}
              />
            )}

            {/* Device Handshake & IP Telemetry */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  📱 Device Handshake & IP Subnet Security Audit
                </span>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                  {data.devices && data.devices.length > 0 ? `${data.devices.length} Handshakes Logged` : 'Web Handshake'}
                </span>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs font-mono">
                <div className="rounded-lg bg-slate-900 p-3">
                  <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Last Known IP Address</div>
                  <div className="mt-1 font-bold text-white text-sm">{data.user.lastIp ?? '127.0.0.1 (Local / Proxy)'}</div>
                </div>
                <div className="rounded-lg bg-slate-900 p-3">
                  <div className="text-[10px] font-sans font-bold uppercase text-slate-500">Hardware Fingerprint</div>
                  <div className="mt-1 font-bold text-amber-400 truncate" title={data.user.deviceFingerprint ?? 'Standard Browser'}>
                    {data.user.deviceFingerprint ?? 'Browser Handshake'}
                  </div>
                </div>
              </div>
            </div>

            {data.security && <SecurityActivity events={data.security.events} />}

            {data.withdrawals.length > 0 && <RecentWithdrawals rows={data.withdrawals} />}

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

/* ───────────────────────────── Account security ───────────────────────────── */

function AccountSecurity({
  userId,
  who,
  security,
  onDone,
}: {
  userId: string;
  who: string;
  security: NonNullable<AdminUserDetail['security']>;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const lockedUntil = security.twoFactorLockedUntil ? new Date(security.twoFactorLockedUntil) : null;

  async function run(work: () => Promise<string>) {
    setBusy(true);
    setResult(null);
    try {
      setResult({ ok: true, text: await work() });
      onDone();
    } catch (err) {
      setResult({ ok: false, text: err instanceof ApiError ? err.message : 'Cannot reach the server.' });
    } finally {
      setBusy(false);
    }
  }

  function resetTwoFactor() {
    const ok = confirm(
      `Remove the authenticator app from ${who}?\n\n` +
        'Only do this once you are sure the request comes from the account owner — check it against their KYC documents. ' +
        '"I lost my phone, please reset my 2FA" is exactly what someone who has stolen the password will say.\n\n' +
        'They will be signed out of every device and emailed.',
    );
    if (!ok) return;
    void run(async () => {
      const res = await resetUserTwoFactor(userId);
      if (!res.reset) return 'There was no authenticator to remove. The miner was signed out of every device.';
      return res.emailed
        ? '2FA removed. The miner was signed out of every device and emailed.'
        : '2FA removed and the miner signed out of every device — but the notification email could not be sent.';
    });
  }

  function signOutEverywhere() {
    const ok = confirm(
      `Sign ${who} out of every device?\n\nTheir sessions stop working at once. They can sign in again with their password and second factor.`,
    );
    if (!ok) return;
    void run(async () => {
      await revokeUserSessions(userId);
      return 'Signed out of every device.';
    });
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          🔐 Account Security
        </span>
        {lockedUntil ? (
          <span className="rounded-full border border-red-500/30 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
            Authenticator locked until {lockedUntil.toLocaleTimeString()}
          </span>
        ) : security.twoFactorEnabled ? (
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            2FA ON
          </span>
        ) : (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
            2FA OFF
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs text-slate-400">
          {security.twoFactorEnabled ? (
            <>
              Google Authenticator is on
              {security.twoFactorEnabledAt && (
                <> since {new Date(security.twoFactorEnabledAt).toLocaleString()}</>
              )}
              . Sign-in and withdrawals need its code.
            </>
          ) : (
            <>No authenticator app. Sign-in and withdrawals are confirmed with an emailed code.</>
          )}
          {lockedUntil && <> Too many wrong codes have locked the check for now.</>}
        </p>
        <div className="flex flex-wrap gap-2">
          {(security.twoFactorEnabled || lockedUntil) && (
            <button
              type="button"
              onClick={resetTwoFactor}
              disabled={busy}
              className="rounded-lg border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-300 transition hover:bg-amber-900/50 disabled:opacity-50"
            >
              Reset 2FA
            </button>
          )}
          <button
            type="button"
            onClick={signOutEverywhere}
            disabled={busy}
            className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-300 transition hover:bg-red-900/60 disabled:opacity-50"
          >
            Sign out all sessions
          </button>
        </div>
      </div>

      {result && (
        <div
          className={`mt-3 rounded-lg border p-2.5 text-xs ${
            result.ok
              ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300'
              : 'border-red-500/40 bg-red-950/40 text-red-300'
          }`}
        >
          {result.ok ? '✓' : '⚠'} {result.text}
        </div>
      )}
    </div>
  );
}

/* ───────────────────────────── Security activity ───────────────────────────── */

const EVENT_LABELS: Record<string, { label: string; tone: string }> = {
  LOGIN_SUCCEEDED: { label: 'Signed in', tone: 'text-emerald-400' },
  LOGIN_FAILED: { label: 'Failed sign-in', tone: 'text-red-400' },
  PASSWORD_RESET: { label: 'Password reset', tone: 'text-amber-300' },
  TOTP_ENABLED: { label: '2FA turned on', tone: 'text-emerald-400' },
  TOTP_DISABLED: { label: '2FA turned off', tone: 'text-amber-300' },
  TOTP_RESET_BY_ADMIN: { label: '2FA reset by operator', tone: 'text-amber-300' },
  TOTP_FAILED: { label: 'Wrong authenticator code', tone: 'text-red-400' },
  TOTP_LOCKED: { label: 'Authenticator locked', tone: 'text-red-400' },
  SESSIONS_REVOKED: { label: 'Signed out by operator', tone: 'text-amber-300' },
  WITHDRAWAL_REQUESTED: { label: 'Withdrawal requested', tone: 'text-cyan-300' },
};

const SIGN_IN_METHOD: Record<string, string> = {
  authenticator: 'password + authenticator',
  email_code: 'password + email code',
  password: 'password only',
};

const FACTOR_LABEL: Record<WithdrawalSecondFactor, string> = {
  totp: 'Authenticator',
  email: 'Email code',
  none: 'None',
};

const shortAddress = (a: string) => (a.length > 14 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a);

/** One readable line from an event's detail, by type. */
function eventSummary(e: UserSecurityEvent): string {
  const d = e.detail ?? {};
  const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : undefined);
  const num = (k: string) => (typeof d[k] === 'number' ? (d[k] as number) : undefined);

  switch (e.type) {
    case 'LOGIN_SUCCEEDED':
      return SIGN_IN_METHOD[str('method') ?? ''] ?? '';
    case 'LOGIN_FAILED':
      return str('reason') === 'email_code' ? 'wrong email code' : str('reason') === 'password' ? 'wrong password' : '';
    case 'TOTP_FAILED':
      return num('failures') !== undefined ? `${num('failures')} in a row` : '';
    case 'TOTP_LOCKED':
      return num('minutes') !== undefined ? `locked for ${num('minutes')} min` : '';
    case 'TOTP_RESET_BY_ADMIN':
    case 'SESSIONS_REVOKED':
      return str('admin') ? `by ${str('admin')}` : '';
    case 'WITHDRAWAL_REQUESTED': {
      const factor = str('secondFactor') as WithdrawalSecondFactor | undefined;
      return [
        num('points') !== undefined ? `${num('points')} pts` : null,
        str('toAddress') ? `→ ${shortAddress(str('toAddress')!)}` : null,
        factor ? `· ${FACTOR_LABEL[factor] ?? factor}` : null,
      ]
        .filter(Boolean)
        .join(' ');
    }
    default:
      return '';
  }
}

function SecurityActivity({ events }: { events: UserSecurityEvent[] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
          🕵️ Security Activity
        </span>
        <span className="text-[10px] font-bold text-slate-500">Latest {events.length}</span>
      </div>
      <div className="mt-3 max-h-64 overflow-auto">
        {events.length === 0 ? (
          <p className="text-xs text-slate-500">
            Nothing recorded yet. Sign-ins, failed codes, 2FA changes and withdrawal requests appear here.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
              <tr>
                <th className="pb-1.5 pr-3">When</th>
                <th className="pb-1.5 pr-3">Event</th>
                <th className="pb-1.5 pr-3">IP</th>
                <th className="pb-1.5 pr-3">Platform</th>
                <th className="pb-1.5">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900">
              {events.map((e) => {
                const meta = EVENT_LABELS[e.type] ?? { label: e.type, tone: 'text-slate-300' };
                const summary = eventSummary(e);
                const device = e.fingerprint ?? e.userAgent;
                return (
                  <tr key={e.id} className="align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-slate-400">
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                    <td className="py-1.5 pr-3">
                      <div className={`font-bold ${meta.tone}`}>{meta.label}</div>
                      {summary && <div className="font-mono text-[11px] text-slate-500">{summary}</div>}
                    </td>
                    <td className="whitespace-nowrap py-1.5 pr-3 font-mono text-slate-300">{e.ip ?? '—'}</td>
                    <td className="py-1.5 pr-3 text-slate-400">{e.platform ?? '—'}</td>
                    <td
                      className="max-w-[180px] truncate py-1.5 font-mono text-[11px] text-slate-500"
                      title={[e.fingerprint, e.userAgent].filter(Boolean).join('\n') || undefined}
                    >
                      {device ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Recent withdrawals ───────────────────────────── */

function RecentWithdrawals({ rows }: { rows: AdminUserDetail['withdrawals'] }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
        💸 Recent Withdrawals
      </span>
      <div className="mt-3 max-h-48 overflow-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 text-[10px] uppercase text-slate-500">
            <tr>
              <th className="pb-1.5 pr-3">Requested</th>
              <th className="pb-1.5 pr-3 text-right">Points</th>
              <th className="pb-1.5 pr-3">To</th>
              <th className="pb-1.5 pr-3">Status</th>
              <th className="pb-1.5 pr-3">Confirmed with</th>
              <th className="pb-1.5">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-900 font-mono">
            {rows.map((w) => (
              <tr key={w.id}>
                <td className="whitespace-nowrap py-1.5 pr-3 text-slate-400">
                  {new Date(w.requestedAt).toLocaleString()}
                </td>
                <td className="py-1.5 pr-3 text-right font-bold text-amber-400">{w.points}</td>
                <td className="py-1.5 pr-3 text-slate-300" title={w.toAddress}>
                  {w.toAddress ? shortAddress(w.toAddress) : '—'}
                </td>
                <td className="py-1.5 pr-3 font-sans font-bold text-slate-200">{w.status}</td>
                <td
                  className={`py-1.5 pr-3 font-sans ${w.secondFactor === 'none' ? 'font-bold text-red-400' : 'text-slate-300'}`}
                >
                  {w.secondFactor ? FACTOR_LABEL[w.secondFactor] : 'Not recorded'}
                </td>
                <td className="whitespace-nowrap py-1.5 text-slate-400">{w.requestIp ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
