import React, { createContext, useContext, useMemo } from 'react';
import { getLocales } from 'expo-localization';
import en from './messages/en.json';
import zh from './messages/zh.json';
import ko from './messages/ko.json';
import { mobileStrings } from './mobile-strings';
import { useSettings } from '../store/settings';

/**
 * Translation lookup.
 *
 * The web app's message catalogue is reused as-is (`messages/*.json`, 536 keys
 * in three languages) and merged with the mobile-only namespaces, so every
 * string the product already had is available here under the same key.
 */

export const LOCALES = ['en', 'zh', 'ko'] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, { label: string; english: string; flag: string }> = {
  en: { label: 'English', english: 'English', flag: '🇬🇧' },
  zh: { label: '简体中文', english: 'Chinese', flag: '🇨🇳' },
  ko: { label: '한국어', english: 'Korean', flag: '🇰🇷' },
};

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Recursive merge — a namespace that exists in both catalogues (`auth` does)
 * keeps the web keys and gains the mobile ones. A shallow spread would replace
 * the whole namespace and leave the web strings unreachable.
 */
function mergeDicts(base: Dict, extra: Dict): Dict {
  const out: Dict = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const current = out[key];
    out[key] =
      isDict(current) && isDict(value) ? mergeDicts(current, value) : value;
  }
  return out;
}

const CATALOGUE: Record<Locale, Dict> = {
  en: mergeDicts(en as Dict, mobileStrings.en),
  zh: mergeDicts(zh as Dict, mobileStrings.zh),
  ko: mergeDicts(ko as Dict, mobileStrings.ko),
};

function lookup(dict: Dict, path: string): string | undefined {
  const value = path
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Dict | undefined)?.[key], dict);
  return typeof value === 'string' ? value : undefined;
}

/** Replaces `{name}` placeholders. Missing values are left visible, not blank. */
function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

export type Translate = (
  key: string,
  values?: Record<string, string | number>,
) => string;

interface I18nContextValue {
  locale: Locale;
  t: Translate;
  /** Language actually chosen in Settings ('system' resolves via the OS). */
  isSystemLocale: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** The device language, if we speak it. Falls back to English. */
export function systemLocale(): Locale {
  const tags = getLocales();
  for (const { languageCode } of tags) {
    if (!languageCode) continue;
    const short = languageCode.toLowerCase();
    if (LOCALES.includes(short as Locale)) return short as Locale;
  }
  return 'en';
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  const locale: Locale =
    settings.locale === 'system' ? systemLocale() : settings.locale;

  const value = useMemo<I18nContextValue>(() => {
    const dict = CATALOGUE[locale];
    const fallback = CATALOGUE.en;
    return {
      locale,
      isSystemLocale: settings.locale === 'system',
      t: (key, values) => {
        // Fall through to English rather than showing a raw key: a missing
        // translation should degrade to a readable string, not to debug output.
        const raw = lookup(dict, key) ?? lookup(fallback, key) ?? key;
        return interpolate(raw, values);
      },
    };
  }, [locale, settings.locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Shorthand for components that only need the lookup function. */
export function useT(): Translate {
  return useI18n().t;
}
