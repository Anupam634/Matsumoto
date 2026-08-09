'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
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

/** How often the live accrual counter repaints. 10fps reads as smooth. */
const TICK_MS = 100;
/** Background refresh so the server stays the source of truth. */
const REFRESH_MS = 60_000;

export default function DashboardClient() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);

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

  // Re-sync with the server periodically — the local ticker only interpolates.
  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function mine() {
    setClaiming(true);
    try {
      const res = await claimMining();
      setCelebrate(res.earnedPoints);
      setTimeout(() => setCelebrate(null), 1700);
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
    return <DashboardSkeleton message={error} />;
  }

  return (
    <div className="glow-field-light min-h-dvh text-slate-900">
      <Header onSignOut={signOut} locale={params.locale} title={t('title')} />

      <main
        className="mx-auto max-w-5xl px-4 pb-16 pt-6 sm:px-6"
        style={{ paddingBottom: 'max(4rem, env(safe-area-inset-bottom))' }}
      >
        {error && (
          <p className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            <span aria-hidden>⚠</span>
            {error}
          </p>
        )}

        <MiningCard
          status={status}
          claiming={claiming}
          celebrate={celebrate}
          onMine={mine}
        />

        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            i={0}
            icon={<IconBolt />}
            label={t('balance')}
            value={profile.pointsBalance}
            decimals={2}
          />
          <Stat
            i={1}
            icon={<IconTier />}
            label={t('referralTier')}
            text={`L${status.referralTier.level}`}
            badge={`×${status.referralTier.multiplier}`}
          />
          <Stat
            i={2}
            icon={<IconRocket />}
            label={t('boosters')}
            value={status.activeBoosters}
          />
          <Stat
            i={3}
            icon={<IconUsers />}
            label={t('referrals')}
            value={profile.referralCount}
          />
        </div>

        <section
          className="card-soft rise-in mt-4 p-5"
          style={{ '--i': 4 } as React.CSSProperties}
        >
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {t('referralLink')}
          </div>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <code className="flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-indigo-600">
              {referralLink}
            </code>
            <button
              onClick={copyReferral}
              className="btn-outline-brand shrink-0 py-2.5 text-sm"
            >
              {copied ? `✓ ${t('copied')}` : t('copy')}
            </button>
          </div>
          {profile.kycStatus !== 'APPROVED' && (
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
              <span aria-hidden>ⓘ</span>
              {t('kycRequired', { status: profile.kycStatus })}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}

/* ─────────────────────────── Mining hero ─────────────────────────── */

function MiningCard({
  status,
  claiming,
  celebrate,
  onMine,
}: {
  status: MiningStatus;
  claiming: boolean;
  celebrate: number | null;
  onMine: () => void;
}) {
  const t = useTranslations('dashboard');
  const pending = useLiveAccrual(status);
  const countdown = useCountdown(status.nextClaimAt);

  const progress =
    status.maxPendingPoints > 0
      ? Math.min(1, pending / status.maxPendingPoints)
      : 0;
  const ready = status.canClaim && !claiming;

  return (
    <section
      className="card-soft sheen rise-in relative overflow-hidden p-6 sm:p-8"
      style={{ '--i': 0 } as React.CSSProperties}
    >
      <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
        {/* Live accrual read-out */}
        <div className="text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            {ready ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                ✓ {t('ready')}
              </span>
            ) : (
              <>
                <span className="live-dot" aria-hidden />
                <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t('accruing')}
                </span>
              </>
            )}
          </div>

          <div className="mt-3 flex items-baseline justify-center gap-2 sm:justify-start">
            <span className="text-gradient-brand text-5xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
              {pending.toFixed(4)}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-500">{t('pending')}</div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
              <IconBolt className="h-3.5 w-3.5" />
              {status.ratePerHour} /h
            </span>
            {!status.canClaim && countdown && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600">
                <IconClock className="h-3.5 w-3.5" />
                <span className="tabular-nums">{countdown}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ring + Mine button. Both live in the same grid cell so the button
            is centred by `place-items-center` rather than a transform —
            transforms get reset on :disabled and would knock it off-centre. */}
        <div className="relative grid shrink-0 place-items-center">
          <div className="col-start-1 row-start-1">
            <ProgressRing progress={progress} />
          </div>

          {celebrate !== null && <Burst />}
          {celebrate !== null && (
            <span className="float-up absolute left-1/2 top-0 z-10 whitespace-nowrap text-xl font-extrabold text-emerald-500">
              +{celebrate.toFixed(2)}
            </span>
          )}

          <button
            onClick={onMine}
            disabled={!status.canClaim || claiming}
            className={`btn-primary col-start-1 row-start-1 h-[8.5rem] w-[8.5rem] flex-col !rounded-full text-lg ${
              ready ? 'pulse-ring' : ''
            }`}
          >
            {claiming ? (
              <IconSpinner />
            ) : (
              <>
                <IconPick />
                <span>{t('mineButton')}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

/** SVG donut showing how full the 24h accrual window is. */
function ProgressRing({ progress }: { progress: number }) {
  const R = 76;
  const C = 2 * Math.PI * R;
  return (
    <svg width="180" height="180" viewBox="0 0 180 180" aria-hidden>
      <defs>
        <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <circle
        className="ring-track"
        cx="90"
        cy="90"
        r={R}
        fill="none"
        strokeWidth="8"
      />
      <circle
        className="ring-progress"
        cx="90"
        cy="90"
        r={R}
        fill="none"
        strokeWidth="8"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - progress)}
        transform="rotate(-90 90 90)"
      />
    </svg>
  );
}

/** Radial confetti fired once when a claim lands. */
function Burst() {
  const colors = ['#6366f1', '#7c3aed', '#2563eb', '#22c55e', '#f59e0b'];
  return (
    <div className="pointer-events-none absolute inset-0 z-10" aria-hidden>
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="burst-particle"
          style={
            {
              '--a': `${(360 / 14) * i}deg`,
              background: colors[i % colors.length],
              animationDelay: `${i * 12}ms`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ─────────────────────────── Stat cards ──────────────────────────── */

function Stat({
  i,
  icon,
  label,
  value,
  text,
  badge,
  decimals = 0,
}: {
  i: number;
  icon: React.ReactNode;
  label: string;
  value?: number;
  text?: string;
  badge?: string;
  decimals?: number;
}) {
  const animated = useCountUp(value ?? 0);
  return (
    <div
      className="card-soft card-soft-lift rise-in p-4"
      style={{ '--i': i + 1 } as React.CSSProperties}
    >
      <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-indigo-600">
        {icon}
      </div>
      <div className="mt-3 truncate text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-bold tabular-nums">
          {text ?? animated.toFixed(decimals)}
        </span>
        {badge && (
          <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-xs font-bold text-violet-600">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Chrome ────────────────────────────── */

function Header({
  onSignOut,
  locale,
  title,
}: {
  onSignOut: () => void;
  locale: string;
  title: string;
}) {
  const t = useTranslations('dashboard');
  return (
    <header
      className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/80 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2 font-bold">
          <span className="logo-badge">M</span>
          <span className="truncate">{title}</span>
        </Link>
        <button
          onClick={onSignOut}
          className="btn-outline-brand shrink-0 px-4 py-2 text-sm"
        >
          {t('signOut')}
        </button>
      </div>
    </header>
  );
}

function DashboardSkeleton({ message }: { message: string | null }) {
  return (
    <div className="glow-field-light min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="skeleton h-9 w-40" />
          <div className="skeleton h-9 w-24 !rounded-full" />
        </div>
        <div className="card-soft flex flex-col items-center gap-8 p-8 sm:flex-row sm:justify-between">
          <div className="w-full max-w-xs space-y-3">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-12 w-full" />
            <div className="skeleton h-8 w-32 !rounded-full" />
          </div>
          <div className="skeleton h-[9rem] w-[9rem] shrink-0 !rounded-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card-soft space-y-3 p-4">
              <div className="skeleton h-9 w-9 !rounded-full" />
              <div className="skeleton h-3 w-16" />
              <div className="skeleton h-6 w-20" />
            </div>
          ))}
        </div>
        {message && (
          <p className="mt-6 text-center text-sm text-slate-500">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── Hooks ─────────────────────────────── */

/**
 * Interpolates pending points between server polls, so the counter visibly
 * ticks up instead of sitting still for a minute. Clamped to the same 24h
 * ceiling the backend enforces, so it never overstates what a tap will pay.
 */
function useLiveAccrual(status: MiningStatus): number {
  const [pending, setPending] = useState(status.pendingPoints);
  // Re-anchor whenever a fresh reading lands.
  const anchor = useRef({ at: 0, base: status.pendingPoints });

  useEffect(() => {
    anchor.current = { at: Date.now(), base: status.pendingPoints };
    setPending(status.pendingPoints);
  }, [status.pendingPoints]);

  useEffect(() => {
    const perMs = status.ratePerHour / 3_600_000;
    const cap = status.maxPendingPoints;
    const id = setInterval(() => {
      const { at, base } = anchor.current;
      setPending(Math.min(cap, base + (Date.now() - at) * perMs));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [status.ratePerHour, status.maxPendingPoints]);

  return pending;
}

/** Eased count-up so stat values roll rather than snap when they change. */
function useCountUp(target: number, duration = 900): number {
  const [display, setDisplay] = useState(target);
  const from = useRef(target);

  useEffect(() => {
    const start = performance.now();
    const origin = from.current;
    if (origin === target) return;

    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(origin + (target - origin) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
      else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return display;
}

/** "05h 12m 44s" until the cooldown lifts, or null once it has. */
function useCountdown(iso: string | null): string | null {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!iso) {
      setLabel(null);
      return;
    }
    const target = new Date(iso).getTime();
    const render = () => {
      const ms = target - Date.now();
      if (ms <= 0) {
        setLabel(null);
        return;
      }
      const s = Math.floor(ms / 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      setLabel(
        `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`,
      );
    };
    render();
    const id = setInterval(render, 1000);
    return () => clearInterval(id);
  }, [iso]);

  return label;
}

/* ───────────────────────────── Icons ─────────────────────────────── */

function IconBolt({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}

function IconTier({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2 2 8l10 6 10-6-10-6Zm0 10-10-6v2l10 6 10-6V6l-10 6Zm0 4-10-6v2l10 6 10-6v-2l-10 6Z" />
    </svg>
  );
}

function IconRocket({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c3 2 5 6 5 10 0 1.5-.3 2.9-.8 4l-2.2-1c.5-1 .8-2 .8-3 0-3-1.5-6-2.8-7.5C10.7 5.9 9 8.7 9 12c0 1 .3 2 .8 3l-2.2 1c-.5-1.1-.8-2.5-.8-4 0-4 2-8 5-10Zm-3 15 1.5 3H8l-1-2 2-1Zm6 0 2 1-1 2h-2.5l1.5-3Z" />
    </svg>
  );
}

function IconUsers({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Zm7.5-3.5A3.5 3.5 0 1 0 16.5 3a3.5 3.5 0 0 0 0 7Zm.6 2.1c1.2.6 2.9 2 2.9 3.9v3H23v-3c0-2.7-2.5-3.5-5.9-3.9Z" />
    </svg>
  );
}

function IconClock({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPick() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M14.5 3c2.5.4 5 2 6.5 4.2-1.6-.5-3-.4-4.3.2M9.5 3C7 3.4 4.5 5 3 7.2c1.6-.5 3-.4 4.3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="m12 6 1.6 1.6L7.4 20.4a1.1 1.1 0 0 1-1.9-1L12 6Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconSpinner() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
