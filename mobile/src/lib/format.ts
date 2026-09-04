import type { Locale } from '../i18n';

/** Number and date formatting, all locale-aware and all in one place. */

export function formatPoints(value: number, decimals = 2, locale = 'en'): string {
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compact form for tight rows: 12.4K, 3.1M. */
export function formatCompact(value: number, locale = 'en'): string {
  if (Math.abs(value) < 10_000) return formatPoints(value, value % 1 === 0 ? 0 : 2, locale);
  return value.toLocaleString(locale, {
    notation: 'compact',
    maximumFractionDigits: 1,
  });
}

export function formatUsd(value: number, locale = 'en'): string {
  return value.toLocaleString(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** hh:mm:ss remaining until `iso`, or null once it has passed. */
export function countdownLabel(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const s = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Coarse "4h 12m" form, for cards where a ticking clock would be noise. */
export function coarseCountdown(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return null;
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function daysUntil(iso: string, now = Date.now()): number {
  return Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 86_400_000));
}

export function formatDate(iso: string, locale: Locale | string = 'en'): string {
  return new Date(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string, locale: Locale | string = 'en'): string {
  return new Date(iso).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(iso: string, locale: Locale | string = 'en'): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * "3m ago" / "2h ago" / a date once it is older than a week. Takes the
 * translator so the units stay localised.
 */
export function relativeTime(
  iso: string,
  t: (key: string, values?: Record<string, string | number>) => string,
  locale: Locale | string = 'en',
  now = Date.now(),
): string {
  const diff = now - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return t('app.justNow');
  if (minutes < 60) return t('app.minutesAgo', { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('app.hoursAgo', { n: hours });
  const days = Math.floor(hours / 24);
  if (days <= 7) return t('app.daysAgo', { n: days });
  return formatDate(iso, locale);
}

/** 0x1234…abcd — enough to eyeball, short enough for a row. */
export function shortAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 1) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

/** Loose shape check only — the server validates the address for real. */
export const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
export const TX_HASH_RE = /^0x[a-fA-F0-9]{64}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** 🇳🇵 from "NP" — regional-indicator letters, no image assets. */
export function countryFlag(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return '';
  return String.fromCodePoint(
    ...code
      .toUpperCase()
      .split('')
      .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
}

/** Country name in the UI language, falling back to the raw code. */
export function countryName(code: string, locale = 'en'): string {
  if (!code) return '';
  try {
    return (
      new Intl.DisplayNames([locale], { type: 'region' }).of(
        code.toUpperCase(),
      ) ?? code
    );
  } catch {
    return code;
  }
}
