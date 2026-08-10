'use client';

import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Coin3D } from '../../../components/Coin3D';
import { login, register, getToken, ApiError } from '../../../lib/api';
import { CountrySelect } from '../../../components/CountrySelect';

type Mode = 'login' | 'register';

/** Quick stats reused from the landing page — same numbers, no new copy. */
const STAT_KEYS = ['baseRate', 'conversion', 'minWithdrawal', 'boosterDuration'] as const;
const STAT_VALUES: Record<(typeof STAT_KEYS)[number], string> = {
  baseRate: '0.9 /h',
  conversion: '3 : 1',
  minWithdrawal: '100',
  boosterDuration: '30d',
};

// useSearchParams() needs a Suspense boundary for this route to prerender.
export default function LoginForm() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}

function AuthForm() {
  const t = useTranslations('auth');
  const tLanding = useTranslations('landing');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const search = useSearchParams();

  // A referral link (/en/login?ref=CODE) pre-fills the invite field, and the
  // landing page's "Get started" CTA links here with ?mode=register.
  const [mode, setMode] = useState<Mode>(
    search.get('ref') || search.get('mode') === 'register'
      ? 'register'
      : 'login',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [referralCode, setReferralCode] = useState(search.get('ref') ?? '');
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Already signed in? Don't sit on a sign-up form — go straight through.
  // A ?ref= link is the exception: it is meant to onboard someone new, so
  // it still shows the form rather than bouncing the current session away.
  useEffect(() => {
    if (getToken() && !search.get('ref')) {
      router.replace(`/${params.locale}/dashboard`);
    }
  }, [router, params.locale, search]);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // The form sets noValidate so errors render in our own styling, which
    // also means `required` on the country select is not enforced by the
    // browser — check it here rather than letting a blank country through.
    if (mode === 'register' && !countryCode) {
      setError(t('countryRequired'));
      return;
    }

    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await register({
          email,
          password,
          referralCode,
          countryCode,
        });
        if (res.referralRejected) {
          // Account exists, but the invite wasn't credited — say so plainly.
          alert(t('referralRejected'));
        }
      } else {
        await login({ email, password });
      }
      router.push(`/${params.locale}/dashboard`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('networkError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-900 lg:flex-row">
      {/* ───────────────── Brand panel — desktop only ───────────────── */}
      <aside className="glow-field-light relative hidden w-full flex-col justify-between overflow-hidden px-10 py-10 lg:flex lg:w-[46%] xl:w-1/2">
        <Link
          href={`/${params.locale}`}
          className="inline-flex items-center gap-2 font-bold text-slate-900"
        >
          <Image
            src="/logo.svg"
            alt="Matsumoto"
            width={40}
            height={40}
            className="rounded-lg"
            priority
          />
          Matsumoto
        </Link>

        <div className="max-w-md">
          <h2 className="text-3xl font-extrabold leading-[1.1] tracking-tight">
            {tLanding('hero.title')}{' '}
            <span className="text-gradient-brand">{tLanding('hero.titleAccent')}</span>
          </h2>
          <p className="mt-4 text-slate-600">{tLanding('hero.subtitle')}</p>

          <div className="mt-8 grid grid-cols-2 gap-3">
            {STAT_KEYS.map((key) => (
              <div key={key} className="card-soft p-4">
                <div className="text-lg font-extrabold text-indigo-600">
                  {STAT_VALUES[key]}
                </div>
                <div className="mt-0.5 text-xs uppercase tracking-wide text-slate-500">
                  {tLanding(`figures.${key}`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-xs">
          <Coin3D />
        </div>
      </aside>

      {/* ───────────────────────── Form panel ───────────────────────── */}
      <main
        className="flex flex-1 flex-col px-5 pb-8 pt-6 sm:px-10 sm:pt-8 lg:justify-center lg:px-16 lg:py-10 xl:px-24"
        style={{
          paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="mb-8 flex items-center justify-between lg:mb-10">
          <Link
            href={`/${params.locale}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            ← {t('backHome')}
          </Link>
          <span className="logo-badge lg:hidden" aria-hidden>
            M
          </span>
        </div>

        <div className="mx-auto w-full max-w-sm lg:mx-0">
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {mode === 'login' ? t('signIn') : t('createAccount')}
          </h1>

          <div className="tab-switch mt-6 grid w-full grid-cols-2">
            <button
              type="button"
              data-active={mode === 'login'}
              onClick={() => switchMode('login')}
            >
              {t('signIn')}
            </button>
            <button
              type="button"
              data-active={mode === 'register'}
              onClick={() => switchMode('register')}
            >
              {t('signUp')}
            </button>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <Field
              label={t('email')}
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              inputMode="email"
              enterKeyHint="next"
              icon={<IconMail />}
            />
            <Field
              label={t('password')}
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              enterKeyHint={mode === 'register' ? 'next' : 'done'}
              icon={<IconLock />}
              endAdornment={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  className="text-slate-400 transition hover:text-indigo-600"
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
              }
            />
            {mode === 'register' && (
              <CountrySelect
                id="signup-country"
                locale={params.locale}
                value={countryCode}
                onChange={setCountryCode}
                label={t('country')}
                placeholder={t('countryPlaceholder')}
                required
              />
            )}
            {mode === 'register' && (
              <Field
                label={t('referralCode')}
                type="text"
                value={referralCode}
                onChange={setReferralCode}
                enterKeyHint="done"
                icon={<IconTicket />}
                optional
              />
            )}

            {mode === 'register' && (
              <p className="text-xs text-slate-500">{t('passwordHint')}</p>
            )}

            {error && (
              <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <span aria-hidden>⚠</span>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary w-full py-3.5 text-base"
            >
              {busy && <IconSpinner />}
              {busy ? t('working') : mode === 'login' ? t('signIn') : t('signUp')}
            </button>
          </form>
        </div>

        <p className="mx-auto mt-10 max-w-sm text-center text-xs text-slate-400 lg:hidden">
          {tLanding('hero.honesty')}
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  inputMode,
  enterKeyHint,
  icon,
  endAdornment,
  optional,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  enterKeyHint?: React.HTMLAttributes<HTMLInputElement>['enterKeyHint'];
  icon: React.ReactNode;
  endAdornment?: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon}
        </span>
        <input
          className={`input-field pl-11 ${endAdornment ? 'pr-11' : ''}`}
          type={type}
          value={value}
          required={!optional}
          autoComplete={autoComplete}
          inputMode={inputMode}
          enterKeyHint={enterKeyHint}
          autoCapitalize={type === 'email' ? 'none' : undefined}
          autoCorrect={type === 'email' ? 'off' : undefined}
          spellCheck={type === 'email' ? false : undefined}
          onChange={(e) => onChange(e.target.value)}
        />
        {endAdornment && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2">
            {endAdornment}
          </span>
        )}
      </div>
    </label>
  );
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path d="m3.5 7 8.5 6 8.5-6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconLock() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M8 10.5V7.5a4 4 0 0 1 8 0v3"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path d="M10 7v10" stroke="currentColor" strokeWidth="1.7" strokeDasharray="1.6 2" strokeLinecap="round" />
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function IconEyeOff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 3l18 18M10.6 10.7a3 3 0 0 0 4.2 4.2M6.6 6.8C4 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.3-.5 4.6-1.2M9.9 5.2C10.6 5.1 11.3 5 12 5c6.5 0 10 7 10 7-.5.9-1.2 1.9-2.1 2.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
