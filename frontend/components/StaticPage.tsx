import Link from 'next/link';
import { LogoMark } from './Logo';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

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
    <div className="glow-field min-h-dvh bg-slate-950 bg-cyber-grid text-slate-100 selection:bg-amber-500 selection:text-slate-950">
      <header className="sticky top-0 z-10 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div
          className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-5 py-4"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <Link
            href={`/${locale}`}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 transition hover:text-amber-400"
          >
            ← {backLabel}
          </Link>
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            <LocaleSwitcher locale={locale} />
            <LogoMark size={32} />
          </div>
        </div>
      </header>

      <main
        className="mx-auto max-w-4xl px-5 pb-20 pt-10"
        style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}
      >
        <h1 className="text-3xl font-black tracking-tight sm:text-5xl text-slate-100">
          {title}
        </h1>
        {intro && <p className="mt-3 text-base text-slate-400">{intro}</p>}
        {updated && (
          <p className="mt-2 text-xs uppercase tracking-wide text-amber-400/80 font-mono">
            {updated}
          </p>
        )}
        <div className="mt-10 card border-slate-800 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-xl">
          {children}
        </div>
      </main>
    </div>
  );
}

/** One titled block of prose. Bodies may contain blank-line paragraphs. */
export function Article({ title, body }: { title: string; body: string }) {
  return (
    <section className="border-t border-slate-800 py-6 first:border-t-0 first:pt-0">
      <h2 className="text-lg font-bold text-amber-400">{title}</h2>
      {body.split('\n\n').map((para, i) => (
        <p key={i} className="mt-2.5 text-sm leading-relaxed text-slate-300">
          {para}
        </p>
      ))}
    </section>
  );
}
