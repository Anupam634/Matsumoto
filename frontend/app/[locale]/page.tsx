import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Coin3D } from '../../components/Coin3D';
import { locales } from '../../i18n';

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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* ─────────────────────────── Nav ─────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 p-5">
          <span className="flex items-center gap-2 font-bold">
            <span className="logo-badge">M</span>
            Matsumoto
          </span>

          <nav className="flex items-center gap-4 text-sm">
            <div className="hidden gap-1 rounded-full border border-slate-800 p-1 sm:flex">
              {locales.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  className={
                    l === locale
                      ? 'rounded-full bg-amber-500/15 px-2.5 py-1 text-amber-400'
                      : 'rounded-full px-2.5 py-1 text-slate-400 hover:text-slate-200'
                  }
                >
                  {LOCALE_LABELS[l]}
                </Link>
              ))}
            </div>
            <Link href={signIn} className="text-slate-300 hover:text-amber-400">
              {t('nav.signIn')}
            </Link>
            <Link href={register} className="btn-primary px-4 py-2 text-sm">
              {t('nav.getStarted')} →
            </Link>
          </nav>
        </div>
      </header>

      {/* ────────────────────────── Hero ─────────────────────────── */}
      <section className="glow-field">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-14 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-300">
              {t('hero.badge')}
            </span>
            <h1 className="mt-5 font-serif text-5xl font-medium leading-[1.05] tracking-tight sm:text-6xl">
              {t('hero.title')}{' '}
              <span className="italic text-amber-400">
                {t('hero.titleAccent')}
              </span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-300">
              {t('hero.subtitle')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={register} className="btn-primary px-6 py-3">
                {t('hero.ctaPrimary')} →
              </Link>
              <Link href={signIn} className="btn-secondary px-6 py-3">
                {t('hero.ctaSecondary')}
              </Link>
            </div>

            <p className="mt-6 flex items-start gap-2 text-xs text-slate-400">
              <span aria-hidden>ⓘ</span>
              {t('hero.honesty')}
            </p>
          </div>

          <Coin3D />
        </div>
      </section>

      {/* ──────────────────────── Fact ticker ─────────────────────── */}
      <div className="border-y border-white/5 bg-slate-900/70 py-3">
        <div className="marquee">
          <div className="marquee-track">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0 items-center">
                {tickerItems.map((item, i) => (
                  <span
                    key={`${copy}-${i}`}
                    className="flex items-center gap-3 px-6 text-xs font-semibold uppercase tracking-wide text-slate-400"
                  >
                    {item}
                    <span className="text-amber-500" aria-hidden>
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
      <section className="band-cream">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 py-12 lg:grid-cols-4">
          <Figure value="0.9 /h" label={t('figures.baseRate')} />
          <Figure value="3 : 1" label={t('figures.conversion')} />
          <Figure value="100" label={t('figures.minWithdrawal')} />
          <Figure value="30d" label={t('figures.boosterDuration')} />
        </div>
      </section>

      {/* ────────────────────── How it works ─────────────────────── */}
      <Section title={t('how.title')} subtitle={t('how.subtitle')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {['register', 'mine', 'boost', 'withdraw'].map((step, i) => (
            <div key={step} className="card card-lift p-5">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-amber-500/15 font-bold text-amber-400">
                {i + 1}
              </div>
              <h3 className="mt-4 font-semibold">{t(`how.${step}.title`)}</h3>
              <p className="mt-2 text-sm text-slate-400">
                {t(`how.${step}.body`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ──────────────────── Booster packages ───────────────────── */}
      <section className="band-cream">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-serif text-3xl font-medium sm:text-4xl">
            {t('boosters.title')}
          </h2>
          <p className="mb-10 mt-2 text-[#5c5346]">{t('boosters.subtitle')}</p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BOOSTERS.map((b) => (
              <div
                key={b.price}
                className={`card-chunky p-5 text-center ${
                  b.popular ? 'bg-amber-400' : 'bg-white'
                }`}
              >
                {b.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border-2 border-[#17130a] bg-[#17130a] px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-300">
                    Most picked
                  </span>
                )}
                <div className="text-3xl font-extrabold text-[#17130a]">
                  ${b.price}
                </div>
                <div className="mt-3 text-sm text-[#5c5346]">
                  {t('boosters.resultingRate')}
                </div>
                <div className="text-xl font-bold text-[#17130a]">
                  {b.rate} /h
                </div>
                <div className="mt-4 border-t-2 border-[#17130a]/15 pt-3 text-xs text-[#5c5346]">
                  {t('boosters.terms')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────── Referrals ───────────────────────── */}
      <Section title={t('referrals.title')} subtitle={t('referrals.subtitle')}>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[28rem] text-left text-sm">
            <thead className="text-xs uppercase text-slate-400">
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
                  className="border-t border-slate-800 transition hover:bg-slate-900/40"
                >
                  <td className="p-4">{tier.invites}</td>
                  <td className="p-4">
                    <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-400">
                      L{tier.level}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-amber-400">
                    ×{tier.multiplier}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* ───────────────────────── Tasks ─────────────────────────── */}
      <section className="band-cream">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="font-serif text-3xl font-medium sm:text-4xl">
            {t('tasksSection.title')}
          </h2>
          <p className="mb-8 mt-2 text-[#5c5346]">
            {t('tasksSection.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            {TASK_KEYS.map((key) => (
              <span
                key={key}
                className="flex items-center gap-2 rounded-full border-2 border-[#17130a] bg-white px-4 py-2 text-sm font-medium text-[#17130a] transition hover:-translate-y-0.5 hover:bg-amber-300"
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
            <div key={rule} className="card p-5">
              <h3 className="font-semibold text-amber-400">
                {t(`withdrawals.${rule}.title`)}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {t(`withdrawals.${rule}.body`)}
              </p>
            </div>
          ))}
        </div>
      </Section>

      {/* ─────────────────────── Final CTA ───────────────────────── */}
      <section className="bg-amber-400 py-20 text-[#17130a]">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="font-serif text-4xl font-medium sm:text-5xl">
            {t('cta.title')}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#4a3f1f]">{t('cta.body')}</p>
          <Link href={register} className="btn-dark mt-8">
            {t('cta.button')} →
          </Link>
        </div>
      </section>

      <footer className="bg-slate-950 px-5 py-8 text-center text-xs text-slate-500">
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
      <h2 className="font-serif text-3xl font-medium sm:text-4xl">{title}</h2>
      <p className="mb-8 mt-2 text-slate-400">{subtitle}</p>
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="card card-lift p-5">
      <div className="text-2xl font-extrabold text-amber-600">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-[#5c5346]">
        {label}
      </div>
    </div>
  );
}
