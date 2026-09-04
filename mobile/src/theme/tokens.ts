import { Platform } from 'react-native';

/**
 * Design tokens.
 *
 * Two palettes — light and dark — sharing one set of semantic names, so every
 * component reads `c.textPrimary` and never a raw hex. Brand hues come from the
 * web app (sapphire #2563EB, gold #F59E0B); everything around them is neutral,
 * which is what keeps a crypto product from looking like a casino.
 */

const brand = {
  sapphire: '#2563EB',
  sapphireDeep: '#1D4ED8',
  indigo: '#6366F1',
  cyan: '#06B6D4',
  gold: '#F59E0B',
  goldSoft: '#FBBF24',
  emerald: '#10B981',
  rose: '#F43F5E',
  amber: '#D97706',
};

export interface Palette {
  /** Page background, behind everything. */
  bg: string;
  /** Slightly recessed ground for grouped lists (iOS "grouped" style). */
  bgSunken: string;
  /** Card / sheet surface. */
  surface: string;
  /** A surface resting on a surface (inset rows, chips). */
  surfaceAlt: string;
  /** Translucent chrome — headers, tab bars. */
  chrome: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  textInverse: string;
  primary: string;
  primaryPressed: string;
  primaryMuted: string;
  onPrimary: string;
  gold: string;
  goldMuted: string;
  onGold: string;
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  info: string;
  infoMuted: string;
  /** Skeleton shimmer base. */
  skeleton: string;
  shadow: string;
  scrim: string;
}

export const lightPalette: Palette = {
  bg: '#FFFFFF',
  bgSunken: '#F5F6F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F2F4F7',
  chrome: 'rgba(255,255,255,0.86)',
  border: '#E6E8EC',
  borderStrong: '#D3D7DE',
  textPrimary: '#12131A',
  textSecondary: '#5A6070',
  textTertiary: '#8A90A0',
  textInverse: '#FFFFFF',
  primary: brand.sapphire,
  primaryPressed: brand.sapphireDeep,
  primaryMuted: '#EAF1FE',
  onPrimary: '#FFFFFF',
  gold: brand.amber,
  goldMuted: '#FEF3E2',
  onGold: '#3A2606',
  success: '#0E9F6E',
  successMuted: '#E6F7F0',
  warning: '#B45309',
  warningMuted: '#FEF4E6',
  danger: '#DC2626',
  dangerMuted: '#FDECEC',
  info: '#0E7490',
  infoMuted: '#E4F5F8',
  skeleton: '#EDEFF3',
  shadow: '#0B1220',
  scrim: 'rgba(11,18,32,0.45)',
};

export const darkPalette: Palette = {
  bg: '#0B1220',
  bgSunken: '#080D18',
  surface: '#141C2C',
  surfaceAlt: '#1C2637',
  chrome: 'rgba(11,18,32,0.82)',
  border: '#243047',
  borderStrong: '#33415C',
  textPrimary: '#F4F6FA',
  textSecondary: '#9AA5B8',
  textTertiary: '#6C7891',
  textInverse: '#0B1220',
  primary: '#5B8DEF',
  primaryPressed: '#4979DB',
  primaryMuted: 'rgba(91,141,239,0.14)',
  onPrimary: '#FFFFFF',
  gold: brand.goldSoft,
  goldMuted: 'rgba(251,191,36,0.14)',
  onGold: '#2A1B02',
  success: '#34D399',
  successMuted: 'rgba(52,211,153,0.14)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251,191,36,0.14)',
  danger: '#FB7185',
  dangerMuted: 'rgba(251,113,133,0.14)',
  info: '#38BDF8',
  infoMuted: 'rgba(56,189,248,0.14)',
  skeleton: '#1C2637',
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.6)',
};

/** 4pt base scale — every gap in the app is one of these. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 44,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  pill: 999,
} as const;

/**
 * Type ramp modelled on iOS text styles. Sizes are fixed rather than scaled by
 * the system setting, but line heights are generous enough that a larger
 * accessibility font still fits the rows it lives in.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontWeight: '800' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.5, fontWeight: '800' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.3, fontWeight: '700' },
  title3: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontWeight: '700' },
  headline: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' },
  callout: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 0.8, fontWeight: '700' },
} as const;

export type TypeVariant = keyof typeof type;

/** Numerals that don't jitter while a counter ticks. */
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
})!;

/**
 * Elevation. iOS gets a soft directional shadow; Android's elevation is paired
 * with a matching shadowColor so the two platforms read at the same weight.
 */
export function shadow(level: 0 | 1 | 2 | 3, color: string) {
  if (level === 0) return {};
  const spec = {
    1: { radius: 8, offset: 2, opacity: 0.06, elevation: 2 },
    2: { radius: 18, offset: 6, opacity: 0.1, elevation: 5 },
    3: { radius: 32, offset: 12, opacity: 0.16, elevation: 10 },
  }[level];
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: spec.offset },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.radius,
    elevation: spec.elevation,
  };
}

/** Minimum comfortable touch target (Apple HIG: 44pt). */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };
export const TOUCH_TARGET = 44;

export const timing = {
  fast: 150,
  base: 240,
  slow: 380,
} as const;
