'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { login, register, getToken, ApiError } from '../../../lib/api';
import { CountrySelect } from '../../../components/CountrySelect';
import { LogoLockup, LogoMark } from '../../../components/Logo';
import { LocaleSwitcher } from '../../../components/LocaleSwitcher';
import { ThemeToggle } from '../../../components/ThemeToggle';

type Mode = 'login' | 'register';

const STAT_KEYS = ['baseRate', 'conversion', 'minWithdrawal', 'boosterDuration'] as const;
const STAT_VALUES: Record<(typeof STAT_KEYS)[number], string> = {
  baseRate: '0.90 /h',
  conversion: '3 : 1',
  minWithdrawal: '100 PTS',
  boosterDuration: '30 Days',
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
    <div className="glow-field min-h-dvh flex flex-col bg-cyber-grid bg-slate-950 text-slate-100 lg:flex-row">
      {/* ───────────────── Brand panel — desktop only ───────────────── */}
      <aside className="relative hidden w-full flex-col justify-between overflow-hidden border-r border-slate-850 bg-slate-950/80 px-10 py-10 lg:flex lg:w-[46%] xl:w-1/2 backdrop-blur-xl">
        {/* Subtle background glow spheres */}
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

        <Link href={`/${params.locale}`} className="inline-flex items-center gap-3">
          <LogoLockup width={220} priority />
        </Link>

        <div className="max-w-md space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
            <span className="pulse-dot h-2 w-2 rounded-full bg-emerald-400" />
            <span>BNB Chain Cloud Mining Node</span>
          </div>

          <h2 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {tLanding('hero.title')}{' '}
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              {tLanding('hero.titleAccent')}
            </span>
          </h2>

          <p className="text-sm leading-relaxed text-slate-300">
            {tLanding('hero.subtitle')}
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {STAT_KEYS.map((key) => (
              <div key={key} className="card card-lift p-4 border-slate-800 bg-slate-900/70 backdrop-blur-sm">
                <div className="font-mono text-xl font-extrabold text-amber-400">
                  {STAT_VALUES[key]}
                </div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {tLanding(`figures.${key}`)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-800/80 pt-4 text-xs text-slate-500">
          {tLanding('footer.copyright')}
        </div>
      </aside>

      {/* ───────────────────────── Form panel ───────────────────────── */}
      <div className="flex flex-1 flex-col min-h-dvh">
        {/* Pinned Top Navigation Bar */}
        <header className="sticky top-0 z-20 w-full flex items-center justify-between border-b border-white/[0.06] bg-slate-950/70 px-5 py-4 backdrop-blur-xl sm:px-10 lg:px-16 xl:px-24">
          <Link
            href={`/${params.locale}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-amber-400"
          >
            ← {t('backHome')}
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LocaleSwitcher locale={params.locale} />
            <span className="lg:hidden">
              <LogoMark size={32} priority />
            </span>
          </div>
        </header>

        {/* Centered Form Body */}
        <main
          className="flex flex-1 items-center justify-center px-5 py-8 sm:px-10 lg:px-16 xl:px-24"
          style={{
            paddingBottom: 'max(2rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="mx-auto w-full max-w-md">
            <div className="card border-slate-800/90 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-slate-100">
                {mode === 'login' ? t('signIn') : t('createAccount')}
              </h1>
              <p className="mt-1.5 text-xs text-slate-400">
                {mode === 'login'
                  ? 'Access your cloud mining terminal & daily yield.'
                  : 'Start earning Matsumoto Points with zero hardware cost.'}
              </p>

            {/* Mode Switch Tabs */}
            <div className="mt-6 grid w-full grid-cols-2 rounded-xl border border-slate-800 bg-slate-950/80 p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  mode === 'login'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t('signIn')}
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`rounded-lg py-2.5 text-xs font-bold uppercase tracking-wider transition-all ${
                  mode === 'register'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
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
                    className="text-slate-500 transition hover:text-amber-400"
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
                <p className="text-[11px] text-slate-400">{t('passwordHint')}</p>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
                  <span className="text-red-400 font-bold" aria-hidden>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="btn-gold mt-2 w-full rounded-xl py-3.5 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <IconSpinner />
                    <span>{t('working')}</span>
                  </span>
                ) : (
                  <span>{mode === 'login' ? t('signIn') : t('signUp')} →</span>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="mx-auto mt-8 max-w-sm text-center text-[11px] text-slate-500 lg:hidden">
          {tLanding('hero.honesty')}
        </p>
      </main>
    </div>
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
      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {label}
        {optional && <span className="ml-1 text-slate-500 font-normal lowercase">(optional)</span>}
      </span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </span>
        <input
          className={`w-full rounded-xl border border-slate-800 bg-slate-950/80 py-3 pl-10 text-sm text-slate-100 placeholder-slate-600 outline-none transition-all focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 ${
            endAdornment ? 'pr-11' : 'pr-4'
          }`}
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
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">
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
