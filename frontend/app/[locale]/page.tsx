import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import {
  AuthAwareCta,
  HideWhenAuthed,
  NavAuth,
} from '../../components/AuthAware';
import { LogoMark } from '../../components/Logo';
import { BnbLogo } from '../../components/BnbLogo';
import { HeroVideo } from '../../components/HeroVideo';
import { LocaleSwitcher } from '../../components/LocaleSwitcher';

/** Booster catalogue — mirrors SPEC.md §2 and prisma/seed.ts. */
const BOOSTERS = [
  { price: 1, rate: '2.9' },
  { price: 5, rate: '10.9', popular: true },
  { price: 10, rate: '20.9' },
  { price: 50, rate: '90.9' },
];

/** Referral tiers — mirrors SPEC.md §2 and mining.engine.ts. */
const TIERS = [
  { invites: '0', level: 1, multiplier: 1 },
  { invites: '1–5', level: 2, multiplier: 3 },
  { invites: '6–10', level: 3, multiplier: 4 },
  { invites: '11–20', level: 4, multiplier: 5 },
  { invites: '21–30', level: 5, multiplier: 6 },
  { invites: '31+', level: 6, multiplier: 8 },
];

const TASK_KEYS = [
  'tweet',
  'follow',
  'repost',
  'youtube',
  'quiz',
  'spin',
] as const;

const TASK_ICONS: Record<(typeof TASK_KEYS)[number], string> = {
  tweet: '𝕏',
  follow: '➕',
  repost: '🔁',
  youtube: '▶',
  quiz: '❓',
  spin: '🎡',
};

/** The four hero strip steps, each paired with a short icon. */
const STEP_KEYS = ['register', 'mine', 'boost', 'withdraw'] as const;


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
  const tasks = useTranslations('tasks');

  const register = `/${locale}/login?mode=register`;
  const signIn = `/${locale}/login`;

  // Real numbers only — no invented trust badges, just the facts that are
  // already on the page, looped into a scrolling strip for texture.
  const tickerItems = [
    `${t('figures.baseRate')}: 0.9/h`,
    `${t('figures.conversion')}: 3 : 1`,
    `${t('figures.minWithdrawal')}: 100`,
    `${t('figures.boosterDuration')}: 30d`,
    'BNB Chain · BEP-20',
    t('hero.badge'),
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ─────────────────────────── Nav ─────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-5">
          <span className="flex shrink-0 items-center gap-2 font-bold">
            <LogoMark size={36} priority />
            <span className="hidden sm:inline">Matsumoto</span>
          </span>

          <nav className="flex items-center gap-2 text-sm sm:gap-4">
            <LocaleSwitcher locale={locale} />
            <NavAuth
              locale={locale}
              signInLabel={t('nav.signIn')}
              getStartedLabel={t('nav.getStarted')}
              dashboardLabel={t('nav.dashboard')}
            />
          </nav>
        </div>
      </header>

      {/* ────────────────────────── Hero ─────────────────────────── */}
      <section className="glow-field-light">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              <BnbLogo className="h-3.5 w-3.5" />
              {t('hero.badge')}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
              {t('hero.title')}{' '}
              <span className="text-gradient-brand">{t('hero.titleAccent')}</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-600">
              {t('hero.subtitle')}
            </p>

            {/* Quick-glance step strip. */}
            <div className="card-soft mt-8 grid grid-cols-2 gap-x-4 gap-y-5 p-5 sm:grid-cols-4">
              {STEP_KEYS.map((step, i) => (
                <div key={step}>
                  <div
                    className={`grid h-9 w-9 place-items-center rounded-full ${STEP_ICON_STYLES[i]}`}
                  >
                    {STEP_ICONS[i]}
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {t(`how.${step}.title`)}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <AuthAwareCta
                locale={locale}
                href={register}
                className="btn-primary flex-1 py-3.5 text-base"
                label={t('hero.ctaPrimary')}
                dashboardLabel={t('nav.dashboard')}
              />
            </div>
            <HideWhenAuthed>
              <Link
                href={signIn}
                className="btn-outline-brand mt-3 flex w-full py-3.5 text-base"
              >
                {t('hero.ctaSecondary')} →
              </Link>
            </HideWhenAuthed>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-indigo-50/70 p-4 text-xs text-slate-600">
              <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
              {t('hero.honesty')}
            </div>
          </div>

          <HeroVideo />
        </div>
      </section>

      {/* ──────────────────────── Fact ticker ─────────────────────── */}
      <div className="border-y border-slate-200 bg-slate-50 py-3">
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {tickerItems.map((item, i) => (
                  <span
                    key={`${copy}-${i}`}
                    className="flex items-center gap-3 px-6 text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    {item}
                    <span className="text-indigo-400" aria-hidden>
                      ✦
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───────────────────── Key numbers strip ─────────────────── */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-12 lg:grid-cols-4">
        <Figure value="0.9 /h" label={t('figures.baseRate')} />
        <Figure value="3 : 1" label={t('figures.conversion')} />
        <Figure value="100" label={t('figures.minWithdrawal')} />
        <Figure value="30d" label={t('figures.boosterDuration')} />
      </section>

      {/* ───────────────── Built on BNB Chain callout ─────────────── */}
      <section className="mx-auto max-w-6xl px-5">
        <div className="flex flex-col items-center gap-8 rounded-3xl bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-8 sm:flex-row sm:justify-between sm:p-10">
          <div>
            <div className="text-sm text-slate-500">{t('chain.builtOn')}</div>
            <div className="text-gradient-brand text-3xl font-extrabold sm:text-4xl">
              BNB Chain
            </div>
            <p className="mt-2 text-sm text-slate-600">{t('chain.tagline')}</p>
            <Link
              href={signIn}
              className="mt-5 inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm ring-1 ring-indigo-200 transition hover:ring-indigo-300"
            >
              {t('chain.learnMore')} ›
            </Link>
          </div>
          <ChainCube />
        </div>
      </section>

      {/* ────────────────────── How it works ─────────────────────── */}
      <Section title={t('how.title')} subtitle={t('how.subtitle')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEP_KEYS.map((step, i) => (
            <div key={step} className="card-soft card-soft-lift p-5">
              <div
                className={`grid h-9 w-9 place-items-center rounded-full ${STEP_ICON_STYLES[i]}`}
              >
                {STEP_ICONS[i]}
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">
                {t(`how.${step}.title`)}
              </h3>
              <p className="mt-2 text-sm text-slate-500">{t(`how.${step}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ──────────────────── Booster packages ───────────────────── */}
      <section className="band-soft">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            {t('boosters.title')}
          </h2>
          <p className="mb-10 mt-2 text-slate-600">{t('boosters.subtitle')}</p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BOOSTERS.map((b) => (
              <div
                key={b.price}
                className={`card-chunky p-5 text-center ${
                  b.popular ? 'card-chunky--brand text-white' : 'bg-white text-slate-900'
                }`}
              >
                {b.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#312e81] bg-[#1e1b4b] px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-indigo-200">
                    Most picked
                  </span>
                )}
                <div className="text-3xl font-extrabold">${b.price}</div>
                <div
                  className={`mt-3 text-sm ${b.popular ? 'text-indigo-100' : 'text-slate-500'}`}
                >
                  {t('boosters.resultingRate')}
                </div>
                <div className="text-xl font-bold">{b.rate} /h</div>
                <div
                  className={`mt-4 border-t-2 pt-3 text-xs ${
                    b.popular
                      ? 'border-white/20 text-indigo-100'
                      : 'border-slate-900/10 text-slate-500'
                  }`}
                >
                  {t('boosters.terms')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Referrals ───────────────────────── */}
      <Section title={t('referrals.title')} subtitle={t('referrals.subtitle')}>
        <div className="card-soft overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr>
                <th className="p-4">{t('referrals.invited')}</th>
                <th className="p-4">{t('referrals.level')}</th>
                <th className="p-4">{t('referrals.multiplier')}</th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((tier) => (
                <tr
                  key={tier.level}
                  className="border-t border-slate-100 transition hover:bg-indigo-50/40"
                >
                  <td className="p-4">{tier.invites}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                      L{tier.level}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-indigo-600">
                    ×{tier.multiplier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ───────────────────────── Tasks ─────────────────────────── */}
      <section className="band-soft">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">
            {t('tasksSection.title')}
          </h2>
          <p className="mb-8 mt-2 text-slate-600">{t('tasksSection.subtitle')}</p>
          <div className="flex flex-wrap gap-3">
            {TASK_KEYS.map((key) => (
              <span
                key={key}
                className="flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:text-indigo-600"
              >
                <span aria-hidden>{TASK_ICONS[key]}</span>
                {tasks(key)}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Withdrawals ─────────────────────── */}
      <Section title={t('withdrawals.title')} subtitle={t('withdrawals.subtitle')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['minimum', 'frequency', 'kyc', 'approval'].map((rule) => (
            <div key={rule} className="card-soft p-5">
              <h3 className="font-semibold text-indigo-600">
                {t(`withdrawals.${rule}.title`)}
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {t(`withdrawals.${rule}.body`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-gradient-to-br from-indigo-600 via-violet-600 to-blue-600 py-20 text-white">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-4xl font-extrabold sm:text-5xl">{t('cta.title')}</h2>
          <p className="mx-auto mt-4 max-w-xl text-indigo-100">{t('cta.body')}</p>
          <AuthAwareCta
            locale={locale}
            href={register}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3 font-semibold text-indigo-700 shadow-lg transition hover:-translate-y-0.5"
            label={t('cta.button')}
            dashboardLabel={t('nav.dashboard')}
          />
        </div>
      </section>

      <footer className="bg-slate-50 px-5 py-8 text-center text-xs text-slate-500">
        <p className="mx-auto max-w-2xl">{t('footer.disclaimer')}</p>
        <p className="mt-3">{t('footer.copyright')}</p>
      </footer>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-14">
      <h2 className="text-3xl font-extrabold text-slate-900 sm:text-4xl">{title}</h2>
      <p className="mb-8 mt-2 text-slate-600">{subtitle}</p>
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="card-soft card-soft-lift p-5">
      <div className="text-2xl font-extrabold text-indigo-600">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-500">{label}</div>
    </div>
  );
}

/** A small faceted "block" — stands in for a chain/block icon without
 *  reproducing any real network's logo. Same layered-gradient technique as
 *  the hero coin, just square. */
function ChainCube() {
  return (
    <div className="relative grid h-32 w-32 shrink-0 place-items-center">
      <div className="orbit h-28 w-28 opacity-70" aria-hidden>
        <span className="orbit-particle" />
      </div>
      <div
        className="relative grid h-20 w-20 place-items-center rounded-2xl"
        style={{
          background:
            'radial-gradient(120% 120% at 26% 20%, rgba(255,255,255,.55), rgba(255,255,255,0) 45%), linear-gradient(145deg, #2b2b2b 0%, #14161c 100%)',
          boxShadow:
            'inset 0.3rem 0.4rem 0.9rem rgba(255,255,255,.14), inset -0.4rem -0.5rem 1rem rgba(0,0,0,.5), 0 1rem 2rem rgba(240,185,11,.25)',
        }}
      >
        <BnbLogo className="h-9 w-9 text-[#f0b90b]" />
      </div>
      <span className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-white text-indigo-600 shadow-md ring-1 ring-indigo-100">
        <IconShield className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

const STEP_ICON_STYLES = [
  'bg-blue-100 text-blue-600',
  'bg-violet-100 text-violet-600',
  'bg-emerald-100 text-emerald-600',
  'bg-orange-100 text-orange-600',
];

const STEP_ICONS = [
  <IconCalendarCheck key="cal" className="h-4 w-4" />,
  <IconRocket key="rocket" className="h-4 w-4" />,
  <IconUsers key="users" className="h-4 w-4" />,
  <IconWallet key="wallet" className="h-4 w-4" />,
];

function IconCalendarCheck({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm3.5 8 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRocket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2c3 2 5 6 5 10 0 1.5-.3 2.9-.8 4l-2.2-1c.5-1 .8-2 .8-3 0-3-1.5-6-2.8-7.5C10.7 5.9 9 8.7 9 12c0 1 .3 2 .8 3l-2.2 1c-.5-1.1-.8-2.5-.8-4 0-4 2-8 5-10Zm-3 15 1.5 3H8l-1-2 2-1Zm6 0 2 1-1 2h-2.5l1.5-3Z" />
    </svg>
  );
}

function IconUsers({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-8 1.7-8 5v2h16v-2c0-3.3-4.7-5-8-5Zm7.5-3.5A3.5 3.5 0 1 0 16.5 3a3.5 3.5 0 0 0 0 7Zm.6 2.1c1.2.6 2.9 2 2.9 3.9v3H23v-3c0-2.7-2.5-3.5-5.9-3.9Z" />
    </svg>
  );
}

function IconWallet({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M3 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M15 13.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconShield({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="m12 3 7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
