import { COUNTRY_CODES } from './countries-data';

export { COUNTRY_CODES, isCountryCode } from './countries-data';
export type { CountryCode } from './countries-data';

/**
 * Country name in the given UI language, falling back to the raw code if the
 * runtime doesn't know it. `Intl.DisplayNames` means we never ship (or have
 * to translate) 255 names × 3 locales by hand.
 */
export function countryName(code: string, locale = 'en'): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(
      code.toUpperCase(),
    ) ?? code;
  } catch {
    return code;
  }
}

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

/** All countries, sorted by name in the given language. */
export function countryOptions(
  locale = 'en',
): { code: string; name: string; flag: string }[] {
  const collator = new Intl.Collator(locale);
  return COUNTRY_CODES.map((code) => ({
    code,
    name: countryName(code, locale),
    flag: countryFlag(code),
  })).sort((a, b) => collator.compare(a.name, b.name));
}
