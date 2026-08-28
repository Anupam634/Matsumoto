'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ApiError,
  claimMining,
  getBoosters,
  getMiningHistory,
  getMiningStatus,
  getProfile,
  getToken,
  logout,
  type BoosterPlanDto,
  type LedgerEntryDto,
  type MiningHistory,
  type MiningStatus,
  type Profile,
} from '../../../lib/api';
import TasksSection from './tasks-section';
import { LogoMark } from '../../../components/Logo';
import { LocaleSwitcher } from '../../../components/LocaleSwitcher';
import { ThemeToggle } from '../../../components/ThemeToggle';
import { MobileTabBar } from '../../../components/MobileTabBar';
import { BnbBadge, BnbLogo } from '../../../components/BnbLogo';
import { useMiningFX } from '../../../lib/use-mining-fx';

/** How often the live accrual counter repaints. 10fps reads as smooth. */
const TICK_MS = 100;
/** Background refresh so the server stays the source of truth. */
const REFRESH_MS = 15_000;

export default function DashboardClient() {
  const t = useTranslations('dashboard');
  const router = useRouter();
  const params = useParams<{ locale: string }>();
  const locale = params.locale;
  const { playMiningStrike, playClaimReward } = useMiningFX();

  const [status, setStatus] = useState<MiningStatus | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [history, setHistory] = useState<MiningHistory | null>(null);
  const [plans, setPlans] = useState<BoosterPlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);

  const toLogin = useCallback(() => {
    logout();
    router.replace(`/${locale}/login`);
  }, [router, locale]);

  const load = useCallback(async () => {
    try {
      const [s, p, h] = await Promise.all([
        getMiningStatus(),
        getProfile(),
        getMiningHistory(),
      ]);
      setStatus(s);
      setProfile(p);
      setHistory(h);
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
      router.replace(`/${locale}/login`);
      return;
    }
    load();
    // The plan rail is catalogue data — fetched once, and a failure here
    // must not blank the dashboard.
    getBoosters()
      .then((b) => setPlans(b.plans))
      .catch(() => setPlans([]));
  }, [load, router, locale]);

  useEffect(() => {
    const id = setInterval(load, REFRESH_MS);
    return () => clearInterval(id);
  }, [load]);

  async function mine() {
    playMiningStrike();
    setClaiming(true);
    try {
      const res = await claimMining();
      playClaimReward();
      setCelebrate(res.earnedPoints);
      setTimeout(() => setCelebrate(null), 1700);

      // Optimistically update balance and mining status immediately for zero-lag UI
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              pointsBalance: prev.pointsBalance + res.earnedPoints,
            }
          : prev,
      );
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              pendingPoints: 0,
              canClaim: false,
              nextClaimAt: res.nextClaimAt,
            }
          : prev,
      );

      // Synchronize in the background
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('offline'));
    } finally {
      setClaiming(false);
    }
  }

  if (!status || !profile) return <Skeleton message={error} />;

  const ready = status.canClaim && !claiming;

  return (
    <div className="app-shell min-h-dvh">
      <TopBar locale={locale} onSignOut={toLogin} />

      <main
        className="mx-auto max-w-6xl px-4 pb-32 pt-5 sm:px-6 lg:pb-16"
        style={{ paddingBottom: 'max(8rem, env(safe-area-inset-bottom))' }}
      >
        {error && (
          <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Hero + mining console. Two columns from lg. */}
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <HeroPanel
            status={status}
            claiming={claiming}
            celebrate={celebrate}
            onMine={mine}
            ready={ready}
          />
          <BalancePanel
            profile={profile}
            history={history}
            status={status}
            locale={locale}
          />
        </div>

        {/* Stat grid */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatCard
            i={0}
            chip="#22c55e"
            icon={<IconCoins />}
            label={t('totalEarnings')}
            value={history?.lifetimeEarnedPoints ?? 0}
            decimals={2}
            spark
          />
          <StatCard
            i={1}
            chip="#818cf8"
            icon={<IconChip />}
            label={t('hashRate')}
            value={status.ratePerHour}
            decimals={2}
            suffix=" /h"
          />
          <StatCard
            i={2}
            chip="#a78bfa"
            icon={<IconDoc />}
            label={t('boosters')}
            value={status.activeBoosters}
            href={`/${locale}/boosters`}
            cta={t('buyBoosters')}
          />
          <StatCard
            i={3}
            chip="#38bdf8"
            icon={<IconUsers />}
            label={t('referrals')}
            value={profile.referralCount}
            badge={`L${status.referralTier.level} ×${status.referralTier.multiplier}`}
            href={`/${locale}/referrals`}
            cta={t('viewReferrals')}
          />
        </div>

        <LeaderboardBanner locale={locale} />

        {/* Booster plans rail */}
        {plans.length > 0 && (
          <section className="panel mt-4 p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="font-bold">{t('plansTitle')}</h2>
                <p className="text-sm text-slate-400">{t('plansSubtitle')}</p>
              </div>
              <Link
                href={`/${locale}/boosters`}
                className="shrink-0 text-sm font-semibold text-indigo-400 hover:text-indigo-300"
              >
                {t('viewAll')} →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p, i) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  popular={i === 1}
                  href={`/${locale}/boosters`}
                />
              ))}
            </div>
          </section>
        )}

        {/* ─── BONDKOIN Network Marketplace Ecosystem Banner ─── */}
        <section className="relative mt-4 overflow-hidden rounded-3xl border border-blue-500/30 bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950/40 p-5 sm:p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600/20 border border-blue-500/30 text-2xl shadow-inner">
                🛒
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-blue-500/20 border border-blue-400/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-cyan-300">
                    Ecosystem Utility
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Testnet Preview</span>
                </div>
                <h3 className="mt-1 text-base font-bold text-white">
                  BONDKOIN Network Marketplace
                </h3>
                <p className="mt-0.5 text-xs text-slate-300 max-w-xl leading-relaxed">
                  Shop real-world goods and hardware from verified merchants, pay with $BONDKOIN on BNB Chain, and discover regional commerce.
                </p>
              </div>
            </div>

            <Link
              href={`/${locale}/marketplace`}
              className="btn-gold shrink-0 rounded-xl px-5 py-3 text-center text-xs font-black uppercase tracking-wider text-slate-950 shadow-lg shadow-blue-500/20"
            >
              Open Marketplace →
            </Link>
          </div>
        </section>

        {/* Honest platform facts — every figure here is enforced in code. */}
        <section className="panel mt-4 grid grid-cols-2 gap-4 p-5 lg:grid-cols-4">
          <Feature chip="#818cf8" icon={<IconBolt />} title={t('f1t')} body={t('f1b')} />
          <Feature chip="#22c55e" icon={<IconClock />} title={t('f2t')} body={t('f2b')} />
          <Feature chip="#a78bfa" icon={<IconSwap />} title={t('f3t')} body={t('f3b')} />
          <Feature chip="#38bdf8" icon={<IconShield />} title={t('f4t')} body={t('f4b')} />
        </section>

        <TasksSection onClaimed={load} />

        <RecentActivity entries={history?.entries ?? []} />

        <ReferralPanel profile={profile} locale={locale} />
      </main>

      <MobileTabBar locale={locale} onMine={mine} ready={ready} claiming={claiming} />
    </div>
  );
}

/* ──────────────────────────── Chrome ──────────────────────────── */

function TopBar({ locale, onSignOut }: { locale: string; onSignOut: () => void }) {
  const t = useTranslations('dashboard');
  return (
    <header
      className="sticky top-0 z-30 border-b border-white/5 bg-[#05070f]/85 backdrop-blur"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <LogoMark size={40} priority />
          <span className="leading-none">
            <span className="block text-sm font-extrabold tracking-tight">
              BONDKOIN
            </span>
            <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t('cloudMining')}
            </span>
          </span>
        </Link>

        {/* Desktop nav — the mobile equivalent is the bottom tab bar. */}
        <nav className="hidden items-center gap-1 lg:flex">
          <NavLink href={`/${locale}/dashboard`} active>
            {t('navDashboard')}
          </NavLink>
          <NavLink href={`/${locale}/boosters`}>{t('navBoosters')}</NavLink>
          <NavLink href={`/${locale}/referrals`}>
            <span className="flex items-center gap-1">
              <span>👥</span>
              <span>Referrals</span>
            </span>
          </NavLink>
          <NavLink href={`/${locale}/leaderboard`}>
            <span className="flex items-center gap-1">
              <span>🏆</span>
              <span>Leaderboard</span>
            </span>
          </NavLink>
          <NavLink href={`/${locale}/marketplace`}>
            <span className="flex items-center gap-1">
              <span>🛒</span>
              <span>Marketplace</span>
              <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-cyan-300 border border-blue-400/30">
                NEW
              </span>
            </span>
          </NavLink>
          <NavLink href={`/${locale}/withdraw`}>{t('navWithdraw')}</NavLink>
          <NavLink href={`/${locale}/profile`}>{t('navProfile')}</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
          <button
            onClick={onSignOut}
            className="rounded-full border border-white/10 px-3.5 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-amber-400/50 hover:text-white"
          >
            {t('signOut')}
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
        active
          ? 'bg-indigo-500/15 text-indigo-300'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {children}
    </Link>
  );
}

function TabBar({
  locale,
  onMine,
  ready,
  claiming,
}: {
  locale: string;
  onMine: () => void;
  ready: boolean;
  claiming: boolean;
}) {
  const t = useTranslations('dashboard');
  return (
    <nav
      className="tabbar fixed inset-x-0 bottom-0 z-30 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        <Link href={`/${locale}/dashboard`} data-active="true">
          <IconHome />
          {t('navDashboard')}
        </Link>
        <Link href={`/${locale}/boosters`}>
          <IconRocket />
          {t('navBoosters')}
        </Link>

        <div className="grid place-items-center pb-1">
          <button
            onClick={onMine}
            disabled={!ready}
            aria-label={t('mineButton')}
            className={`tab-fab -mt-7 ${ready ? 'pulse-ring' : ''}`}
          >
            {claiming ? <IconSpinner /> : <IconBolt />}
          </button>
        </div>

        <Link href={`/${locale}/withdraw`}>
          <IconSwap />
          {t('navWithdraw')}
        </Link>
        <Link href={`/${locale}/profile`}>
          <IconUser />
          {t('navProfile')}
        </Link>
      </div>
    </nav>
  );
}

/* ───────────────────────── Hero / console ─────────────────────── */

function HeroPanel({
  status,
  claiming,
  celebrate,
  onMine,
  ready,
}: {
  status: MiningStatus;
  claiming: boolean;
  celebrate: number | null;
  onMine: () => void;
  ready: boolean;
}) {
  const t = useTranslations('dashboard');
  const pending = useLiveAccrual(status);
  const countdown = useCountdown(status.nextClaimAt);
  const progress =
    status.maxPendingPoints > 0
      ? Math.min(1, pending / status.maxPendingPoints)
      : 0;

  return (
    <section className="panel relative overflow-hidden p-5 sm:p-7">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-indigo-600/25 blur-3xl"
      />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {t('cloudMining')}
          </h1>
          <p className="mt-1.5 max-w-sm text-sm text-slate-400">
            {t('heroBody')}
          </p>
          <div className="mt-2.5">
            <BnbBadge label={t('bnbRewards')} />
          </div>
        </div>
        <MiningRig active={!ready} />
      </div>

      <div className="relative mt-6 flex flex-col items-center gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative text-center sm:text-left">
          {/* Mobile celebration: the ring and its burst are desktop-only, so
              the reward floats off the counter instead. */}
          {celebrate !== null && (
            <span className="float-up absolute left-1/2 top-6 z-10 -translate-x-1/2 whitespace-nowrap text-2xl font-extrabold text-emerald-400 sm:hidden">
              +{celebrate.toFixed(2)}
            </span>
          )}
          <div className="flex items-center justify-center gap-2 sm:justify-start">
            {ready ? (
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-400">
                ✓ {t('ready')}
              </span>
            ) : (
              <>
                <span className="live-dot" aria-hidden />
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {t('accruing')}
                </span>
              </>
            )}
          </div>
          <div className="mt-2 text-4xl font-black tabular-nums tracking-tight text-white sm:text-5xl">
            {pending.toFixed(4)}
          </div>
          <div className="mt-1 text-sm text-slate-400">{t('pending')}</div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3 py-1.5 text-sm font-bold text-indigo-300">
              <IconBolt className="h-3.5 w-3.5" />
              {status.ratePerHour} /h
            </span>
            {!status.canClaim && countdown && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-300">
                <IconClock className="h-3.5 w-3.5" />
                <span className="tabular-nums font-mono">{countdown}</span>
              </span>
            )}
          </div>
        </div>

        {/* Ring + Mine button with Shockwave and Burst Effects */}
        <div className="relative shrink-0 place-items-center grid my-2 sm:my-0">
          <div className="col-start-1 row-start-1">
            <ProgressRing progress={progress} />
          </div>
          {celebrate !== null && <Burst />}
          {celebrate !== null && <div className="col-start-1 row-start-1 mine-shockwave" />}
          {celebrate !== null && (
            <span className="float-up absolute left-1/2 -top-4 z-20 whitespace-nowrap rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-1 text-xl font-extrabold text-emerald-400 backdrop-blur-md">
              +{celebrate.toFixed(2)} PTS
            </span>
          )}
          <button
            onClick={onMine}
            disabled={!ready}
            className={`btn-gold col-start-1 row-start-1 h-[7.5rem] w-[7.5rem] flex flex-col items-center justify-center !rounded-full text-xs font-black uppercase tracking-wider transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:grayscale ${
              ready ? 'pulse-ring shadow-[0_0_40px_rgba(245,158,11,0.6)]' : 'shadow-lg'
            }`}
          >
            {claiming ? (
              <IconSpinner />
            ) : (
              <span className="text-2xl drop-shadow-sm">⚡</span>
            )}
            <span className="mt-1">{t('mineButton')}</span>
          </button>
        </div>
      </div>
    </section>
  );
}

/** Three slabs that pulse while accrual is running — the "rig". */
function MiningRig({ active }: { active: boolean }) {
  return (
    <div className="rig shrink-0" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rig-slab"
          style={active ? undefined : { animation: 'none', filter: 'brightness(0.7)' }}
        />
      ))}
      <span className="mt-1 h-1.5 w-14 rounded-full bg-indigo-500/30 blur-[2px]" />
    </div>
  );
}

function BalancePanel({
  profile,
  history,
  status,
  locale,
}: {
  profile: Profile;
  history: MiningHistory | null;
  status: MiningStatus;
  locale: string;
}) {
  const t = useTranslations('dashboard');
  const balance = useCountUp(profile.pointsBalance);
  // SPEC §3: 3 points = 1 mainnet $Matsumoto.
  const token = balance / 3;

  return (
    <section className="panel flex flex-col justify-between gap-5 p-5 sm:p-7">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {t('balance')}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <span className="text-3xl font-black tabular-nums text-white sm:text-4xl">
            {balance.toFixed(2)}
          </span>
          <span className="text-sm font-bold text-amber-400">
            {t('pointsShort')}
          </span>
        </div>
        <div className="mt-1 text-sm text-slate-400">
          ≈ <strong className="font-mono text-cyan-400">{token.toFixed(4)}</strong> $BONDKOIN
          <span className="ml-1 text-xs text-slate-500">({t('atRate')})</span>
        </div>
        <div className="mt-2.5">
          <span className="chain-indicator font-semibold">
            <BnbLogo className="h-3 w-3" />
            {t('chainIndicator')}
          </span>
        </div>
      </div>

      {profile.kycStatus !== 'APPROVED' ? (
        <Link
          href={`/${locale}/kyc`}
          className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-xs text-amber-200 transition hover:border-amber-400/50"
        >
          <span>{t('kycRequired', { status: profile.kycStatus })}</span>
          <span className="shrink-0 font-bold">{t('verifyCta')} →</span>
        </Link>
      ) : (
        <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
          ✓ {t('kycVerified')}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="text-xs text-slate-400">{t('minWithdrawal')}</div>
          <div className="mt-0.5 font-bold tabular-nums">100 {t('pointsShort')}</div>
        </div>
        <div className="rounded-xl bg-white/[0.03] p-3">
          <div className="text-xs text-slate-400">{t('boosters')}</div>
          <div className="mt-0.5 font-bold tabular-nums">
            {status.activeBoosters}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Stat cards ───────────────────────── */

function StatCard({
  i,
  chip,
  icon,
  label,
  value,
  decimals = 0,
  suffix = '',
  badge,
  spark,
  href,
  cta,
}: {
  i: number;
  chip: string;
  icon: React.ReactNode;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  badge?: string;
  spark?: boolean;
  href?: string;
  cta?: string;
}) {
  const animated = useCountUp(value);
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <span className="chip" style={{ '--chip': chip } as React.CSSProperties}>
          {icon}
        </span>
        {spark && <Sparkline />}
      </div>
      <div className="mt-3 truncate text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-black tabular-nums text-white sm:text-2xl">
          {animated.toFixed(decimals)}
          {suffix}
        </span>
        {badge && (
          <span className="rounded-full bg-violet-500/15 px-1.5 py-0.5 text-[0.65rem] font-bold text-violet-300">
            {badge}
          </span>
        )}
      </div>
      {cta && (
        <span className="mt-1 block text-xs font-bold text-indigo-400">
          {cta} →
        </span>
      )}
    </>
  );

  const cls = 'panel panel-lift rise-in block p-4';
  const style = { '--i': i + 1 } as React.CSSProperties;

  return href ? (
    <Link href={href} className={cls} style={style}>
      {body}
    </Link>
  ) : (
    <div className={cls} style={style}>
      {body}
    </div>
  );
}

/** A small upward trend line. Decorative — it is not plotting real series
    data, so it carries no axis or value and is hidden from screen readers. */
function Sparkline() {
  return (
    <svg width="56" height="24" viewBox="0 0 56 24" fill="none" aria-hidden>
      <path
        d="M1 20 L9 16 L17 18 L25 11 L33 13 L41 6 L49 8 L55 2"
        stroke="#22c55e"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ───────────────────────── Plans / features ───────────────────── */

function PlanCard({
  plan,
  popular,
  href,
}: {
  plan: BoosterPlanDto;
  popular: boolean;
  href: string;
}) {
  const t = useTranslations('dashboard');
  return (
    <Link
      href={href}
      className={`glass-panel group relative flex flex-col justify-between overflow-hidden p-5 transition-all hover:scale-[1.02] ${
        popular ? 'border-amber-400/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30' : ''
      }`}
    >
      {popular && (
        <div className="absolute right-3 top-3 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-sm">
          {t('popular')}
        </div>
      )}

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
              {plan.durationDays} {t('days')}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <span className="btn-gold block w-full rounded-xl py-2.5 text-center text-xs font-extrabold uppercase tracking-wider text-slate-950 shadow-md">
          {t('getStarted')} →
        </span>
      </div>
    </Link>
  );
}

function Row({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${accent ? 'text-emerald-400' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function Feature({
  chip,
  icon,
  title,
  body,
}: {
  chip: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center">
      <span
        className="chip mx-auto"
        style={{ '--chip': chip } as React.CSSProperties}
      >
        {icon}
      </span>
      <div className="mt-2 text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-xs text-slate-400">{body}</div>
    </div>
  );
}

/* ──────────────────────── Recent activity ─────────────────────── */

const REASON_CHIP: Record<string, string> = {
  MINING: '#818cf8',
  TASK_REWARD: '#22c55e',
  REFERRAL_BONUS: '#38bdf8',
  BOOSTER_PURCHASE: '#a78bfa',
  WITHDRAWAL: '#f59e0b',
  AIRDROP: '#ec4899',
  ADMIN_ADJUST: '#94a3b8',
};

function RecentActivity({ entries }: { entries: LedgerEntryDto[] }) {
  const t = useTranslations('dashboard');
  if (!entries.length) return null;

  return (
    <section className="panel mt-4 p-5">
      <h2 className="font-bold">{t('recentTitle')}</h2>
      <ul className="mt-3 divide-y divide-white/5">
        {entries.map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2.5">
            <span
              className="chip !h-9 !w-9"
              style={
                { '--chip': REASON_CHIP[e.reason] ?? '#94a3b8' } as React.CSSProperties
              }
            >
              <IconBolt className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {t(`reason.${e.reason}`)}
              </div>
              <div className="text-xs text-slate-500">
                {new Date(e.createdAt).toLocaleString()}
              </div>
            </div>
            <span
              className={`shrink-0 text-sm font-bold tabular-nums ${
                e.points >= 0 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {e.points >= 0 ? '+' : ''}
              {e.points.toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ReferralPanel({
  profile,
  locale,
}: {
  profile: Profile;
  locale: string;
}) {
  const t = useTranslations('dashboard');
  const [copied, setCopied] = useState(false);
  const link =
    typeof window !== 'undefined'
      ? `${window.location.origin}/${locale}/login?ref=${profile.referralCode}`
      : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked — the link is still selectable */
    }
  }

  return (
    <section className="glass-panel mt-4 p-5 sm:p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base">👥</span>
          <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
            {t('referralLink')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-xs font-mono font-bold text-amber-300">
            Tier {profile.referralTier.level} ({profile.referralTier.multiplier}× Multiplier)
          </span>
          <span className="rounded-lg bg-slate-800 border border-white/10 px-2.5 py-0.5 text-xs font-mono font-bold text-slate-300">
            CODE: {profile.referralCode}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="flex-1 overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/80 px-3.5 py-3">
          <code className="block truncate font-mono text-sm font-bold text-amber-400 select-all">
            {link || `.../${locale}/login?ref=${profile.referralCode}`}
          </code>
        </div>
        <button
          type="button"
          onClick={copy}
          className="btn-gold shrink-0 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider text-slate-950 shadow-md transition-all active:scale-95"
        >
          {copied ? `✓ ${t('copied')}` : t('copy')}
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3.5">
        <div className="text-xs text-slate-400">
          Total Invited: <strong className="text-white font-mono">{profile.referralCount} Miners</strong>
        </div>
        <Link
          href={`/${locale}/referrals`}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-all hover:scale-105"
        >
          <span>👥 {t('viewReferrals')}</span>
          <span>→</span>
        </Link>
      </div>
    </section>
  );
}

function LeaderboardBanner({ locale }: { locale: string }) {
  const t = useTranslations('leaderboard');
  return (
    <Link
      href={`/${locale}/leaderboard`}
      className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-500/10 via-slate-900/60 to-slate-900/60 p-4 transition-all hover:border-emerald-400/40 hover:from-emerald-500/15"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-xl">
          🏆
        </span>
        <div className="min-w-0">
          <div className="truncate text-sm font-black text-white">
            {t('title')}
          </div>
          <div className="truncate text-xs text-slate-400">
            {t('yourRank')} · {t('catEarnings')}
          </div>
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold text-emerald-300">→</span>
    </Link>
  );
}

function Skeleton({ message }: { message: string | null }) {
  return (
    <div className="app-shell min-h-dvh px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="skeleton h-9 w-40" />
          <div className="skeleton h-9 w-24 !rounded-full" />
        </div>
        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <div className="skeleton h-64 w-full" />
          <div className="skeleton h-64 w-full" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-32 w-full" />
          ))}
        </div>
        {message && (
          <p className="mt-6 text-center text-sm text-slate-400">{message}</p>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────── Shared bits ───────────────────────── */

function ProgressRing({ progress }: { progress: number }) {
  const R = 66;
  const C = 2 * Math.PI * R;
  return (
    <svg width="158" height="158" viewBox="0 0 158 158" aria-hidden>
      <defs>
        <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="55%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <circle
        cx="79"
        cy="79"
        r={R}
        fill="none"
        strokeWidth="7"
        stroke="rgba(255,255,255,0.08)"
      />
      <circle
        className="ring-progress"
        cx="79"
        cy="79"
        r={R}
        fill="none"
        strokeWidth="7"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - progress)}
        transform="rotate(-90 79 79)"
      />
    </svg>
  );
}

function Burst() {
  const colors = ['#6366f1', '#a78bfa', '#38bdf8', '#22c55e', '#f59e0b'];
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

/* ───────────────────────────── Hooks ──────────────────────────── */

function useLiveAccrual(status: MiningStatus): number {
  const [pending, setPending] = useState(status.pendingPoints);
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
      if (ms <= 0) return setLabel(null);
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

/* ───────────────────────────── Icons ──────────────────────────── */

const ico = 'h-[18px] w-[18px]';

function IconBolt({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
    </svg>
  );
}
function IconCoins({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v4c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0 1.7-3.6 3-8 3s-8-1.3-8-3Z" />
      <path d="M4 12v4c0 1.7 3.6 3 8 3s8-1.3 8-3v-4c0 1.7-3.6 3-8 3s-8-1.3-8-3Z" />
    </svg>
  );
}
function IconChip({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <rect x="6" y="6" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" />
      <path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconDoc({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M6 3h8l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M13 3v5h5M8 13h8M8 17h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconUsers({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Zm7.5-3.5A3.5 3.5 0 1 0 16.5 3a3.5 3.5 0 0 0 0 7Zm.6 2.1c1.2.6 2.9 2 2.9 3.9v3H23v-3c0-2.7-2.5-3.5-5.9-3.9Z" />
    </svg>
  );
}
function IconUser({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-4 0-9 2-9 5.5V22h18v-2.5C21 16 16 14 12 14Z" />
    </svg>
  );
}
function IconClock({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconSwap({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M4 8h13l-3-3M20 16H7l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconShield({ className = ico }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconHome({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="m4 11 8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1v-8Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}
function IconRocket({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c3 2 5 6 5 10 0 1.5-.3 2.9-.8 4l-2.2-1c.5-1 .8-2 .8-3 0-3-1.5-6-2.8-7.5C10.7 5.9 9 8.7 9 12c0 1 .3 2 .8 3l-2.2 1c-.5-1.1-.8-2.5-.8-4 0-4 2-8 5-10Zm-3 15 1.5 3H8l-1-2 2-1Zm6 0 2 1-1 2h-2.5l1.5-3Z" />
    </svg>
  );
}
function IconPick({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path d="M14.5 3c2.5.4 5 2 6.5 4.2-1.6-.5-3-.4-4.3.2M9.5 3C7 3.4 4.5 5 3 7.2c1.6-.5 3-.4 4.3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="m12 6 1.6 1.6L7.4 20.4a1.1 1.1 0 0 1-1.9-1L12 6Z" fill="currentColor" />
    </svg>
  );
}
function IconSpinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${className} animate-spin`} aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
