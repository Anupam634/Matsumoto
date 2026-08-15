import Link from 'next/link';
import { LogoMark } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';

/**
 * Shell for the public reading pages (FAQ, terms, privacy).
 *
 * These are reachable signed out, so the header goes home rather than to the
 * dashboard, and the light surface matches the landing page rather than the
 * dark signed-in shell.
 */
export function StaticPage({
  locale,
  title,
  intro,
  backLabel,
  updated,
  children,
}: {
  locale: string;
  title: string;
  intro?: string;
  backLabel: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-white text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/85 backdrop-blur">
        <div
          className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-indigo-600"
          >
            ← {backLabel}
          </Link>
          <span className="flex items-center gap-2.5">
            <LocaleSwitcher locale={locale} />
            <LogoMark size={32} />
          </span>
        </div>
      </header>

      <main
        className="mx-auto max-w-3xl px-5 pb-20 pt-8"
        style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {intro && <p className="mt-3 text-slate-600">{intro}</p>}
        {updated && (
          <p className="mt-2 text-xs uppercase tracking-wide text-slate-400">
            {updated}
          </p>
        )}
        <div className="mt-8">{children}</div>
      </main>
    </div>
  );
}

/** One titled block of prose. Bodies may contain blank-line paragraphs. */
export function Article({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-t border-slate-200 py-5 first:border-t-0 first:pt-0">
      <h2 className="font-bold text-slate-900">{title}</h2>
      {body.split('\n\n').map((para, i) => (
        <p key={i} className="mt-2 text-sm leading-relaxed text-slate-600">
          {para}
        </p>
      ))}
    </section>
  );
}
