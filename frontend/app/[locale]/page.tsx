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

  return (
    <div className="glow-field min-h-screen">
      {/* ─────────────────────────── Nav ─────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-slate-900/80 bg-slate-950/70 backdrop-blur">
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
              {t('nav.getStarted')}
            </Link>
          </nav>
        </div>
      </header>

      {/* ────────────────────────── Hero ─────────────────────────── */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-12 md:grid-cols-2 md:py-20">
        <div>
          <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs uppercase tracking-wide text-amber-300">
            {t('hero.badge')}
          </span>
          <h1 className="mt-5 text-4xl font-extrabold leading-tight sm:text-5xl">
            {t('hero.title')}{' '}
            <span className="bg-gradient-to-r from-amber-200 to-amber-500 bg-clip-text text-transparent">
              {t('hero.titleAccent')}
            </span>
          </h1>
          <p className="mt-5 text-lg text-slate-300">{t('hero.subtitle')}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={register} className="btn-primary px-6 py-3">
              {t('hero.ctaPrimary')}
            </Link>
            <Link href={signIn} className="btn-secondary px-6 py-3">
              {t('hero.ctaSecondary')}
            </Link>
          </div>

          <p className="mt-5 flex items-start gap-2 text-xs text-slate-400">
            <span aria-hidden>ⓘ</span>
            {t('hero.honesty')}
          </p>
        </div>

        <Coin3D />
      </section>

      {/* ───────────────────── Key numbers strip ─────────────────── */}
      <section className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-5 lg:grid-cols-4">
        <Figure value="0.9 /h" label={t('figures.baseRate')} />
        <Figure value="3 : 1" label={t('figures.conversion')} />
        <Figure value="100" label={t('figures.minWithdrawal')} />
        <Figure value="30d" label={t('figures.boosterDuration')} />
      </section>

      {/* ────────────────────── How it works ─────────────────────── */}
      <Section title={t('how.title')} subtitle={t('how.subtitle')}>
        <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
      <Section title={t('boosters.title')} subtitle={t('boosters.subtitle')}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BOOSTERS.map((b) => (
            <div
              key={b.price}
              className={`card card-lift relative p-5 text-center ${
                b.popular ? 'border-amber-500/60' : ''
              }`}
            >
              {b.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-slate-900">
                  ★
                </span>
              )}
              <div className="text-3xl font-extrabold text-amber-400">
                ${b.price}
              </div>
              <div className="mt-3 text-sm text-slate-400">
                {t('boosters.resultingRate')}
              </div>
              <div className="text-xl font-bold">{b.rate} /h</div>
              <div className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-400">
                {t('boosters.terms')}
              </div>
            </div>
          ))}
        </div>
      </Section>

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
      <Section title={t('tasksSection.title')} subtitle={t('tasksSection.subtitle')}>
        <div className="flex flex-wrap gap-3">
          {TASK_KEYS.map((key) => (
            <span
              key={key}
              className="card card-lift flex items-center gap-2 rounded-full px-4 py-2 text-sm"
            >
              <span aria-hidden>{TASK_ICONS[key]}</span>
              {tasks(key)}
            </span>
          ))}
        </div>
      </Section>

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
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="card relative overflow-hidden p-8 text-center sm:p-12">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_20rem_at_50%_-20%,rgba(245,158,11,0.16),transparent_60%)]"
          />
          <h2 className="relative text-3xl font-extrabold">{t('cta.title')}</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-slate-400">
            {t('cta.body')}
          </p>
          <Link href={register} className="btn-primary relative mt-8 inline-block px-8 py-3">
            {t('cta.button')}
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-900 px-5 py-8 text-center text-xs text-slate-500">
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
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mb-8 mt-2 text-slate-400">{subtitle}</p>
      {children}
    </section>
  );
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="card card-lift p-5">
      <div className="text-2xl font-extrabold text-amber-400">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wide text-slate-400">
        {label}
      </div>
    </div>
  );
}
