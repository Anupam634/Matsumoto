'use client';

import { useCallback, useEffect, useState } from 'react';
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
import { AppHeader } from '../../../components/AppHeader';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { BnbBadge } from '../../../components/BnbLogo';

export default function BoostersClient() {
  const t = useTranslations('boosters');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  const [data, setData] = useState<BoosterOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<BoosterPlanDto | null>(null);

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
    <div className="app-shell min-h-dvh">
      <AppHeader locale={params.locale} backLabel={t('backToDashboard')} maxWidth="max-w-4xl" />

      <main
        className="mx-auto max-w-4xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
          {t('title')}
        </h1>
        <p className="mt-2 text-slate-400">{t('subtitle')}</p>
        <div className="mt-3">
          <BnbBadge label={t('poweredByBnb')} />
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
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
              <section className="panel mt-6 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('activeTitle')}
                </h2>
                <ul className="mt-3 space-y-2">
                  {data.activeBoosters.map((b) => (
                    <li
                      key={b.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm"
                    >
                      <span className="font-semibold text-emerald-300">
                        ${b.priceUsd} · +{b.rateBonusPerHour}/h
                      </span>
                      <span className="text-emerald-300/80">
                        {t('expires')} {new Date(b.expiresAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {!data.payment.enabled && (
              <p className="mt-6 flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-500/10 p-4 text-sm text-amber-200">
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
                  onBuy={() => setCheckout(p)}
                />
              ))}
            </div>

            {data.purchases.length > 0 && (
              <section className="panel mt-6 p-5">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('historyTitle')}
                </h2>
                <ul className="mt-3 space-y-2 text-sm">
                  {data.purchases.map((p) => (
                    <li
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-2 last:border-0"
                    >
                      <span>
                        {p.amount} {p.tokenSymbol}
                      </span>
                      <StatusBadge status={p.status} />
                      {p.failureReason && (
                        <span className="w-full text-xs text-red-400">
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

      {checkout && (
        <CheckoutModal
          plan={checkout}
          minConfirmations={data?.payment.minConfirmations ?? 6}
          onClose={() => setCheckout(null)}
          onDone={async () => {
            setCheckout(null);
            await load();
          }}
        />
      )}

      <MobileTabBar locale={params.locale} />
    </div>
  );
}

function PlanCard({
  plan,
  disabled,
  onBuy,
}: {
  plan: BoosterPlanDto;
  disabled: boolean;
  onBuy: () => void;
}) {
  const t = useTranslations('boosters');

  return (
    <div className="glass-panel relative flex flex-col justify-between overflow-hidden p-5 transition-all hover:scale-[1.02]">
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-3xl font-black text-amber-400">
            ${plan.priceUsd}
          </span>
          <span className="text-xs font-bold uppercase tracking-wide text-slate-400">
            / {plan.durationDays}d
          </span>
        </div>

        <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400">
          +{plan.rateBonusPerHour} BONDKOIN/h
        </div>

        <div className="mt-4 space-y-2 border-t border-slate-800/80 pt-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{t('resultingRate')}</span>
            <span className="font-mono font-extrabold text-amber-300">
              {plan.resultingRatePerHour} /h
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">{t('duration')}</span>
            <span className="font-mono font-bold text-slate-300">
              {plan.durationDays} {t('days')} · {t('stackable')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <button
          type="button"
          onClick={onBuy}
          disabled={disabled}
          className="btn-gold block w-full rounded-xl py-2.5 text-center text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-md disabled:opacity-40"
        >
          {t('buy')} →
        </button>
      </div>
    </div>
  );
}

/** Loose shape check only — the server validates the address for real. */
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Booster checkout, in two steps.
 *
 * Step 1 binds the purchase to the wallet the miner will pay from, so a
 * stranger who spots the transaction on-chain cannot claim it. Step 2 is the
 * payment itself: exact amount, destination, and the hash to verify.
 */
function CheckoutModal({
  plan,
  minConfirmations,
  onClose,
  onDone,
}: {
  plan: BoosterPlanDto;
  minConfirmations: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const t = useTranslations('boosters');
  const [purchase, setPurchase] = useState<BoosterPurchaseDto | null>(null);
  const [fromAddress, setFromAddress] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createIntent(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      setPurchase(await createBoosterIntent(plan.id, fromAddress.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setBusy(false);
    }
  }

  return (
    // Step 2 is taller than a phone viewport. Centring a tall child with grid
    // or flex alone makes the overflow unreachable, so the scroll lives on the
    // backdrop and the panel centres inside a min-h-full wrapper instead.
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/65 p-4 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center">
        <div className="panel w-full max-w-md p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">
                {purchase ? t('payTitle') : t('fromTitle')}
              </h2>
              <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {t('step', { n: purchase ? 2 : 1 })} · ${plan.priceUsd} ·{' '}
                {plan.durationDays} {t('days')}
              </p>
            </div>
            <BnbBadge label={t('chainName')} />
          </div>

          {purchase ? (
            <PayStep
              purchase={purchase}
              minConfirmations={minConfirmations}
              onClose={onClose}
              onDone={onDone}
            />
          ) : (
            <form onSubmit={createIntent} className="mt-4">
              <p className="text-sm text-slate-400">{t('fromBody')}</p>

              <label className="mt-4 block">
                <span className="field-label">{t('fromLabel')}</span>
                <input
                  className="input-field mt-1.5 font-mono text-xs"
                  value={fromAddress}
                  onChange={(e) => setFromAddress(e.target.value)}
                  placeholder="0x…"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoFocus
                />
                {fromAddress.trim() !== '' &&
                  !ADDRESS_RE.test(fromAddress.trim()) && (
                    <span className="mt-1.5 block text-xs text-amber-300">
                      {t('fromInvalid')}
                    </span>
                  )}
              </label>

              {error && (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {error}
                </p>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-outline-brand flex-1 py-2.5 text-sm"
                >
                  {t('close')}
                </button>
                <button
                  type="submit"
                  disabled={busy || !ADDRESS_RE.test(fromAddress.trim())}
                  className="btn-primary flex-1 py-2.5 text-sm"
                >
                  {busy ? t('working') : t('continue')}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/** Step 2: pay the exact amount, then hand over the hash to verify. */
function PayStep({
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
  const [web3Busy, setWeb3Busy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);

  // Clean universal recipient wallet address for 100% compatibility across all mobile scanners & wallets
  useEffect(() => {
    if (purchase.payToAddress) {
      setQr(`https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(purchase.payToAddress)}`);
    } else {
      setQr(null);
    }
  }, [purchase.payToAddress]);

  // 1-Click Direct Web3 Wallet Payment (MetaMask, TrustWallet, OKX, Binance Web3)
  async function handleWeb3Pay() {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('No Web3 wallet detected. Please scan the QR code or copy the payment address below.');
      return;
    }
    setWeb3Busy(true);
    setError(null);
    try {
      const provider = (window as any).ethereum;
      const accounts = await provider.request({ method: 'eth_requestAccounts' });

      // Switch to BNB Smart Chain (Chain ID: 56 / 0x38)
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }],
        });
      } catch (switchErr: any) {
        // If BSC is not added to user's wallet, add it
        if (switchErr.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0x38',
                chainName: 'BNB Smart Chain',
                nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
                rpcUrls: ['https://bsc-dataseed.binance.org/'],
                blockExplorerUrls: ['https://bscscan.com'],
              },
            ],
          });
        }
      }

      // BEP-20 USDT contract on BSC
      const usdtContract = '0x55d398326f99059fF775485246999027B3197955';
      const cleanTo = purchase.payToAddress.toLowerCase().replace(/^0x/, '').padStart(64, '0');
      const parsedAmount = parseFloat(purchase.amount || '0');
      const amountWei = BigInt(Math.floor(parsedAmount * 1e6)) * BigInt(1e12); // 18 decimals
      const amountHex = amountWei.toString(16).padStart(64, '0');
      const callData = '0xa9059cbb' + cleanTo + amountHex; // transfer(address,uint256)

      const hash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: accounts[0],
            to: usdtContract,
            data: callData,
          },
        ],
      });

      if (hash) {
        setTxHash(hash);
        // Auto submit verification
        await submitBoosterPayment(purchase.id, hash);
        onDone();
      }
    } catch (err: any) {
      setError(err.message || 'Web3 payment failed or was cancelled.');
    } finally {
      setWeb3Busy(false);
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
    <>
      <p className="mt-3 text-sm text-slate-400">{t('payBody')}</p>

      {/* 1-Click Web3 Direct Payment Button */}
      <div className="mt-4 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 p-3.5 text-center">
        <button
          type="button"
          disabled={web3Busy}
          onClick={handleWeb3Pay}
          className="w-full rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 py-2.5 px-4 text-xs font-black text-slate-950 shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          {web3Busy ? 'Opening Web3 Wallet...' : `⚡ 1-Click Pay ${purchase.amount} USDT (MetaMask / TrustWallet)`}
        </button>
        <p className="mt-1.5 text-[10px] text-slate-400">
          Auto-connects to your wallet, fills exact amount & submits transaction instantly!
        </p>
      </div>

      <div className="relative my-4 flex items-center justify-center">
        <div className="border-t border-white/10 w-full" />
        <span className="bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-500">
          OR SCAN / SEND MANUALLY
        </span>
        <div className="border-t border-white/10 w-full" />
      </div>

      <dl className="space-y-3">
        <CopyRow label={t('amount')} value={purchase.amount} bold>
          {purchase.amount} {purchase.tokenSymbol}
        </CopyRow>
        <CopyRow label={t('payTo')} value={purchase.payToAddress} mono>
          {purchase.payToAddress}
        </CopyRow>
      </dl>

      {qr && (
        <div className="mt-4 flex flex-col items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qr}
            alt="Payment Address QR Code"
            width={144}
            height={144}
            className="rounded-lg bg-white p-1.5 shadow-md"
          />
          <p className="text-center text-xs text-slate-400">
            Scan with any crypto wallet (Binance, OKX, Trust Wallet, MetaMask) to copy recipient address.
          </p>
        </div>
      )}

      <div className="mt-3">
        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('payFrom')}
        </dt>
        <dd className="mt-1 break-all font-mono text-xs text-slate-400">
          {purchase.fromAddress}
        </dd>
      </div>

      <p className="mt-3 rounded-xl border border-indigo-400/20 bg-indigo-500/10 p-3 text-xs text-slate-300">
        {t('payWarning', { confirmations: minConfirmations })}
      </p>

      <form onSubmit={submit} className="mt-4">
        <label className="block">
          <span className="field-label">{t('txHash')}</span>
          <input
            className="input-field mt-1.5 font-mono text-xs"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
          />
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
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
    </>
  );
}

/** A value the miner has to reproduce exactly, so it ships with a copy button. */
function CopyRow({
  label,
  value,
  mono,
  bold,
  children,
}: {
  label: string;
  value: string;
  mono?: boolean;
  bold?: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations('boosters');
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the value is still selectable */
    }
  }

  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 flex items-center gap-2">
        <code
          className={`flex-1 break-all rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 ${
            mono ? 'text-xs' : 'text-sm'
          } ${bold ? 'font-bold' : ''}`}
        >
          {children}
        </code>
        <button
          onClick={copy}
          className="btn-outline-brand shrink-0 px-3 py-2 text-xs"
        >
          {copied ? '✓' : t('copy')}
        </button>
      </dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'CONFIRMED'
      ? 'bg-emerald-500/15 text-emerald-300'
      : status === 'AWAITING_PAYMENT'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-red-500/15 text-red-300';
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
