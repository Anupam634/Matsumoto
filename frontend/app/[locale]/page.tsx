import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { locales } from '../../i18n';
import { NetworkStatusBar } from '../../components/NetworkStatusBar';
import { InteractiveMinerVisualizer } from '../../components/InteractiveMinerVisualizer';
import { MiningCalculator } from '../../components/MiningCalculator';
import { LiveTransactionsTicker } from '../../components/LiveTransactionsTicker';
import { BoosterGrid } from '../../components/BoosterGrid';
import { ReferralTierMatrix } from '../../components/ReferralTierMatrix';
import { TasksBountySection } from '../../components/TasksBountySection';
import { FAQSection } from '../../components/FAQSection';

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中文',
  ko: '한국어',
};

export default function LandingPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  return <Landing locale={locale} />;
}

function Landing({ locale }: { locale: string }) {
  const t = useTranslations('landing');
  const register = `/${locale}/login?mode=register`;
  const signIn = `/${locale}/login`;

  return (
    <div className="glow-field min-h-screen bg-cyber-grid text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      {/* ─────────────────── Top Network Status Bar ─────────────────── */}
      <NetworkStatusBar />

      {/* ─────────────────────────── Nav ─────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          {/* Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-2.5 font-black text-lg">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 font-extrabold text-slate-950 shadow-md shadow-amber-500/20">
              M
            </span>
            <span className="tracking-tight">
              Matsumoto <span className="text-amber-400 font-mono text-xs uppercase tracking-widest block font-bold">Mining Platform</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <a href="#how" className="transition-colors hover:text-amber-400">
              {t('nav.features')}
            </a>
            <a href="#boosters" className="transition-colors hover:text-amber-400">
              {t('nav.boosters')}
            </a>
            <a href="#calculator" className="transition-colors hover:text-amber-400">
              {t('nav.calculator')}
            </a>
            <a href="#referrals" className="transition-colors hover:text-amber-400">
              {t('nav.referrals')}
            </a>
            <a href="#tasks" className="transition-colors hover:text-amber-400">
              {t('nav.tasks')}
            </a>
            <a href="#rules" className="transition-colors hover:text-amber-400">
              {t('nav.rules')}
            </a>
            <a href="#faq" className="transition-colors hover:text-amber-400">
              {t('nav.faq')}
            </a>
          </nav>

          {/* Action CTAs & Language Switcher */}
          <div className="flex items-center gap-3 text-xs">
            {/* Language Switcher */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900/90 p-1">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={`rounded-lg px-2.5 py-1 font-semibold transition-all ${
                    l === locale
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {LOCALE_LABELS[l]}
                </Link>
              ))}
            </div>

            <Link
              href={signIn}
              className="hidden sm:inline-block rounded-xl border border-slate-700/80 bg-slate-900/60 px-4 py-2 font-semibold text-slate-200 hover:border-amber-500/60 hover:text-amber-400"
            >
              {t('nav.signIn')}
            </Link>
            <Link
              href={register}
              className="btn-gold rounded-xl px-4 py-2 font-bold uppercase tracking-wider text-slate-950"
            >
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      </header>

      {/* ────────────────────────── Hero ─────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Hero Content */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-300 backdrop-blur-md">
              <span className="pulse-dot h-2 w-2 rounded-full bg-amber-400" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-yellow-500 bg-clip-text text-transparent drop-shadow-sm">
                {t('hero.titleAccent')}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href={register}
                className="btn-gold rounded-xl px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-xl shadow-amber-500/20"
              >
                {t('hero.ctaPrimary')} →
              </Link>
              <Link
                href={signIn}
                className="rounded-xl border border-slate-700/80 bg-slate-900/60 px-6 py-4 text-sm font-bold text-slate-200 backdrop-blur-md hover:border-amber-500/60 hover:text-amber-400 transition-colors"
              >
                {t('hero.ctaSecondary')}
              </Link>
            </div>

            {/* Trust & Verified Node info */}
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-slate-800/80 pt-6 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <span>{t('hero.verifiedNode')}</span>
              </div>
              <span className="text-slate-700">•</span>
              <div className="flex items-center gap-2">
                <span className="text-amber-400 font-bold">⚡</span>
                <span>{t('hero.activeMinersBadge')}</span>
              </div>
            </div>

            <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
              {t('hero.honesty')}
            </p>
          </div>

          {/* Right Hero: Live Interactive Mining Rig Terminal */}
          <div className="lg:col-span-5">
            <InteractiveMinerVisualizer />
          </div>
        </div>
      </section>

      {/* ───────────────────── Key Numbers Strip ─────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Figure
            value="0.90 /h"
            label={t('figures.baseRate')}
            subLabel={t('figures.baseRateSub')}
            icon="⚡"
          />
          <Figure
            value="3 : 1"
            label={t('figures.conversion')}
            subLabel={t('figures.conversionSub')}
            icon="🔄"
          />
          <Figure
            value="100 PTS"
            label={t('figures.minWithdrawal')}
            subLabel={t('figures.minWithdrawalSub')}
            icon="💰"
          />
          <Figure
            value="30 Days"
            label={t('figures.boosterDuration')}
            subLabel={t('figures.boosterDurationSub')}
            icon="⏱️"
          />
        </div>
      </section>

      {/* ───────────────── Live Activity / Payouts ───────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-10">
        <LiveTransactionsTicker />
      </section>

      {/* ────────────────────── How It Works ─────────────────────── */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading title={t('how.title')} subtitle={t('how.subtitle')} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(['register', 'mine', 'boost', 'withdraw'] as const).map((step, i) => (
            <div
              key={step}
              className="card card-lift relative flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 font-black text-xl text-amber-400">
                    0{i + 1}
                  </div>
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    STEP {i + 1}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-bold text-slate-100">
                  {t(`how.${step}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`how.${step}.body`)}
                </p>
              </div>

              <div className="mt-6 h-1 w-12 rounded-full bg-amber-500/30" />
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────── Booster Packages ───────────────────── */}
      <section id="boosters" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading
          title={t('boosters.title')}
          subtitle={t('boosters.subtitle')}
        />
        <BoosterGrid locale={locale} />
      </section>

      {/* ────────────────── Profitability Calculator ─────────────── */}
      <section id="calculator" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading
          title={t('calculator.title')}
          subtitle={t('calculator.subtitle')}
        />
        <MiningCalculator locale={locale} />
      </section>

      {/* ─────────────────────── Referrals ───────────────────────── */}
      <section id="referrals" className="mx-auto max-w-7xl px-5 py-16">
        <ReferralTierMatrix />
      </section>

      {/* ───────────────────────── Tasks ─────────────────────────── */}
      <section id="tasks" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading
          title={t('tasksSection.title')}
          subtitle={t('tasksSection.subtitle')}
        />
        <TasksBountySection locale={locale} />
      </section>

      {/* ─────────────────────── Withdrawals ─────────────────────── */}
      <section id="rules" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading
          title={t('withdrawals.title')}
          subtitle={t('withdrawals.subtitle')}
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(['minimum', 'frequency', 'kyc', 'approval'] as const).map((rule, idx) => (
            <div key={rule} className="card card-lift p-6">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-800 text-lg">
                {idx === 0 ? '🔒' : idx === 1 ? '📅' : idx === 2 ? '🛡️' : '⚖️'}
              </div>
              <h3 className="mt-4 font-bold text-amber-400">
                {t(`withdrawals.${rule}.title`)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {t(`withdrawals.${rule}.body`)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────── FAQ ─────────────────────────── */}
      <section id="faq" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading title={t('faq.title')} subtitle={t('faq.subtitle')} />
        <FAQSection />
      </section>

      {/* ─────────────────────── Final CTA ───────────────────────── */}
      <section className="mx-auto max-w-7xl px-5 py-20">
        <div className="card card-glow-gold relative overflow-hidden p-8 sm:p-14 text-center">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

          <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300">
            {t('cta.badge')}
          </span>

          <h2 className="mt-6 text-3xl font-black sm:text-5xl">
            {t('cta.title')}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            {t('cta.body')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href={register}
              className="btn-gold rounded-xl px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-xl"
            >
              {t('cta.buttonPrimary')} →
            </Link>
            <Link
              href={signIn}
              className="rounded-xl border border-slate-700 bg-slate-900/80 px-6 py-4 text-sm font-bold text-slate-200 hover:border-amber-500/60 hover:text-amber-400"
            >
              {t('cta.buttonSecondary')}
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-slate-900 bg-slate-950/90 px-5 pt-16 pb-12 text-slate-400">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-12 pb-12 border-b border-slate-900">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5 font-black text-lg text-slate-100">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-amber-500 text-slate-950 font-extrabold text-sm">
                M
              </span>
              Matsumoto Mining Platform
            </div>
            <p className="text-xs leading-relaxed text-slate-400 max-w-md">
              {t('footer.brandDesc')}
            </p>
            <div className="flex items-center gap-3 pt-2 text-xs">
              <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 font-mono text-emerald-400 font-semibold">
                BNB Chain Mainnet Active
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 gap-8 sm:grid-cols-3 text-xs">
            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-3">
                {t('footer.quickLinks')}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><a href="#how" className="hover:text-amber-400">Features</a></li>
                <li><a href="#boosters" className="hover:text-amber-400">Booster Nodes</a></li>
                <li><a href="#calculator" className="hover:text-amber-400">Yield Calculator</a></li>
                <li><a href="#referrals" className="hover:text-amber-400">Referral Multipliers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-3">
                {t('footer.ecosystem')}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><span className="text-amber-400 font-mono font-bold">$Matsumoto BEP-20</span></li>
                <li><span className="text-slate-400">Binance Smart Chain</span></li>
                <li><span className="text-slate-400">Decentralized Payouts</span></li>
                <li><span className="text-slate-400">Anti-Sybil Engine</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-3">
                {t('footer.legal')}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><span className="text-slate-400">100 Pts Min Payout</span></li>
                <li><span className="text-slate-400">Mandatory KYC Fair Policy</span></li>
                <li><span className="text-slate-400">Weekly Payout Settlement</span></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl pt-8 text-center text-[11px] text-slate-500 space-y-3">
          <p className="mx-auto max-w-3xl leading-relaxed">
            {t('footer.disclaimer')}
          </p>
          <p className="font-medium text-slate-400">
            {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-10 text-center">
      <h2 className="text-2xl font-black sm:text-4xl text-slate-100">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-400 sm:text-base leading-relaxed">
        {subtitle}
      </p>
    </div>
  );
}

function Figure({
  value,
  label,
  subLabel,
  icon,
}: {
  value: string;
  label: string;
  subLabel?: string;
  icon: string;
}) {
  return (
    <div className="card card-lift p-5">
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <div className="font-mono text-2xl font-black text-amber-400">{value}</div>
      </div>
      <div className="mt-3 text-xs uppercase font-bold tracking-wider text-slate-300">
        {label}
      </div>
      {subLabel && (
        <div className="mt-1 text-[11px] text-slate-500 font-mono">{subLabel}</div>
      )}
    </div>
  );
}
