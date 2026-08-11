'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales } from '../i18n';

const LABELS: Record<string, string> = {
  en: 'EN',
  zh: '中文',
  ko: '한국어',
};

/**
 * Language picker, available on every screen rather than only the landing
 * page.
 *
 * A native <select> for the same reason CountrySelect uses one: it brings its
 * own keyboard handling and the OS picker on mobile, which beats a hand-rolled
 * menu squeezed into a header. The visible label is drawn separately so the
 * control can stay narrow while the select itself covers it for hit testing.
 */
export function LocaleSwitcher({ locale }: { locale: string }) {
  const router = useRouter();
  const pathname = usePathname();

  function switchTo(next: string) {
    if (next === locale) return;
    // Stay on the page the reader is already on — /en/boosters becomes
    // /zh/boosters, not the home page.
    const rest = pathname.split('/').slice(2).join('/');
    // Read the query directly rather than through useSearchParams, which
    // would opt these statically rendered pages into dynamic rendering.
    const search = typeof window === 'undefined' ? '' : window.location.search;
    router.replace(`/${next}${rest ? `/${rest}` : ''}${search}`);
  }

  return (
    <span className="locale-switch">
      <IconGlobe />
      <span className="hidden sm:inline" aria-hidden>
        {LABELS[locale] ?? locale.toUpperCase()}
      </span>
      <select
        value={locale}
        onChange={(e) => switchTo(e.target.value)}
        aria-label="Language"
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {LABELS[l]}
          </option>
        ))}
      </select>
    </span>
  );
}

function IconGlobe() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}
