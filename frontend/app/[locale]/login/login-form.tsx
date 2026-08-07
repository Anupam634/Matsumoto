'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { login, register, ApiError } from '../../../lib/api';

type Mode = 'login' | 'register';

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
  const [referralCode, setReferralCode] = useState(search.get('ref') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await register({ email, password, referralCode });
        if (res.referralRejected) {
          // Account exists, but the invite wasn't credited — say so plainly.
          alert(t('referralRejected'));
        }
      } else {
        await login({ email, password });
      }
      router.push(`/${params.locale}/dashboard`);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : t('networkError'),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glow-field flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <Link
          href={`/${params.locale}`}
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-indigo-400"
        >
          ← {t('backHome')}
        </Link>

        <div className="card p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <span className="logo-badge">M</span>
            <h1 className="text-xl font-bold">
              {mode === 'login' ? t('signIn') : t('createAccount')}
            </h1>
          </div>

          <div className="tab-switch mb-6 grid w-full grid-cols-2">
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

          <form onSubmit={submit} className="space-y-4">
            <Field
              label={t('email')}
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label={t('password')}
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
            />
            {mode === 'register' && (
              <Field
                label={t('referralCode')}
                type="text"
                value={referralCode}
                onChange={setReferralCode}
                optional
              />
            )}

            {mode === 'register' && (
              <p className="text-xs text-slate-400">{t('passwordHint')}</p>
            )}

            {error && (
              <p className="rounded-lg border border-red-900/50 bg-red-950/60 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? t('working') : mode === 'login' ? t('signIn') : t('signUp')}
            </button>
          </form>
        </div>

        <button
          onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
          className="mt-6 w-full text-center text-sm text-indigo-400 underline-offset-4 hover:underline"
        >
          {mode === 'login' ? t('noAccount') : t('haveAccount')}
        </button>
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
  optional,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  optional?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <input
        className="input-field mt-1"
        type={type}
        value={value}
        required={!optional}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
