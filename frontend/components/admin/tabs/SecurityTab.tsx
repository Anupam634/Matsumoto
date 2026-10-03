'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  getAuditLog,
  getSecuritySettings,
  revokeAllAdminSessions,
  updateSecuritySettings,
  type AdminAuditEntry,
  type AdminAuditPage,
  type AdminSecurityConfig,
  type AdminSecurityEnforcement,
  type AdminSecuritySettings,
  type AdminStats,
  type AuditOutcome,
  type SecuritySettingName,
  type SecuritySettingsPatch,
  type SecuritySettingSource,
} from '../../../lib/admin-api';

/**
 * The Security tab. Everything on it is read from and saved to the server:
 * this tab used to show the sign-up caps in editable fields, report "saved",
 * and send nothing — so a cap typed in here reverted to the env value on the
 * next page load, and its "anomaly log" was three hard-coded rows.
 */

type NumericSetting = 'maxAccountsPerDevice' | 'maxAccountsPerIp' | 'maxAccountsPerSubnet';

const NUMERIC_SETTINGS: { name: NumericSetting; label: string; hint: string }[] = [
  {
    name: 'maxAccountsPerDevice',
    label: 'Max sign-ups per device',
    hint: 'Accounts one device fingerprint may open. Applies from the next sign-up.',
  },
  {
    name: 'maxAccountsPerIp',
    label: 'Max sign-ups per IP address',
    hint: 'Accounts one IP address may open.',
  },
  {
    name: 'maxAccountsPerSubnet',
    label: 'Max sign-ups per /24 network',
    hint: '0 turns this check off. A /24 can be one household — or a whole mobile carrier behind NAT.',
  },
];

const TOTP_LABEL = 'Require Google Authenticator for withdrawals';

const SOURCE_BADGE: Record<SecuritySettingSource, { label: string; className: string }> = {
  admin: {
    label: 'Set in this panel',
    className: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
  },
  env: {
    label: 'Server env',
    className: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300',
  },
  default: {
    label: 'Built-in default',
    className: 'border-slate-700 bg-slate-800/80 text-slate-300',
  },
};

const fmtDate = (iso: string) => new Date(iso).toLocaleString();

const errorText = (err: unknown) =>
  err instanceof ApiError ? err.message : 'Cannot reach the server.';

const isUnauthorized = (err: unknown) => err instanceof ApiError && err.status === 401;

export function SecurityTab({
  stats,
  onUnauthorized,
}: {
  stats: AdminStats | null;
  /** Signs the operator out — after "sign out every admin session", or a 401. */
  onUnauthorized: () => void;
}) {
  const [config, setConfig] = useState<AdminSecurityConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setConfig(await getSecuritySettings());
      setLoadError(null);
    } catch (err) {
      if (isUnauthorized(err)) return onUnauthorized();
      setLoadError(errorText(err));
    }
  }, [onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <h2 className="text-xl font-black text-white">🛡️ Security, Roles & Anti-Abuse Controls</h2>
          <p className="text-xs text-slate-400">
            Sign-up limits, two-factor rules, admin sessions, and the audit trail of every admin action
          </p>
        </div>
        <div className="rounded-xl border border-red-500/30 bg-red-950/30 px-3.5 py-1.5 font-mono text-xs text-red-300 font-bold">
          Suspended Accounts: {stats?.blockedUsers ?? 0}
        </div>
      </div>

      {loadError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          <span>
            <span className="font-bold">⚠</span> Could not load the security settings: {loadError}
          </span>
          <button
            onClick={load}
            className="rounded-lg border border-red-500/40 px-3 py-1 font-bold hover:bg-red-900/40"
          >
            Retry
          </button>
        </div>
      )}

      {config ? (
        <SettingsCard settings={config.settings} onSaved={setConfig} onUnauthorized={onUnauthorized} />
      ) : (
        !loadError && (
          <div className="card border-slate-800 bg-slate-900/80 p-6 text-center text-xs text-slate-500">
            Loading security settings…
          </div>
        )
      )}

      {config && <EnforcementCard enforcement={config.enforcement} />}

      <SessionsCard ttl={config?.enforcement.adminSessionTtl} onUnauthorized={onUnauthorized} />

      <AuditLogCard onUnauthorized={onUnauthorized} />
    </div>
  );
}

/* ─────────────────────────── Editable settings ─────────────────────────── */

/** Numbers are held as text so a field can be cleared while it is retyped. */
type Draft = Record<NumericSetting, string> & { requireTotpForWithdrawal: boolean };

function draftFrom(settings: AdminSecuritySettings): Draft {
  return {
    maxAccountsPerDevice: String(settings.maxAccountsPerDevice.value),
    maxAccountsPerIp: String(settings.maxAccountsPerIp.value),
    maxAccountsPerSubnet: String(settings.maxAccountsPerSubnet.value),
    requireTotpForWithdrawal: settings.requireTotpForWithdrawal.value,
  };
}

/** Only the fields that differ from what the server enforces, plus the first problem found. */
function changesFrom(
  settings: AdminSecuritySettings,
  draft: Draft,
): { patch: SecuritySettingsPatch; problem: string | null } {
  const patch: SecuritySettingsPatch = {};
  let problem: string | null = null;

  for (const { name, label } of NUMERIC_SETTINGS) {
    const view = settings[name];
    const text = draft[name].trim();
    if (text === String(view.value)) continue;
    const n = Number(text);
    const min = view.min ?? 0;
    const max = view.max ?? Number.MAX_SAFE_INTEGER;
    if (!/^\d+$/.test(text) || n < min || n > max) {
      problem ??= `${label} must be a whole number from ${min} to ${max}.`;
      continue;
    }
    patch[name] = n;
  }
  if (draft.requireTotpForWithdrawal !== settings.requireTotpForWithdrawal.value) {
    patch.requireTotpForWithdrawal = draft.requireTotpForWithdrawal;
  }
  return { patch, problem };
}

function SettingsCard({
  settings,
  onSaved,
  onUnauthorized,
}: {
  settings: AdminSecuritySettings;
  onSaved: (next: AdminSecurityConfig) => void;
  onUnauthorized: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFrom(settings));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Re-seed from every server answer, so the fields always show what is
  // actually being enforced — never a value that only exists in this form.
  useEffect(() => setDraft(draftFrom(settings)), [settings]);

  const { patch, problem } = useMemo(() => changesFrom(settings, draft), [settings, draft]);
  const changedCount = Object.keys(patch).length + (problem ? 1 : 0);

  async function send(body: SecuritySettingsPatch, done: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      onSaved(await updateSecuritySettings(body));
      setNotice(done);
    } catch (err) {
      if (isUnauthorized(err)) return onUnauthorized();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (problem) {
      setError(problem);
      return;
    }
    if (Object.keys(patch).length === 0) return;
    void send(patch, 'Saved. The values below are what the server is enforcing now.');
  }

  function reset(name: SecuritySettingName, label: string) {
    const fallback = settings[name].defaultValue;
    const shown = typeof fallback === 'boolean' ? (fallback ? 'On' : 'Off') : String(fallback);
    void send({ [name]: null }, `${label} is back on its default (${shown}).`);
  }

  const totp = settings.requireTotpForWithdrawal;

  return (
    <form onSubmit={save} className="card space-y-5 border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <div>
        <h3 className="text-sm font-black uppercase tracking-wider text-white">⚙️ Enforced Limits</h3>
        <p className="mt-1 text-xs text-slate-400">
          Saved values apply to every server within seconds and override the server env until reset.
          Every change is recorded in the audit log below.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          <span className="font-bold">⚠</span> {error}
        </div>
      )}
      {notice && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs font-bold text-emerald-300">
          ✓ {notice}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {NUMERIC_SETTINGS.map(({ name, label, hint }) => {
          const view = settings[name];
          const edited = draft[name].trim() !== String(view.value);
          return (
            <div key={name} className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <label htmlFor={`setting-${name}`} className="text-xs font-bold uppercase text-slate-400">
                  {label}
                </label>
                <SourceBadge source={view.source} />
              </div>
              <input
                id={`setting-${name}`}
                type="number"
                inputMode="numeric"
                min={view.min}
                max={view.max}
                step={1}
                value={draft[name]}
                onChange={(e) => setDraft((d) => ({ ...d, [name]: e.target.value }))}
                disabled={busy}
                className={`w-full rounded-xl border bg-slate-950 p-2.5 font-mono text-lg font-bold text-amber-400 outline-none focus:ring-1 focus:ring-amber-500/40 ${
                  edited ? 'border-amber-500' : 'border-slate-800 focus:border-amber-500'
                }`}
              />
              <p className="text-[11px] text-slate-500">{hint}</p>
              <SettingFooter
                enforced={String(view.value)}
                fallback={String(view.defaultValue)}
                edited={edited}
                updatedBy={view.source === 'admin' ? view.updatedBy : null}
                updatedAt={view.source === 'admin' ? view.updatedAt : null}
                onReset={view.source === 'admin' ? () => reset(name, label) : undefined}
                busy={busy}
              />
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <span className="text-xs font-bold uppercase text-slate-400">{TOTP_LABEL}</span>
          <SourceBadge source={totp.source} />
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={draft.requireTotpForWithdrawal}
          aria-label={TOTP_LABEL}
          disabled={busy}
          onClick={() =>
            setDraft((d) => ({ ...d, requireTotpForWithdrawal: !d.requireTotpForWithdrawal }))
          }
          className="flex items-center gap-3 disabled:opacity-50"
        >
          <span
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition ${
              draft.requireTotpForWithdrawal
                ? 'border-emerald-400 bg-emerald-500/80'
                : 'border-slate-700 bg-slate-800'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition ${
                draft.requireTotpForWithdrawal ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </span>
          <span
            className={`text-sm font-bold ${
              draft.requireTotpForWithdrawal ? 'text-emerald-300' : 'text-slate-300'
            }`}
          >
            {draft.requireTotpForWithdrawal ? 'Required' : 'Not required'}
          </span>
        </button>
        <p className="text-[11px] text-slate-500">
          When on, miners who have not set up an authenticator app cannot withdraw until they turn it
          on in their profile. Miners who already have one are always asked for its code, whatever
          this says.
        </p>
        <SettingFooter
          enforced={totp.value ? 'On' : 'Off'}
          fallback={totp.defaultValue ? 'On' : 'Off'}
          edited={draft.requireTotpForWithdrawal !== totp.value}
          updatedBy={totp.source === 'admin' ? totp.updatedBy : null}
          updatedAt={totp.source === 'admin' ? totp.updatedAt : null}
          onReset={
            totp.source === 'admin' ? () => reset('requireTotpForWithdrawal', TOTP_LABEL) : undefined
          }
          busy={busy}
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {changedCount > 0 && (
          <span className="text-xs font-bold text-amber-300">
            {changedCount} unsaved change{changedCount === 1 ? '' : 's'}
          </span>
        )}
        {changedCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setDraft(draftFrom(settings));
              setError(null);
            }}
            disabled={busy}
            className="rounded-xl border border-slate-800 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-white disabled:opacity-50"
          >
            Discard
          </button>
        )}
        <button
          type="submit"
          disabled={busy || changedCount === 0}
          className="btn-gold rounded-xl px-6 py-2.5 text-xs font-black uppercase text-slate-950 disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save Security Rules'}
        </button>
      </div>
    </form>
  );
}

function SourceBadge({ source }: { source: SecuritySettingSource }) {
  const badge = SOURCE_BADGE[source];
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

function SettingFooter({
  enforced,
  fallback,
  edited,
  updatedBy,
  updatedAt,
  onReset,
  busy,
}: {
  enforced: string;
  fallback: string;
  edited: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
  onReset?: () => void;
  busy: boolean;
}) {
  return (
    <div className="space-y-1 border-t border-slate-800 pt-2 text-[11px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-400">
          Enforced now: <span className="font-mono font-bold text-white">{enforced}</span>
          {edited && <span className="ml-1 text-amber-300">(unsaved edit)</span>}
          <span className="mx-1.5 text-slate-600">·</span>
          Default: <span className="font-mono text-slate-300">{fallback}</span>
        </span>
        {onReset && (
          <button
            type="button"
            onClick={onReset}
            disabled={busy}
            className="font-bold text-amber-400 hover:text-amber-300 disabled:opacity-40"
          >
            Reset to default
          </button>
        )}
      </div>
      {(updatedBy || updatedAt) && (
        <div className="text-slate-500">
          Changed by <span className="text-slate-300">{updatedBy ?? 'unknown'}</span>
          {updatedAt && <> · {fmtDate(updatedAt)}</>}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────── Server-env switches (read-only) ──────────────────────── */

function EnforcementCard({ enforcement }: { enforcement: AdminSecurityEnforcement }) {
  const rows: { label: string; env: string; on: boolean; state?: string; detail: string; warn?: boolean }[] = [
    {
      label: 'Admin sign-in code',
      env: 'ADMIN_LOGIN_OTP_ENFORCED',
      on: enforcement.adminLoginCode,
      detail: enforcement.adminLoginCode
        ? `Emailed to ${enforcement.adminLoginCodeSentTo.join(', ') || 'the admin account’s own inbox'} (ADMIN_OTP_EMAIL).`
        : 'Off — admins sign in with the password alone.',
      warn: !enforcement.adminLoginCode,
    },
    {
      label: 'Admin session lifetime',
      env: 'ADMIN_SESSION_TTL',
      on: true,
      state: enforcement.adminSessionTtl,
      detail: 'An admin token stops working after this, and the operator signs in again with a new code.',
    },
    {
      label: 'Miner sign-in email code',
      env: 'LOGIN_OTP_ENFORCED',
      on: enforcement.userLoginCode,
      detail: enforcement.userLoginCode
        ? 'Asked of every miner without an authenticator app, on the website and the mobile app.'
        : 'Off — miners without an authenticator app sign in with the password alone.',
      warn: !enforcement.userLoginCode,
    },
    {
      label: 'Withdrawal email code',
      env: 'WITHDRAWAL_OTP_ENFORCED',
      on: enforcement.withdrawalCode,
      detail: enforcement.withdrawalCode
        ? 'Asked on every withdrawal from a miner without an authenticator app, on every platform.'
        : 'Off — miners without an authenticator app withdraw with their session alone.',
      warn: !enforcement.withdrawalCode,
    },
    {
      label: 'Authenticator secret key',
      env: 'TOTP_ENCRYPTION_KEY',
      on: enforcement.authenticatorKeyConfigured,
      state: enforcement.authenticatorKeyConfigured ? 'Set' : 'Not set',
      detail: enforcement.authenticatorKeyConfigured
        ? 'Miners’ authenticator secrets are encrypted with a dedicated key.'
        : 'Not set — authenticator secrets are encrypted with a key derived from JWT_SECRET, so rotating JWT_SECRET would disable every authenticator set up until then. Set TOTP_ENCRYPTION_KEY (openssl rand -hex 32) and restart the API.',
      warn: !enforcement.authenticatorKeyConfigured,
    },
  ];

  return (
    <div className="card border-slate-800 bg-slate-900/80 p-5 sm:p-6">
      <h3 className="text-sm font-black uppercase tracking-wider text-white">
        🔐 Enforced by the Server Environment
      </h3>
      <p className="mt-1 text-xs text-slate-400">
        These are read from the server env and change only there (then restart the API). They are
        deliberately not editable here: a stolen admin session must not be able to switch off the
        checks that stop it, or send the admin sign-in code to its own inbox.
      </p>
      <ul className="mt-4 divide-y divide-slate-800/80">
        {rows.map((r) => (
          <li key={r.env} className="flex flex-wrap items-start justify-between gap-3 py-3">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-slate-200">
                {r.label}{' '}
                <span className="font-mono text-[10px] font-normal text-slate-500">{r.env}</span>
              </div>
              <div className={`mt-0.5 text-[11px] ${r.warn ? 'text-amber-300' : 'text-slate-400'}`}>
                {r.warn && '⚠ '}
                {r.detail}
              </div>
            </div>
            <span
              className={`shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold ${
                r.warn
                  ? 'border-amber-500/40 bg-amber-500/15 text-amber-300'
                  : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
              }`}
            >
              {r.state ?? (r.on ? 'ON' : 'OFF')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─────────────────────────────── Admin sessions ─────────────────────────────── */

function SessionsCard({ ttl, onUnauthorized }: { ttl?: string; onUnauthorized: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function revokeAll() {
    const ok = confirm(
      'Sign out every admin session?\n\nEvery admin account, on every device — including this one — will have to sign in again with the emailed code.',
    );
    if (!ok) return;
    setBusy(true);
    setError(null);
    try {
      const { revoked } = await revokeAllAdminSessions();
      alert(
        `Signed out ${revoked} admin account${revoked === 1 ? '' : 's'} everywhere. Sign in again with the emailed code.`,
      );
      onUnauthorized();
    } catch (err) {
      if (isUnauthorized(err)) return onUnauthorized();
      setError(errorText(err));
      setBusy(false);
    }
  }

  return (
    <div className="card flex flex-wrap items-center justify-between gap-4 border-red-500/20 bg-slate-900/80 p-5 sm:p-6">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">🚪 Admin Sessions</h3>
        <p className="mt-1 text-xs text-slate-400">
          Admin sign-ins need the emailed code{ttl ? ` and last ${ttl}` : ''}. If an admin password may
          have leaked, change <span className="font-mono text-slate-300">ADMIN_PASSWORD</span> on the
          server — that also ends the sessions opened with it — or end every session right now.
        </p>
        {error && <p className="mt-2 text-xs text-red-300">⚠ {error}</p>}
      </div>
      <button
        type="button"
        onClick={revokeAll}
        disabled={busy}
        className="rounded-xl border border-red-500/40 bg-red-950/40 px-4 py-2.5 text-xs font-black uppercase text-red-300 transition hover:bg-red-900/60 disabled:opacity-50"
      >
        {busy ? 'Signing out…' : 'Sign out every admin session'}
      </button>
    </div>
  );
}

/* ─────────────────────────────── Audit log ─────────────────────────────── */

const AUDIT_PAGE_SIZE = 25;

/** Server-side prefix filters on the action column. */
const ACTION_FILTERS: { key: string; label: string }[] = [
  { key: '', label: 'Everything' },
  { key: 'ADMIN_LOGIN', label: 'Sign-ins' },
  { key: 'POST', label: 'Changes' },
  { key: 'GET', label: 'Sensitive reads' },
];

const LOGIN_LABELS: Record<string, string> = {
  ADMIN_LOGIN_SUCCEEDED: 'Signed in',
  ADMIN_LOGIN_CODE_SENT: 'Sign-in code emailed',
  ADMIN_LOGIN_CODE_FAILED: 'Wrong sign-in code',
  ADMIN_LOGIN_FAILED: 'Failed sign-in',
  ADMIN_LOGIN_PUBLISHED_PASSWORD: 'Tried a published password',
};

const ROUTE_LABELS: Record<string, string> = {
  'POST /admin/users/:id/block': 'Suspended / reinstated miner',
  'POST /admin/users/:id/rate': 'Adjusted hash rate',
  'POST /admin/users/:id/airdrop': 'Airdropped points',
  'POST /admin/users/:id/2fa/reset': 'Reset miner 2FA',
  'POST /admin/users/:id/sessions/revoke': 'Signed miner out everywhere',
  'POST /admin/withdrawals/:id/decision': 'Decided withdrawal',
  'POST /admin/kyc/:userId/decision': 'Decided KYC',
  'GET /admin/kyc/:userId': 'Viewed KYC documents',
  'GET /admin/email-health': 'Sent SMTP test email',
  'POST /admin/security/settings': 'Changed security settings',
  'POST /admin/security/sessions/revoke-all': 'Signed out every admin session',
  'POST /admin/tasks': 'Created task',
  'POST /admin/tasks/:id/update': 'Edited task',
  'POST /admin/tasks/:id/delete': 'Deleted task',
  'POST /admin/boosters/plans': 'Created booster plan',
  'POST /admin/boosters/plans/:id/update': 'Edited booster plan',
  'POST /admin/boosters/plans/:id/delete': 'Deleted booster plan',
  'POST /admin/boosters/purchases/:id/force-confirm': 'Force-confirmed booster payment',
  'POST /admin/support/:id/reply': 'Replied to support ticket',
  'POST /admin/support/:id/close': 'Closed support ticket',
};

const OUTCOME_BADGE: Record<AuditOutcome, { label: string; className: string }> = {
  ok: { label: 'OK', className: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400' },
  error: { label: 'Error', className: 'border-red-500/30 bg-red-500/15 text-red-400' },
  denied: { label: 'Denied', className: 'border-amber-500/40 bg-amber-500/15 text-amber-300' },
};

/** The request body the interceptor stored, if any. */
function bodyOf(detail: unknown): Record<string, unknown> | undefined {
  if (!detail || typeof detail !== 'object') return undefined;
  const body = (detail as { body?: unknown }).body;
  return body && typeof body === 'object' ? (body as Record<string, unknown>) : undefined;
}

/** A readable name for an audit row, refined by its body where that says more. */
function describeAction(entry: AdminAuditEntry): string {
  if (LOGIN_LABELS[entry.action]) return LOGIN_LABELS[entry.action];

  const body = bodyOf(entry.detail);
  switch (entry.action) {
    case 'POST /admin/users/:id/block':
      if (typeof body?.blocked === 'boolean') return body.blocked ? 'Suspended miner' : 'Reinstated miner';
      break;
    case 'POST /admin/withdrawals/:id/decision':
      if (typeof body?.approve === 'boolean') return body.approve ? 'Approved withdrawal' : 'Rejected withdrawal';
      break;
    case 'POST /admin/kyc/:userId/decision':
      if (typeof body?.approve === 'boolean') return body.approve ? 'Approved KYC' : 'Rejected KYC';
      break;
  }

  const csv = /^GET \/admin\/reports\/(.+)\/csv$/.exec(entry.action);
  if (csv) return `Exported ${csv[1]} CSV`;

  return ROUTE_LABELS[entry.action] ?? entry.action;
}

/** A short second line under the action, from the parts of `detail` worth reading at a glance. */
function summarize(entry: AdminAuditEntry): string | null {
  const detail = entry.detail && typeof entry.detail === 'object' ? (entry.detail as Record<string, unknown>) : {};
  if (typeof detail.reason === 'string') return detail.reason;
  if (Array.isArray(detail.sentTo)) return `to ${detail.sentTo.join(', ')}`;
  const error = detail.error as { message?: unknown } | undefined;
  if (error && typeof error.message === 'string') return error.message;
  const body = bodyOf(entry.detail);
  if (body) {
    if (typeof body.points === 'number') return `${body.points} points${typeof body.note === 'string' ? ` — ${body.note}` : ''}`;
    if (typeof body.note === 'string') return body.note;
    if (typeof body.reason === 'string') return body.reason;
    if (entry.action === 'POST /admin/security/settings') {
      return Object.entries(body)
        .map(([k, v]) => `${k} → ${v === null ? 'default' : String(v)}`)
        .join(', ');
    }
  }
  return null;
}

function AuditLogCard({ onUnauthorized }: { onUnauthorized: () => void }) {
  const [filter, setFilter] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminAuditPage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      setData(
        await getAuditLog({ page, pageSize: AUDIT_PAGE_SIZE, action: filter, adminEmail }),
      );
      setError(null);
    } catch (err) {
      if (isUnauthorized(err)) return onUnauthorized();
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }, [page, filter, adminEmail, onUnauthorized]);

  useEffect(() => {
    load();
  }, [load]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const first = data && data.total > 0 ? (data.page - 1) * data.pageSize + 1 : 0;
  const last = data ? Math.min(data.total, data.page * data.pageSize) : 0;

  return (
    <div className="card border-slate-800 bg-slate-900/80 p-5 shadow-2xl backdrop-blur-md sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-white">🧾 Admin Audit Log</h3>
          <p className="mt-1 text-xs text-slate-400">
            Every admin sign-in attempt and every change made through the admin panel, newest first.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={busy}
          className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white disabled:opacity-50"
        >
          {busy ? 'Loading…' : '↻ Refresh'}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {ACTION_FILTERS.map((f) => (
            <button
              key={f.key || 'all'}
              type="button"
              onClick={() => {
                setFilter(f.key);
                setPage(1);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition ${
                filter === f.key
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <form
          className="flex min-w-[220px] flex-1 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setAdminEmail(emailInput.trim());
            setPage(1);
          }}
        >
          <input
            type="search"
            value={emailInput}
            onChange={(e) => {
              setEmailInput(e.target.value);
              // Clearing the box clears the filter without another click.
              if (!e.target.value.trim() && adminEmail) {
                setAdminEmail('');
                setPage(1);
              }
            }}
            placeholder="Filter by exact admin email…"
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-500"
          />
          <button
            type="submit"
            className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-white"
          >
            Apply
          </button>
        </form>
      </div>

      {error && (
        <div className="mt-3 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
          <span className="font-bold">⚠</span> {error}
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-white/[0.08] bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="p-2.5">When</th>
              <th className="p-2.5">Admin</th>
              <th className="p-2.5">Action</th>
              <th className="p-2.5">Target</th>
              <th className="p-2.5">Result</th>
              <th className="p-2.5">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {!data || data.rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  {busy || !data ? 'Loading audit log…' : 'Nothing recorded for this filter yet.'}
                </td>
              </tr>
            ) : (
              data.rows.map((entry) => {
                const open = expanded === entry.id;
                const outcome = OUTCOME_BADGE[entry.outcome] ?? OUTCOME_BADGE.error;
                const summary = summarize(entry);
                return (
                  <React.Fragment key={entry.id}>
                    <tr
                      onClick={() => setExpanded(open ? null : entry.id)}
                      className={`cursor-pointer transition hover:bg-slate-800/40 ${open ? 'bg-slate-800/30' : ''}`}
                      title="Show the full record"
                    >
                      <td className="whitespace-nowrap p-2.5 font-mono text-slate-400">
                        {fmtDate(entry.createdAt)}
                      </td>
                      <td className="max-w-[180px] truncate p-2.5 font-bold text-white" title={entry.adminEmail}>
                        {entry.adminEmail}
                      </td>
                      <td className="p-2.5">
                        <div className="font-bold text-slate-100">{describeAction(entry)}</div>
                        {summary && (
                          <div className="max-w-[320px] truncate text-[11px] text-slate-500" title={summary}>
                            {summary}
                          </div>
                        )}
                      </td>
                      <td className="max-w-[120px] truncate p-2.5 font-mono text-slate-400" title={entry.target ?? undefined}>
                        {entry.target ?? '—'}
                      </td>
                      <td className="p-2.5">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${outcome.className}`}>
                          {outcome.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2.5 font-mono text-slate-400">{entry.ip ?? '—'}</td>
                    </tr>
                    {open && (
                      <tr className="bg-slate-950/60">
                        <td colSpan={6} className="p-3">
                          <dl className="grid gap-2 text-[11px] sm:grid-cols-3">
                            <div>
                              <dt className="font-bold uppercase text-slate-500">Action</dt>
                              <dd className="break-all font-mono text-slate-300">{entry.action}</dd>
                            </div>
                            <div>
                              <dt className="font-bold uppercase text-slate-500">Target</dt>
                              <dd className="break-all font-mono text-slate-300">{entry.target ?? '—'}</dd>
                            </div>
                            <div>
                              <dt className="font-bold uppercase text-slate-500">Browser</dt>
                              <dd className="break-all text-slate-300">{entry.userAgent ?? '—'}</dd>
                            </div>
                          </dl>
                          <pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 font-mono text-[11px] text-slate-300">
                            {entry.detail == null ? 'No details recorded.' : JSON.stringify(entry.detail, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
          <span>
            Showing {first}–{last} of {data.total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={busy || data.page <= 1}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-bold text-slate-300 hover:text-white disabled:opacity-40"
            >
              ← Newer
            </button>
            <span className="font-mono">
              {data.page} / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={busy || data.page >= pages}
              className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 font-bold text-slate-300 hover:text-white disabled:opacity-40"
            >
              Older →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
