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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Link
        href={`/${params.locale}`}
        className="mb-8 text-sm text-slate-400 hover:text-amber-400"
      >
        ← {t('backHome')}
      </Link>

      <h1 className="mb-6 text-2xl font-bold">
        {mode === 'login' ? t('signIn') : t('createAccount')}
      </h1>

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
          <p className="rounded-lg bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 disabled:opacity-40"
        >
          {busy ? t('working') : mode === 'login' ? t('signIn') : t('signUp')}
        </button>
      </form>

      <button
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
        className="mt-6 text-sm text-amber-400 underline"
      >
        {mode === 'login' ? t('noAccount') : t('haveAccount')}
      </button>
    </main>
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
      <span className="text-xs uppercase text-slate-400">{label}</span>
      <input
        className="mt-1 w-full rounded-lg bg-slate-900 p-3 outline-none ring-amber-500 focus:ring-2"
        type={type}
        value={value}
        required={!optional}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
