'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  createBoosterIntent,
  getBoosters,
  getToken,
  submitBoosterPayment,
  type BoosterOverview,
  type BoosterPlanDto,
  type BoosterPurchaseDto,
} from '../../../lib/api';

export default function BoostersClient() {
  const t = useTranslations('boosters');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  const [data, setData] = useState<BoosterOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [intent, setIntent] = useState<BoosterPurchaseDto | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await getBoosters());
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        router.replace(`/${params.locale}/login`);
        return;
      }
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [router, params.locale, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${params.locale}/login`);
      return;
    }
    load();
  }, [load, router, params.locale]);

  return (
    <div className="glow-field-light min-h-dvh text-slate-900">
      <header
        className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link
            href={`/${params.locale}/dashboard`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            ← {t('backToDashboard')}
          </Link>
          <span className="logo-badge" aria-hidden>
            M
          </span>
        </div>
      </header>

      <main
        className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-600">{t('subtitle')}</p>

        {error && (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!data ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-44 w-full" />
            ))}
          </div>
        ) : (
          <>
            {data.activeBoosters.length > 0 && (
              <section className="card-soft mt-6 p-5">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('activeTitle')}
                </h2>
                <ul className="mt-3 space-y-2">
                  {data.activeBoosters.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-emerald-700">
                        ${b.priceUsd} · +{b.rateBonusPerHour}/h
                      </span>
                      <span className="text-emerald-700/80">
                        {t('expires')} {new Date(b.expiresAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!data.payment.enabled && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <span aria-hidden>ⓘ</span>
                <span>
                  {t('paymentsDisabled')}
                  {data.payment.disabledReason && (
                    <span className="mt-1 block font-mono text-xs opacity-80">
                      {data.payment.disabledReason}
                    </span>
                  )}
                </span>
              </p>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {data.plans.map((p) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  disabled={!data.payment.enabled}
                  onBuy={setIntent}
                  onError={setError}
                />
              ))}
            </div>

            {data.purchases.length > 0 && (
              <section className="card-soft mt-6 p-5">
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('historyTitle')}
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.purchases.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0"
                    >
                      <span>
                        {p.amount} {p.tokenSymbol}
                      </span>
                      <StatusBadge status={p.status} />
                      {p.failureReason && (
                        <span className="w-full text-xs text-red-500">
                          {p.failureReason}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>

      {intent && (
        <PayModal
          purchase={intent}
          minConfirmations={data?.payment.minConfirmations ?? 6}
          onClose={() => setIntent(null)}
          onDone={async () => {
            setIntent(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  disabled,
  onBuy,
  onError,
}: {
  plan: BoosterPlanDto;
  disabled: boolean;
  onBuy: (p: BoosterPurchaseDto) => void;
  onError: (m: string) => void;
}) {
  const t = useTranslations('boosters');
  const [busy, setBusy] = useState(false);

  async function start() {
    const addr = prompt(t('askWallet'));
    if (!addr) return;
    setBusy(true);
    try {
      onBuy(await createBoosterIntent(plan.id, addr.trim()));
    } catch (err) {
      onError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-soft card-soft-lift flex flex-col p-5 text-center">
      <div className="text-3xl font-extrabold text-indigo-600">
        ${plan.priceUsd}
      </div>
      <div className="mt-3 text-xs uppercase tracking-wide text-slate-500">
        {t('resultingRate')}
      </div>
      <div className="text-xl font-bold">{plan.resultingRatePerHour} /h</div>
      <div className="mt-1 text-sm text-emerald-600">
        +{plan.rateBonusPerHour}/h
      </div>
      <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
        {plan.durationDays} {t('days')} · {t('stackable')}
      </div>
      <button
        onClick={start}
        disabled={disabled || busy}
        className="btn-primary mt-4 w-full py-2.5 text-sm"
      >
        {busy ? t('working') : t('buy')}
      </button>
    </div>
  );
}

/** Payment instructions + transaction-hash submission. */
function PayModal({
  purchase,
  minConfirmations,
  onClose,
  onDone,
}: {
  purchase: BoosterPurchaseDto;
  minConfirmations: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('boosters');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'addr' | 'amt' | null>(null);

  async function copy(value: string, which: 'addr' | 'amt') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — the value is still selectable */
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitBoosterPayment(purchase.id, txHash.trim());
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="card-soft w-full max-w-md p-6">
        <h2 className="text-lg font-bold">{t('payTitle')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('payBody')}</p>

        <dl className="mt-4 space-y-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('amount')}
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <code className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold">
                {purchase.amount} {purchase.tokenSymbol}
              </code>
              <button
                onClick={() => copy(purchase.amount, 'amt')}
                className="btn-outline-brand px-3 py-2 text-xs"
              >
                {copied === 'amt' ? '✓' : t('copy')}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('payTo')}
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
                {purchase.payToAddress}
              </code>
              <button
                onClick={() => copy(purchase.payToAddress, 'addr')}
                className="btn-outline-brand shrink-0 px-3 py-2 text-xs"
              >
                {copied === 'addr' ? '✓' : t('copy')}
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('payFrom')}
            </dt>
            <dd className="mt-1 break-all font-mono text-xs text-slate-600">
              {purchase.fromAddress}
            </dd>
          </div>
        </dl>

        <p className="mt-3 rounded-xl bg-indigo-50/70 p-3 text-xs text-slate-600">
          {t('payWarning', { confirmations: minConfirmations })}
        </p>

        <form onSubmit={submit} className="mt-4">
          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {t('txHash')}
            </span>
            <input
              className="input-field mt-1.5 font-mono text-xs"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="0x…"
              required
            />
          </label>

          {error && (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-outline-brand flex-1 py-2.5 text-sm"
            >
              {t('close')}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="btn-primary flex-1 py-2.5 text-sm"
            >
              {busy ? t('verifying') : t('verify')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'CONFIRMED'
      ? 'bg-emerald-50 text-emerald-600'
      : status === 'AWAITING_PAYMENT'
        ? 'bg-amber-50 text-amber-700'
        : 'bg-red-50 text-red-600';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
