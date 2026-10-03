'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
  type Profile,
  type TwoFactorSetup,
} from '../lib/api';

type Mode = 'idle' | 'setup' | 'disable';

/**
 * Google Authenticator (TOTP) two-factor authentication, on the profile page.
 *
 * Setup is two calls: `setupTwoFactor` hands back a secret that changes
 * nothing yet, and `enableTwoFactor` turns it on once a code from the app
 * proves the phone has it. Turning it on or off needs the password too, and
 * signs every other session out — the API returns a fresh token for this tab,
 * which `lib/api` stores, so only the other devices notice.
 */
export function TwoFactorCard({
  profile,
  onChanged,
}: {
  profile: Profile;
  onChanged: () => void | Promise<void>;
}) {
  const t = useTranslations('security');
  const on = profile.twoFactorEnabled;

  const [mode, setMode] = useState<Mode>('idle');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // The withdraw page links here as /profile#security, but this card only
  // exists once the profile has loaded — too late for the browser's own
  // jump to the anchor.
  useEffect(() => {
    if (window.location.hash === '#security') {
      document.getElementById('security')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Drawn in the browser. The otpauth link *is* the secret, so it must not
  // go to a hosted QR service the way the booster payment address does.
  useEffect(() => {
    if (!setup) {
      setQr(null);
      return;
    }
    let alive = true;
    setQrFailed(false);
    QRCode.toDataURL(setup.otpauthUrl, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => alive && setQr(url))
      .catch(() => alive && setQrFailed(true));
    return () => {
      alive = false;
    };
  }, [setup]);

  function close() {
    setMode('idle');
    setSetup(null);
    setCode('');
    setPassword('');
    setError(null);
    setCopied(false);
  }

  async function startSetup() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      setSetup(await setupTwoFactor());
      setMode('setup');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
      // 409: it was turned on elsewhere since this page loaded.
      if (err instanceof ApiError && err.status === 409) await onChanged();
    } finally {
      setBusy(false);
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) return setError(t('codeRequired'));
    if (!password) return setError(t('passwordRequired'));

    setBusy(true);
    setError(null);
    try {
      if (mode === 'setup') {
        await enableTwoFactor(code, password);
        setNotice(t('enabledDone'));
      } else {
        await disableTwoFactor(code, password);
        setNotice(t('disabledDone'));
      }
      close();
      await onChanged();
    } catch (err) {
      // A wrong code is cleared so the next one is typed fresh; the server's
      // message says what went wrong (wrong code, wrong password, locked).
      setCode('');
      setError(err instanceof ApiError ? err.message : t('offline'));
      if (err instanceof ApiError && err.status === 409) {
        close();
        await onChanged();
      }
    } finally {
      setBusy(false);
    }
  }

  async function copyKey() {
    if (!setup) return;
    try {
      await navigator.clipboard.writeText(setup.secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked — the key is on screen to select by hand */
    }
  }

  const codeFields = (
    <>
      <label className="block">
        <span className="field-label">{t('codeLabel')}</span>
        <input
          className="input-field mt-1.5 text-center font-mono text-lg tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          disabled={busy}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="••••••"
        />
      </label>
      <label className="block">
        <span className="field-label">{t('passwordLabel')}</span>
        <input
          className="input-field mt-1.5"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={busy}
          autoComplete="current-password"
          maxLength={128}
        />
      </label>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="submit"
          disabled={busy || code.length !== 6 || !password}
          className={
            mode === 'setup'
              ? 'btn-primary flex w-full items-center justify-center py-3 text-center text-sm font-black uppercase tracking-wider disabled:opacity-50'
              : 'flex w-full items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50'
          }
        >
          {busy ? t('working') : mode === 'setup' ? t('enable') : t('disable')}
        </button>
        <button
          type="button"
          onClick={close}
          disabled={busy}
          className="btn-secondary flex w-full items-center justify-center py-3 text-center text-sm font-bold disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      </div>
    </>
  );

  return (
    <section id="security" className="glass-panel scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('title')}</h2>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-slate-100">🔐 {t('twoFactorTitle')}</div>
          <div className="mt-0.5 text-xs text-slate-500">{t('twoFactorApp')}</div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
            on ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/[0.06] text-slate-400'
          }`}
        >
          {on ? t('statusOn') : t('statusOff')}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-400">{on ? t('onBody') : t('offBody')}</p>

      {notice && (
        <p className="mt-3 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-3 text-sm text-emerald-300">
          ✓ {notice}
        </p>
      )}

      {mode === 'idle' && (
        <>
          {error && (
            <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </p>
          )}
          {on ? (
            <button
              onClick={() => {
                setNotice(null);
                setError(null);
                setMode('disable');
              }}
              className="btn-secondary mt-4 flex w-full items-center justify-center py-2.5 text-center text-sm font-bold"
            >
              {t('disableCta')}
            </button>
          ) : (
            <button
              onClick={startSetup}
              disabled={busy}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2 py-3 text-center text-sm font-black uppercase tracking-wider disabled:opacity-50"
            >
              {busy ? t('working') : t('setupCta')}
            </button>
          )}
        </>
      )}

      {mode === 'setup' && setup && (
        <form onSubmit={confirm} className="mt-4 space-y-4" noValidate>
          <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-300">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
          </ol>

          <div className="flex justify-center">
            {qr ? (
              // A data: URL drawn in the browser — next/image has nothing to optimise.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt={t('qrAlt')}
                width={220}
                height={220}
                className="rounded-xl bg-white p-2"
              />
            ) : qrFailed ? (
              <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-sm text-amber-200">
                {t('qrFailed')}
              </p>
            ) : (
              <div className="skeleton h-[220px] w-[220px]" role="status" aria-label={t('qrLoading')} />
            )}
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
              {t('manualKey')}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <code className="flex-1 break-all rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-xs tracking-wider text-slate-200">
                {setup.secret.match(/.{1,4}/g)?.join(' ')}
              </code>
              <button
                type="button"
                onClick={copyKey}
                className="btn-primary shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider"
              >
                {copied ? `✓ ${t('copied')}` : t('copyKey')}
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-500">{t('keyPrivate')}</p>
          </div>

          <ol start={3} className="list-decimal pl-5 text-sm text-slate-300">
            <li>{t('step3')}</li>
          </ol>

          {codeFields}
        </form>
      )}

      {mode === 'disable' && (
        <form onSubmit={confirm} className="mt-4 space-y-4" noValidate>
          <p className="text-sm text-slate-300">{t('disableBody')}</p>
          {codeFields}
        </form>
      )}

      <p className="mt-4 text-xs text-slate-500">{t('lostPhone')}</p>
    </section>
  );
}
