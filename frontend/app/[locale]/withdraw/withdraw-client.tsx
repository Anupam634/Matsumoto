'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  getProfile,
  getToken,
  getWithdrawals,
  requestWithdrawal,
  WITHDRAWAL_COOLDOWN_DAYS,
  WITHDRAWAL_MIN_POINTS,
  type Profile,
  type WithdrawalDto,
} from '../../../lib/api';
import { AppHeader } from '../../../components/AppHeader';
import { BnbBadge, BnbLogo } from '../../../components/BnbLogo';

/** SPEC §3: 3 points = 1 mainnet $Matsumoto. */
const POINTS_PER_TOKEN = 3;

/** Loose shape check only — the server validates the address for real. */
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export default function WithdrawClient() {
  const t = useTranslations('withdraw');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<WithdrawalDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, h] = await Promise.all([getProfile(), getWithdrawals()]);
      setProfile(p);
      setHistory(h);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace(`/${locale}/login`);
        return;
      }
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [router, locale, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${locale}/login`);
      return;
    }
    load();
  }, [load, router, locale]);

  return (
    <div className="app-shell min-h-dvh">
      <AppHeader locale={locale} backLabel={t('backToDashboard')} maxWidth="max-w-3xl" />

      <main
        className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-400">{t('subtitle')}</p>
        <div className="mt-3">
          <BnbBadge label={t('paidOnChain')} />
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!profile || !history ? (
          <div className="panel mt-6 space-y-3 p-6">
            <div className="skeleton h-5 w-32" />
            <div className="skeleton h-28 w-full" />
          </div>
        ) : (
          <>
            <RequestForm
              profile={profile}
              history={history}
              locale={locale}
              onDone={load}
            />
            <History rows={history} />
          </>
        )}
      </main>
    </div>
  );
}

/* ─────────────────────────── Request form ────────────────────────── */

function RequestForm({
  profile,
  history,
  locale,
  onDone,
}: {
  profile: Profile;
  history: WithdrawalDto[];
  locale: string;
  onDone: () => void;
}) {
  const t = useTranslations('withdraw');
  const [points, setPoints] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const balance = profile.pointsBalance;

  // The server allows one request per rolling week; work out when the last
  // one frees up so the form can say so instead of failing on submit.
  const cooldownUntil = useMemo(() => {
    const last = history[0];
    if (!last) return null;
    const free =
      new Date(last.requestedAt).getTime() +
      WITHDRAWAL_COOLDOWN_DAYS * 24 * 3_600_000;
    return free > Date.now() ? new Date(free) : null;
  }, [history]);

  const kycOk = profile.kycStatus === 'APPROVED';
  const enoughBalance = balance >= WITHDRAWAL_MIN_POINTS;
  const blocked = !kycOk || !enoughBalance || cooldownUntil !== null;

  const amount = Number(points);
  const amountValid =
    Number.isFinite(amount) &&
    amount >= WITHDRAWAL_MIN_POINTS &&
    amount <= balance;
  const addressValid = ADDRESS_RE.test(toAddress.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestWithdrawal(amount, toAddress.trim());
      setPoints('');
      setToAddress('');
      setDone(true);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel mt-6 p-5 sm:p-6">
      {/* What is actually withdrawable right now. */}
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 pb-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('available')}
          </div>
          <div className="mt-1 text-3xl font-extrabold tabular-nums text-white">
            {balance.toFixed(2)}
            <span className="ml-1.5 text-sm font-semibold text-slate-400">
              {t('pointsShort')}
            </span>
          </div>
        </div>
        <div className="text-right text-sm text-slate-400">
          <span className="chain-indicator">
            <BnbLogo className="h-3 w-3" />≈{' '}
            {(balance / POINTS_PER_TOKEN).toFixed(4)} $Matsumoto
          </span>
        </div>
      </div>

      {/* Gates, most blocking first. */}
      {!kycOk && (
        <Link
          href={`/${locale}/kyc`}
          className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-200 transition hover:border-amber-400/50"
        >
          <span>{t('kycRequired')}</span>
          <span className="shrink-0 font-bold">{t('verifyCta')} →</span>
        </Link>
      )}
      {kycOk && !enoughBalance && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
          {t('needMore', { min: WITHDRAWAL_MIN_POINTS })}
        </p>
      )}
      {kycOk && enoughBalance && cooldownUntil && (
        <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-slate-300">
          {t('cooldown', { date: cooldownUntil.toLocaleDateString() })}
        </p>
      )}

      {done && (
        <p className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          ✓ {t('submitted')}
        </p>
      )}

      <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
        <label className="block">
          <span className="field-label">
            {t('amount')} ({t('pointsShort')})
          </span>
          <input
            className="input-field mt-1.5 tabular-nums"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            disabled={blocked || busy}
            inputMode="decimal"
            placeholder={String(WITHDRAWAL_MIN_POINTS)}
          />
          <span className="mt-1.5 flex items-center justify-between text-xs text-slate-500">
            <span>{t('minNote', { min: WITHDRAWAL_MIN_POINTS })}</span>
            <button
              type="button"
              onClick={() => setPoints(String(Math.floor(balance * 100) / 100))}
              disabled={blocked || busy}
              className="font-semibold text-indigo-300 transition hover:text-indigo-200 disabled:opacity-40"
            >
              {t('useMax')}
            </button>
          </span>
        </label>

        <label className="block">
          <span className="field-label">{t('toAddress')}</span>
          <input
            className="input-field mt-1.5 font-mono text-xs"
            value={toAddress}
            onChange={(e) => setToAddress(e.target.value)}
            disabled={blocked || busy}
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <span className="mt-1.5 block text-xs text-slate-500">
            {t('addressNote')}
          </span>
        </label>

        {/* What actually lands in the wallet, before they commit. */}
        {amountValid && (
          <div className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-sm">
            <span className="text-slate-300">{t('youReceive')}</span>{' '}
            <span className="font-bold text-white tabular-nums">
              {(amount / POINTS_PER_TOKEN).toFixed(4)} $Matsumoto
            </span>
            <span className="ml-1 text-xs text-slate-400">
              ({t('conversionNote')})
            </span>
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={blocked || busy || !amountValid || !addressValid}
          className="btn-primary w-full py-3"
        >
          {busy ? t('submitting') : t('submit')}
        </button>

        <p className="text-xs text-slate-500">{t('reviewNote')}</p>
      </form>
    </section>
  );
}

/* ───────────────────────────── History ───────────────────────────── */

function History({ rows }: { rows: WithdrawalDto[] }) {
  const t = useTranslations('withdraw');
  if (rows.length === 0) return null;

  return (
    <section className="panel mt-4 p-5 sm:p-6">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t('historyTitle')}
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map((w) => (
          <li
            key={w.id}
            className="border-b border-white/5 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold tabular-nums">
                {w.points.toFixed(2)} {t('pointsShort')}
                <span className="ml-2 text-sm font-normal text-slate-400">
                  → {w.tokenAmount} $Matsumoto
                </span>
              </span>
              <StatusBadge status={w.status} />
            </div>
            <div className="mt-1 break-all font-mono text-xs text-slate-500">
              {w.toAddress}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {new Date(w.requestedAt).toLocaleString()}
            </div>
            {w.txHash && (
              <a
                href={`https://bscscan.com/tx/${w.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 break-all font-mono text-xs text-indigo-300 transition hover:text-indigo-200"
              >
                <BnbLogo className="h-3 w-3 shrink-0" />
                {w.txHash}
              </a>
            )}
            {w.status === 'REJECTED' && w.adminNote && (
              <div className="mt-1.5 text-xs text-red-300">
                {t('rejectedReason')}: {w.adminNote}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function StatusBadge({ status }: { status: WithdrawalDto['status'] }) {
  const t = useTranslations('withdraw');
  const tone =
    status === 'PAID'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'APPROVED'
        ? 'bg-indigo-500/15 text-indigo-300'
        : status === 'PENDING'
          ? 'bg-amber-500/15 text-amber-300'
          : 'bg-red-500/15 text-red-300';
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}
