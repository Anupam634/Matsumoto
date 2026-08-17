'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  getProfile,
  getToken,
  logout,
  WITHDRAWAL_MIN_POINTS,
  type Profile,
} from '../../../lib/api';
import { AppHeader } from '../../../components/AppHeader';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { BnbLogo } from '../../../components/BnbLogo';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { countryFlag, countryName } from '../../../lib/countries';
import { locales } from '../../../i18n';

/** 3 points = 1 $BONDKOIN BEP-20. */
const POINTS_PER_TOKEN = 3;

const LANGUAGE_LABELS: Record<string, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇬🇧' },
  zh: { label: '简体中文', flag: '🇨🇳' },
  ko: { label: '한국어', flag: '🇰🇷' },
};

export default function ProfileClient() {
  const t = useTranslations('profile');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setProfile(await getProfile());
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
        className="mx-auto max-w-3xl px-4 pb-24 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(6rem, env(safe-area-inset-bottom))' }}
      >
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-slate-400">{t('subtitle')}</p>
        </div>

        {error && (
          <p className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {!profile ? (
          <div className="panel mt-6 space-y-4 p-6">
            <div className="skeleton h-6 w-36" />
            <div className="skeleton h-28 w-full" />
            <div className="skeleton h-24 w-full" />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <BalanceCard profile={profile} locale={locale} />
            <PreferencesCard locale={locale} />
            <AccountCard profile={profile} locale={locale} />
            <IdentityCard profile={profile} locale={locale} />
            <ReferralCard profile={profile} locale={locale} />
            <HelpCard locale={locale} />

            <button
              onClick={() => {
                logout();
                router.replace(`/${locale}/login`);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3.5 text-sm font-bold text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
            >
              <span>🚪</span>
              <span>{t('signOut')}</span>
            </button>
          </div>
        )}
      </main>

      <MobileTabBar locale={locale} />
    </div>
  );
}

/* ──────────────────────────── Balance ───────────────────────────── */

function BalanceCard({ profile, locale }: { profile: Profile; locale: string }) {
  const t = useTranslations('profile');
  const canWithdraw =
    profile.kycStatus === 'APPROVED' &&
    profile.pointsBalance >= WITHDRAWAL_MIN_POINTS;

  return (
    <section className="glass-panel p-5 sm:p-7">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('balance')}
        </div>
        <span className="chain-indicator">
          <BnbLogo className="h-3 w-3" />
          {t('chainName')}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
          {profile.pointsBalance.toFixed(2)}
        </span>
        <span className="text-sm font-bold text-blue-400">
          {t('pointsShort')}
        </span>
      </div>

      <div className="mt-1 text-sm text-slate-400">
        ≈ <strong className="font-mono text-cyan-400">{(profile.pointsBalance / POINTS_PER_TOKEN).toFixed(4)}</strong> $BONDKOIN
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link
          href={`/${locale}/withdraw`}
          className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 text-center text-sm font-black uppercase tracking-wider text-white shadow-lg"
        >
          <span>💸</span>
          <span>{t('withdrawCta')}</span>
        </Link>
        <Link
          href={`/${locale}/boosters`}
          className="btn-secondary flex w-full items-center justify-center gap-2 py-3.5 text-center text-sm font-bold text-slate-200"
        >
          <span>🚀</span>
          <span>Booster Hub</span>
        </Link>
      </div>

      {!canWithdraw && (
        <p className="mt-3 text-center text-xs text-slate-400">
          {profile.kycStatus !== 'APPROVED'
            ? t('withdrawNeedsKyc')
            : t('withdrawNeedsBalance', { min: WITHDRAWAL_MIN_POINTS })}
        </p>
      )}
    </section>
  );
}

/* ──────────────────────────── Preferences & Language ───────────────────────────── */

function PreferencesCard({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    if (next === locale) return;
    const rest = pathname.split('/').slice(2).join('/');
    const search = typeof window === 'undefined' ? '' : window.location.search;
    router.replace(`/${next}${rest ? `/${rest}` : ''}${search}`);
  }

  return (
    <section className="glass-panel p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            🌐 Language & Display Interface
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Choose your preferred portal language and visual display mode
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        {locales.map((l) => {
          const item = LANGUAGE_LABELS[l] || { label: l.toUpperCase(), flag: '🌐' };
          const isActive = locale === l;
          return (
            <button
              key={l}
              type="button"
              onClick={() => switchLocale(l)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-bold transition ${
                isActive
                  ? 'border-blue-500 bg-blue-600 text-white shadow-md shadow-blue-500/25'
                  : 'border-white/[0.08] bg-slate-900/60 text-slate-300 hover:border-white/20 hover:bg-slate-800'
              }`}
            >
              <span className="text-base">{item.flag}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ──────────────────────────── Account ───────────────────────────── */

function AccountCard({ profile, locale }: { profile: Profile; locale: string }) {
  const t = useTranslations('profile');
  return (
    <section className="glass-panel p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t('accountTitle')}
      </h2>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label={t('email')} value={profile.email ?? '—'} />
        <Field
          label={t('country')}
          value={
            profile.countryCode
              ? `${countryFlag(profile.countryCode)} ${countryName(profile.countryCode, locale)}`
              : '—'
          }
        />
        <Field
          label={t('memberSince')}
          value={new Date(profile.createdAt).toLocaleDateString()}
        />
        <Field label={t('userId')} value={profile.id} mono />
      </dl>
    </section>
  );
}

/* ──────────────────────────── Identity ──────────────────────────── */

function IdentityCard({ profile, locale }: { profile: Profile; locale: string }) {
  const t = useTranslations('profile');
  const tone =
    profile.kycStatus === 'APPROVED'
      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
      : profile.kycStatus === 'PENDING'
        ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
        : profile.kycStatus === 'REJECTED'
          ? 'border-red-500/30 bg-red-500/10 text-red-300'
          : 'border-white/10 bg-white/[0.03] text-slate-300';

  return (
    <section className="glass-panel p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t('identityTitle')}
      </h2>
      <div className={`mt-3 rounded-xl border p-3 text-sm font-medium ${tone}`}>
        {t(`kycStatus.${profile.kycStatus}`)}
      </div>
      <Link
        href={`/${locale}/kyc`}
        className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 py-2.5 text-center text-sm font-bold"
      >
        <span>🪪</span>
        <span>{profile.kycStatus === 'APPROVED' ? t('viewKyc') : t('completeKyc')}</span>
      </Link>
    </section>
  );
}

/* ──────────────────────────── Referral ──────────────────────────── */

function ReferralCard({ profile, locale }: { profile: Profile; locale: string }) {
  const t = useTranslations('profile');
  const [copied, setCopied] = useState(false);
  const [link, setLink] = useState('');

  useEffect(() => {
    setLink(`${window.location.origin}/${locale}/login?ref=${profile.referralCode}`);
  }, [locale, profile.referralCode]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }

  return (
    <section className="glass-panel p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t('referralTitle')}
      </h2>

      <dl className="mt-3 grid grid-cols-3 gap-3">
        <Field label={t('referralCode')} value={profile.referralCode} mono />
        <Field label={t('invited')} value={String(profile.referralCount)} />
        <Field
          label={t('tier')}
          value={`L${profile.referralTier.level} ×${profile.referralTier.multiplier}`}
        />
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-xs text-slate-300">
          {link || '…'}
        </code>
        <button
          onClick={copy}
          className="btn-primary shrink-0 px-4 py-2 text-xs font-bold uppercase tracking-wider"
        >
          {copied ? '✓ Copied' : t('copy')}
        </button>
      </div>
    </section>
  );
}

/* ────────────────────────────── Help ────────────────────────────── */

function HelpCard({ locale }: { locale: string }) {
  const t = useTranslations('profile');
  return (
    <section className="glass-panel p-5 sm:p-6">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {t('helpTitle')}
      </h2>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Link
          href={`/${locale}/support`}
          className="btn-primary flex w-full items-center justify-center py-2.5 text-center text-sm font-bold"
        >
          {t('contactSupport')}
        </Link>
        <Link
          href={`/${locale}/faq`}
          className="btn-secondary flex w-full items-center justify-center py-2.5 text-center text-sm font-bold"
        >
          {t('readFaq')}
        </Link>
      </div>
      <div className="mt-3 flex justify-center gap-4 text-xs text-slate-500">
        <Link href={`/${locale}/terms`} className="transition hover:text-slate-300">
          {t('terms')}
        </Link>
        <Link href={`/${locale}/privacy`} className="transition hover:text-slate-300">
          {t('privacy')}
        </Link>
      </div>
    </section>
  );
}

/* ───────────────────────────── Shared ───────────────────────────── */

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500 font-bold">{label}</dt>
      <dd
        className={`mt-0.5 break-all font-medium text-slate-200 ${
          mono ? 'font-mono text-xs' : 'text-sm'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
