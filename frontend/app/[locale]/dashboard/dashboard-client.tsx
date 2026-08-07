'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  claimMining,
  getMiningStatus,
  getProfile,
  getToken,
  logout,
  type MiningStatus,
  type Profile,
} from '../../../lib/api';

export default function DashboardClient() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);

  /** Session ended or was rejected — back to the sign-in form. */
  const toLogin = useCallback(() => {
    logout();
    router.replace(`/${params.locale}/login`);
  }, [router, params.locale]);

  /** Deliberate sign-out — back to the public landing page. */
  const signOut = useCallback(() => {
    logout();
    router.replace(`/${params.locale}`);
  }, [router, params.locale]);

  const load = useCallback(async () => {
    try {
      const [s, p] = await Promise.all([getMiningStatus(), getProfile()]);
      setStatus(s);
      setProfile(p);
      setError(null);
    } catch (err) {
      // 401/403 means the session is gone or the account was blocked.
      if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
        toLogin();
        return;
      }
      setError(err instanceof ApiError ? err.message : t('offline'));
    }
  }, [toLogin, t]);

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/${params.locale}/login`);
      return;
    }
    load();
  }, [load, router, params.locale]);

  async function mine() {
    setClaiming(true);
    try {
      await claimMining();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setClaiming(false);
    }
  }

  const referralLink =
    typeof window !== 'undefined' && profile
      ? `${window.location.origin}/${params.locale}/login?ref=${profile.referralCode}`
      : '';

  async function copyReferral() {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard permission denied — the link is still selectable text */
    }
  }

  if (!status || !profile) {
    return (
      <div className="glow-field flex min-h-screen items-center justify-center">
        <div className="card p-6 text-slate-400">{error ?? t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="glow-field min-h-screen">
      <main className="mx-auto max-w-4xl px-5 py-8">
        <header className="mb-8 flex items-center justify-between">
          <span className="flex items-center gap-2 font-bold">
            <span className="logo-badge">M</span>
            {t('title')}
          </span>
          <button onClick={signOut} className="btn-secondary text-sm">
            {t('signOut')}
          </button>
        </header>

        {error && (
          <p className="mb-6 rounded-lg border border-red-900/50 bg-red-950/60 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* ─────────────────── Mining hero ─────────────────── */}
        <section className="card p-6 sm:p-8">
          <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {t('hashRate')}
              </div>
              <div className="mt-1 flex items-baseline justify-center gap-2 sm:justify-start">
                <span className="text-4xl font-extrabold text-indigo-400">
                  {status.ratePerHour}
                </span>
                <span className="text-sm text-slate-400">/h</span>
              </div>
              <div className="mt-3 text-sm text-slate-400">
                {t('pending')}:{' '}
                <span className="font-semibold text-slate-200">
                  {status.pendingPoints.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={mine}
              disabled={!status.canClaim || claiming}
              className="btn-primary pulse-ring w-full px-10 py-4 text-lg sm:w-auto"
            >
              {t('mineButton')}
            </button>
          </div>
        </section>

        {/* ─────────────────────── Stats ───────────────────── */}
        <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat
            icon={<IconBolt />}
            accent="indigo"
            label={t('balance')}
            value={profile.pointsBalance.toFixed(2)}
          />
          <Stat
            icon={<IconTier />}
            accent="sky"
            label={t('referralTier')}
            value={`L${status.referralTier.level} ×${status.referralTier.multiplier}`}
          />
          <Stat
            icon={<IconRocket />}
            accent="indigo"
            label={t('boosters')}
            value={String(status.activeBoosters)}
          />
          <Stat
            icon={<IconUsers />}
            accent="sky"
            label={t('referrals')}
            value={String(profile.referralCount)}
          />
        </div>

        {/* ────────────────────── Referral card ────────────── */}
        <section className="card mt-6 p-5">
          <div className="text-xs uppercase tracking-wide text-slate-400">
            {t('referralLink')}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 break-all rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-indigo-400">
              {referralLink}
            </code>
            <button onClick={copyReferral} className="btn-secondary shrink-0 text-sm">
              {copied ? '✓' : t('referralLink')}
            </button>
          </div>
          {profile.kycStatus !== 'APPROVED' && (
            <p className="mt-3 text-xs text-slate-400">
              {t('kycRequired', { status: profile.kycStatus })}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon,
  accent,
  label,
  value,
}: {
  icon: React.ReactNode;
  accent: 'indigo' | 'sky';
  label: string;
  value: string;
}) {
  const accentClasses =
    accent === 'indigo'
      ? 'bg-indigo-500/15 text-indigo-400'
      : 'bg-sky-500/15 text-sky-400';
  return (
    <div className="card card-lift p-4">
      <div className={`grid h-9 w-9 place-items-center rounded-full ${accentClasses}`}>
        {icon}
      </div>
      <div className="mt-3 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

function IconBolt() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" fill="currentColor" />
    </svg>
  );
}

function IconTier() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2 2 8l10 6 10-6-10-6Zm0 10-10-6v2l10 6 10-6V6l-10 6Zm0 4-10-6v2l10 6 10-6v-2l-10 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconRocket() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c3 2 5 6 5 10 0 1.5-.3 2.9-.8 4l-2.2-1c.5-1 .8-2 .8-3 0-3-1.5-6-2.8-7.5C10.7 5.9 9 8.7 9 12c0 1 .3 2 .8 3l-2.2 1c-.5-1.1-.8-2.5-.8-4 0-4 2-8 5-10Zm-3 15 1.5 3H8l-1-2 2-1Zm6 0 2 1-1 2h-2.5l1.5-3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Zm7.5-3.5A3.5 3.5 0 1 0 16.5 3a3.5 3.5 0 0 0 0 7Zm.6 2.1c1.2.6 2.9 2 2.9 3.9v3H23v-3c0-2.7-2.5-3.5-5.9-3.9Z"
        fill="currentColor"
      />
    </svg>
  );
}
