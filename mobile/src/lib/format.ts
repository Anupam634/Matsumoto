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
  try {
    const out = value.toLocaleString(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    // Some Hermes builds accept the option and quietly ignore it, handing
    // back the full number — treat that the same as an outright throw.
    if (/[^\d.,\s -]/.test(out)) return out;
  } catch {
    /* fall through to the manual scale below */
  }
  const abs = Math.abs(value);
  const scaled =
    abs >= 1e9
      ? [value / 1e9, 'B']
      : abs >= 1e6
        ? [value / 1e6, 'M']
        : [value / 1e3, 'K'];
  const [n, unit] = scaled as [number, string];
  return `${formatPoints(n, n % 1 === 0 ? 0 : 1, locale)}${unit}`;
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

/**
 * English fallback for `countryName`, used where `Intl.DisplayNames` is
 * missing (Hermes on Android ships without it). Compact on purpose: one
 * `CODE:Name` pair per entry, parsed once on first use.
 */
const COUNTRY_NAMES_EN =
  'AD:Andorra|AE:United Arab Emirates|AF:Afghanistan|AG:Antigua & Barbuda|AI:Anguilla|' +
  'AL:Albania|AM:Armenia|AO:Angola|AR:Argentina|AS:American Samoa|AT:Austria|AU:Australia|' +
  'AW:Aruba|AX:Åland Islands|AZ:Azerbaijan|BA:Bosnia & Herzegovina|BB:Barbados|BD:Bangladesh|' +
  'BE:Belgium|BF:Burkina Faso|BG:Bulgaria|BH:Bahrain|BI:Burundi|BJ:Benin|BL:St. Barthélemy|' +
  'BM:Bermuda|BN:Brunei|BO:Bolivia|BQ:Caribbean Netherlands|BR:Brazil|BS:Bahamas|BT:Bhutan|' +
  'BW:Botswana|BY:Belarus|BZ:Belize|CA:Canada|CC:Cocos (Keeling) Islands|CD:Congo - Kinshasa|' +
  'CF:Central African Republic|CG:Congo - Brazzaville|CH:Switzerland|CI:Côte d’Ivoire|' +
  'CK:Cook Islands|CL:Chile|CM:Cameroon|CN:China|CO:Colombia|CQ:Sark|CR:Costa Rica|CU:Cuba|' +
  'CV:Cape Verde|CW:Curaçao|CX:Christmas Island|CY:Cyprus|CZ:Czechia|DE:Germany|DJ:Djibouti|' +
  'DK:Denmark|DM:Dominica|DO:Dominican Republic|DY:Dahomey|DZ:Algeria|EC:Ecuador|EE:Estonia|' +
  'EG:Egypt|EH:Western Sahara|ER:Eritrea|ES:Spain|ET:Ethiopia|FI:Finland|FJ:Fiji|' +
  'FK:Falkland Islands|FM:Micronesia|FO:Faroe Islands|FR:France|GA:Gabon|GB:United Kingdom|' +
  'GD:Grenada|GE:Georgia|GF:French Guiana|GG:Guernsey|GH:Ghana|GI:Gibraltar|GL:Greenland|' +
  'GM:Gambia|GN:Guinea|GP:Guadeloupe|GQ:Equatorial Guinea|GR:Greece|' +
  'GS:South Georgia & South Sandwich Islands|GT:Guatemala|GU:Guam|GW:Guinea-Bissau|GY:Guyana|' +
  'HK:Hong Kong|HN:Honduras|HR:Croatia|HT:Haiti|HU:Hungary|HV:Upper Volta|ID:Indonesia|' +
  'IE:Ireland|IL:Israel|IM:Isle of Man|IN:India|IO:British Indian Ocean Territory|IQ:Iraq|' +
  'IR:Iran|IS:Iceland|IT:Italy|JE:Jersey|JM:Jamaica|JO:Jordan|JP:Japan|KE:Kenya|' +
  'KG:Kyrgyzstan|KH:Cambodia|KI:Kiribati|KM:Comoros|KN:St. Kitts & Nevis|KP:North Korea|' +
  'KR:South Korea|KW:Kuwait|KY:Cayman Islands|KZ:Kazakhstan|LA:Laos|LB:Lebanon|LC:St. Lucia|' +
  'LI:Liechtenstein|LK:Sri Lanka|LR:Liberia|LS:Lesotho|LT:Lithuania|LU:Luxembourg|LV:Latvia|' +
  'LY:Libya|MA:Morocco|MC:Monaco|MD:Moldova|ME:Montenegro|MF:St. Martin|MG:Madagascar|' +
  'MH:Marshall Islands|MK:North Macedonia|ML:Mali|MM:Myanmar|MN:Mongolia|MO:Macao|' +
  'MP:Northern Mariana Islands|MQ:Martinique|MR:Mauritania|MS:Montserrat|MT:Malta|' +
  'MU:Mauritius|MV:Maldives|MW:Malawi|MX:Mexico|MY:Malaysia|MZ:Mozambique|NA:Namibia|' +
  'NC:New Caledonia|NE:Niger|NF:Norfolk Island|NG:Nigeria|NH:New Hebrides|NI:Nicaragua|' +
  'NL:Netherlands|NO:Norway|NP:Nepal|NR:Nauru|NU:Niue|NZ:New Zealand|OM:Oman|PA:Panama|' +
  'PE:Peru|PF:French Polynesia|PG:Papua New Guinea|PH:Philippines|PK:Pakistan|PL:Poland|' +
  'PM:St. Pierre & Miquelon|PN:Pitcairn Islands|PR:Puerto Rico|PS:Palestine|PT:Portugal|' +
  'PW:Palau|PY:Paraguay|QA:Qatar|RE:Réunion|RH:Rhodesia|RO:Romania|RS:Serbia|RU:Russia|' +
  'RW:Rwanda|SA:Saudi Arabia|SB:Solomon Islands|SC:Seychelles|SD:Sudan|SE:Sweden|' +
  'SG:Singapore|SH:St. Helena|SI:Slovenia|SJ:Svalbard & Jan Mayen|SK:Slovakia|' +
  'SL:Sierra Leone|SM:San Marino|SN:Senegal|SO:Somalia|SR:Suriname|SS:South Sudan|' +
  'ST:São Tomé & Príncipe|SV:El Salvador|SX:Sint Maarten|SY:Syria|SZ:Eswatini|' +
  'TC:Turks & Caicos Islands|TD:Chad|TF:French Southern Territories|TG:Togo|TH:Thailand|' +
  'TJ:Tajikistan|TK:Tokelau|TL:Timor-Leste|TM:Turkmenistan|TN:Tunisia|TO:Tonga|TR:Türkiye|' +
  'TT:Trinidad & Tobago|TV:Tuvalu|TW:Taiwan|TZ:Tanzania|UA:Ukraine|UG:Uganda|' +
  'UK:United Kingdom|UM:U.S. Outlying Islands|US:United States|UY:Uruguay|UZ:Uzbekistan|' +
  'VA:Vatican City|VC:St. Vincent & Grenadines|VD:North Vietnam|VE:Venezuela|' +
  'VG:British Virgin Islands|VI:U.S. Virgin Islands|VN:Vietnam|VU:Vanuatu|' +
  'WF:Wallis & Futuna|WS:Samoa|XK:Kosovo|YD:South Yemen|YE:Yemen|YT:Mayotte|' +
  'ZA:South Africa|ZM:Zambia|ZW:Zimbabwe';

let countryNamesEn: Map<string, string> | null = null;

function fallbackCountryName(code: string): string {
  if (!countryNamesEn) {
    countryNamesEn = new Map(
      COUNTRY_NAMES_EN.split('|').map((pair) => {
        const i = pair.indexOf(':');
        return [pair.slice(0, i), pair.slice(i + 1)] as const;
      }),
    );
  }
  return countryNamesEn.get(code) ?? code;
}

/**
 * Country name in the UI language via `Intl.DisplayNames`, falling back to
 * English where the engine lacks it (or throws), and to the raw code last.
 */
export function countryName(code: string, locale = 'en'): string {
  if (!code) return '';
  const upper = code.toUpperCase();
  if (typeof Intl.DisplayNames === 'function') {
    try {
      const name = new Intl.DisplayNames([locale], { type: 'region' }).of(upper);
      // Some engines echo the code back instead of throwing for an unknown one.
      if (name && name !== upper) return name;
    } catch {
      /* unsupported locale or malformed code — fall through */
    }
  }
  return fallbackCountryName(upper);
}
