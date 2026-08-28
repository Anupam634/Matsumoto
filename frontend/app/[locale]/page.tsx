import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { NetworkStatusBar } from '../../components/NetworkStatusBar';
import { InteractiveMinerVisualizer } from '../../components/InteractiveMinerVisualizer';
import { MiningCalculator } from '../../components/MiningCalculator';
import { OnChainArchitecture } from '../../components/OnChainArchitecture';
import { BoosterGrid } from '../../components/BoosterGrid';
import { ReferralTierMatrix } from '../../components/ReferralTierMatrix';
import { TasksBountySection } from '../../components/TasksBountySection';
import { FAQSection } from '../../components/FAQSection';
import { LogoMark } from '../../components/Logo';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';
import { ThemeToggle } from '../../components/ThemeToggle';
import { NavAuth, AuthAwareCta, HideWhenAuthed } from '../../components/AuthAware';

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
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-slate-950/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 sm:gap-4 px-3.5 py-2.5 sm:px-6 sm:py-3.5">
          {/* Brand Logo */}
          <Link href={`/${locale}`} className="flex items-center gap-3 font-black text-lg group">
            <div className="relative">
              <div className="absolute -inset-1 rounded-xl bg-blue-600/30 blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
              <LogoMark size={38} priority className="relative shrink-0" />
            </div>
            <div className="leading-none">
              <span className="text-base font-black tracking-tight text-white">BONDKOIN</span>
              <span className="block font-mono text-[10px] font-extrabold uppercase tracking-widest text-blue-400">
                Labs · BNB Chain
              </span>
            </div>
          </Link>

          {/* Nav links.
              The row is one non-wrapping line shared with the brand and the
              Start CTA, and the full nine links only fit from 2xl — below
              that they pushed the CTA off the right edge. The links
              dropped below 2xl are in-page anchors, still reachable by
              scrolling; Marketplace (a real route) always stays. */}
          <nav className="hidden min-w-0 lg:flex items-center gap-4 xl:gap-5 2xl:gap-6 whitespace-nowrap text-[11px] xl:text-xs font-bold uppercase tracking-wider text-slate-300">
            <a href="#how" className="shrink-0 transition-colors hover:text-blue-400">
              {t('nav.features')}
            </a>
            <a
              href="#architecture"
              className="hidden shrink-0 transition-colors hover:text-blue-400 2xl:inline"
            >
              Architecture
            </a>
            <a href="#boosters" className="shrink-0 transition-colors hover:text-blue-400">
              {t('nav.boosters')}
            </a>
            <Link
              href={`/${locale}/marketplace`}
              className="flex shrink-0 items-center gap-1 font-extrabold text-cyan-300 transition-colors hover:text-blue-400"
            >
              <span>🛒</span>
              <span>Marketplace</span>
            </Link>
            <a href="#calculator" className="shrink-0 transition-colors hover:text-blue-400">
              {t('nav.calculator')}
            </a>
            <a href="#referrals" className="shrink-0 transition-colors hover:text-blue-400">
              {t('nav.referrals')}
            </a>
            <a
              href="#tasks"
              className="hidden shrink-0 transition-colors hover:text-blue-400 2xl:inline"
            >
              {t('nav.tasks')}
            </a>
            <a
              href="#rules"
              className="hidden shrink-0 transition-colors hover:text-blue-400 2xl:inline"
            >
              {t('nav.rules')}
            </a>
            <a href="#faq" className="shrink-0 transition-colors hover:text-blue-400">
              {t('nav.faq')}
            </a>
          </nav>

          {/* Action CTAs, Language & Theme Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs shrink-0">
            <ThemeToggle />
            <LocaleSwitcher locale={locale} />
            <NavAuth
              locale={locale}
              signInLabel={t('nav.signIn')}
              getStartedLabel={t('nav.getStarted')}
              dashboardLabel={t('nav.dashboard')}
            />
          </div>
        </div>
      </header>

      {/* ────────────────────────── Hero ─────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-5 pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="grid items-center gap-12 lg:grid-cols-12">
          {/* Left Hero Content */}
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-600/10 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-blue-300 backdrop-blur-md shadow-lg shadow-blue-500/10">
              <span className="pulse-dot h-2 w-2 rounded-full bg-cyan-400" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl tracking-tight">
              {t('hero.title')}{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-300 bg-clip-text text-transparent drop-shadow-md">
                {t('hero.titleAccent')}
              </span>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 max-w-md sm:max-w-none">
              <AuthAwareCta
                locale={locale}
                href={register}
                label={t('hero.ctaPrimary')}
                dashboardLabel={t('nav.dashboard')}
                className="btn-gold w-full sm:w-auto inline-flex items-center justify-center rounded-2xl px-8 py-4 text-sm font-black uppercase tracking-wider text-white shadow-2xl shadow-blue-600/25 transition-all hover:scale-105"
              />
              <HideWhenAuthed>
                <Link
                  href={signIn}
                  className="w-full sm:w-auto inline-flex items-center justify-center rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-4 text-sm font-bold text-slate-200 backdrop-blur-xl hover:border-blue-500/60 hover:text-blue-300 transition-all shadow-lg hover:scale-105 text-center"
                >
                  {t('hero.ctaSecondary')}
                </Link>
              </HideWhenAuthed>
            </div>

            {/* Trust & Verified Node info */}
            <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/[0.08] pt-6 text-xs text-slate-400">
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

          {/* Right Hero: 3D Interactive Mining Rig Terminal Simulator */}
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

      {/* ────────── Real On-Chain Architecture & Tokenomics ──────── */}
      <section id="architecture" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading
          title={t('architecture.title')}
          subtitle={t('architecture.subtitle')}
        />
        <OnChainArchitecture />
      </section>

      {/* ────────────────────── How It Works ─────────────────────── */}
      <section id="how" className="mx-auto max-w-7xl px-5 py-16">
        <SectionHeading title={t('how.title')} subtitle={t('how.subtitle')} />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(['register', 'mine', 'boost', 'withdraw'] as const).map((step, i) => (
            <div
              key={step}
              className="glass-panel relative flex flex-col justify-between p-6"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/10 border border-amber-500/20 font-black text-xl text-amber-400 shadow-inner">
                    0{i + 1}
                  </div>
                  <span className="font-mono text-xs text-slate-500 font-bold">
                    PHASE 0{i + 1}
                  </span>
                </div>

                <h3 className="mt-5 text-lg font-extrabold text-slate-100">
                  {t(`how.${step}.title`)}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">
                  {t(`how.${step}.body`)}
                </p>
              </div>

              <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-amber-500 to-yellow-300" />
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
            <div key={rule} className="glass-panel p-6">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-xl">
                {idx === 0 ? '🔒' : idx === 1 ? '📅' : idx === 2 ? '🛡️' : '⚖️'}
              </div>
              <h3 className="mt-5 font-extrabold text-amber-400 text-base">
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
        <div className="relative overflow-hidden rounded-3xl border border-amber-500/40 bg-gradient-to-br from-slate-950 via-slate-900/60 to-amber-950/30 p-8 sm:p-16 text-center shadow-2xl backdrop-blur-2xl">
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />

          <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-xs font-black uppercase tracking-widest text-amber-300">
            {t('cta.badge')}
          </span>

          <h2 className="mt-6 text-3xl font-black sm:text-5xl tracking-tight text-slate-100">
            {t('cta.title')}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">
            {t('cta.body')}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <AuthAwareCta
              locale={locale}
              href={register}
              label={t('cta.buttonPrimary')}
              dashboardLabel={t('nav.dashboard')}
              className="btn-gold rounded-2xl px-8 py-4 text-sm font-extrabold uppercase tracking-wider text-slate-950 shadow-2xl"
            />
            <HideWhenAuthed>
              <Link
                href={signIn}
                className="rounded-2xl border border-white/10 bg-slate-900/80 px-6 py-4 text-sm font-bold text-slate-200 hover:border-amber-500/60 hover:text-amber-400 backdrop-blur-md transition-colors"
              >
                {t('cta.buttonSecondary')}
              </Link>
            </HideWhenAuthed>
          </div>
        </div>
      </section>

      {/* ────────────────────────── Footer ───────────────────────── */}
      <footer className="border-t border-white/[0.08] bg-slate-950/90 px-5 pt-16 pb-12 text-slate-400 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl grid gap-10 lg:grid-cols-12 pb-12 border-b border-white/[0.08]">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5 font-black text-lg text-slate-100">
              <LogoMark size={34} />
              BONDKOIN Labs
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
                <li><a href="#how" className="hover:text-amber-400">{t('nav.features')}</a></li>
                <li><Link href={`/${locale}/boosters`} className="hover:text-amber-400">{t('nav.boosters')}</Link></li>
                <li><a href="#calculator" className="hover:text-amber-400">{t('nav.calculator')}</a></li>
                <li><a href="#referrals" className="hover:text-amber-400">{t('nav.referrals')}</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-3">
                {t('footer.ecosystem')}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href={`/${locale}/dashboard`} className="text-blue-400 font-mono font-bold hover:underline">$BONDKOIN BEP-20</Link></li>
                <li><Link href={`/${locale}/marketplace`} className="text-cyan-300 font-bold hover:underline">🛒 Network Marketplace</Link></li>
                <li><Link href={`/${locale}/withdraw`} className="hover:text-blue-400">BNB Chain Withdrawals</Link></li>
                <li><Link href={`/${locale}/kyc`} className="hover:text-blue-400">KYC Verification</Link></li>
                <li><Link href={`/${locale}/support`} className="hover:text-blue-400">Support Desk</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-3">
                {t('footer.legal')}
              </h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href={`/${locale}/faq`} className="hover:text-blue-400">{t('footer.faq')}</Link></li>
                <li><Link href={`/${locale}/terms`} className="hover:text-blue-400">{t('footer.terms')}</Link></li>
                <li><Link href={`/${locale}/privacy`} className="hover:text-blue-400">{t('footer.privacy')}</Link></li>
                <li><Link href={`/${locale}/support`} className="hover:text-blue-400">{t('footer.support')}</Link></li>
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
    <div className="mb-12 text-center">
      <h2 className="text-3xl font-black sm:text-4xl text-slate-100 tracking-tight">{title}</h2>
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
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600/10 border border-blue-500/20 text-xl">
          {icon}
        </span>
        <div className="font-mono text-2xl font-black text-blue-400">{value}</div>
      </div>
      <div className="mt-4 text-xs uppercase font-extrabold tracking-wider text-slate-200">
        {label}
      </div>
      {subLabel && (
        <div className="mt-1 text-[11px] text-slate-400 font-mono">{subLabel}</div>
      )}
    </div>
  );
}
