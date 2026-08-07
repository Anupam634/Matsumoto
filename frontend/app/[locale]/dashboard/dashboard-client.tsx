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

  if (!status || !profile) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <p className="text-slate-400">{error ?? t('loading')}</p>
      </main>
    );
  }

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${params.locale}/login?ref=${profile.referralCode}`
      : '';

  return (
    <main className="mx-auto max-w-4xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <button onClick={signOut} className="text-sm text-slate-400 underline">
          {t('signOut')}
        </button>
      </header>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label={t('hashRate')} value={`${status.ratePerHour} /h`} />
        <Stat label={t('pending')} value={status.pendingPoints.toFixed(2)} />
        <Stat label={t('balance')} value={profile.pointsBalance.toFixed(2)} />
        <Stat
          label={t('referralTier')}
          value={`L${status.referralTier.level} ×${status.referralTier.multiplier}`}
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <Stat label={t('boosters')} value={String(status.activeBoosters)} />
        <Stat label={t('referrals')} value={String(profile.referralCount)} />
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-950 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        onClick={mine}
        disabled={!status.canClaim || claiming}
        className="mt-8 w-full rounded-xl bg-amber-500 py-4 text-lg font-semibold text-slate-900 disabled:opacity-40"
      >
        {t('mineButton')}
      </button>

      <section className="mt-8 rounded-xl bg-slate-900 p-4">
        <div className="text-xs uppercase text-slate-400">
          {t('referralLink')}
        </div>
        <code className="mt-1 block break-all text-sm text-amber-400">
          {referralLink}
        </code>
        {profile.kycStatus !== 'APPROVED' && (
          <p className="mt-3 text-xs text-slate-400">
            {t('kycRequired', { status: profile.kycStatus })}
          </p>
        )}
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-900 p-4">
      <div className="text-xs uppercase text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-amber-400">{value}</div>
    </div>
  );
}
