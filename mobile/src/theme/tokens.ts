import { Platform } from 'react-native';

/**
 * Design tokens — a native port of the web app's `globals.css`.
 *
 * Four themes, exactly the web's: Midnight Sapphire (the default dark),
 * Executive Light, Corporate Royal Blue ("cyber") and Crimson Scarlet ("red").
 * Every screen reads semantic names (`c.textPrimary`, `c.primary`), never a raw
 * hex, so switching theme restyles the whole app the way it does on the site.
 */

export type ThemeName = 'dark' | 'light' | 'cyber' | 'red';

const brand = {
  blue: '#1D4ED8',
  sapphire: '#2563EB',
  sapphireLight: '#3B82F6',
  indigo: '#4F46E5',
  indigoSoft: '#6366F1',
  violet: '#7C3AED',
  cyan: '#06B6D4',
  cyanBright: '#22D3EE',
  gold: '#F59E0B',
  goldSoft: '#FBBF24',
  emerald: '#10B981',
  emeraldBright: '#34D399',
  rose: '#F43F5E',
  crimson: '#E11D48',
  crimsonDeep: '#BE123C',
  roseSoft: '#FB7185',
  amber: '#D97706',
};

export interface Palette {
  /** Page background, behind everything. */
  bg: string;
  /** Slightly recessed ground for grouped lists. */
  bgSunken: string;
  /** Card / sheet surface (flat colour, used where a gradient cannot be). */
  surface: string;
  /** Gradient stops for glass panels — top-left to bottom-right. */
  surfaceGradient: readonly [string, string];
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
  /** Gradient stops for primary buttons (the web's `.btn-gold`). */
  primaryGradient: readonly string[];
  /** Halo colour behind a primary button. */
  primaryGlow: string;
  /** Amber accent — numerals, prices, the "ready" state. */
  gold: string;
  goldMuted: string;
  onGold: string;
  goldGradient: readonly string[];
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  danger: string;
  dangerMuted: string;
  /** Cyan — token amounts, the marketplace accent. */
  info: string;
  infoMuted: string;
  /** Skeleton shimmer base. */
  skeleton: string;
  shadow: string;
  scrim: string;
  /** Dark wash for text laid over a photo, same in both schemes. */
  overlay: string;
  onOverlay: string;
  /** The three radial glows painted behind every screen (`.glow-field`). */
  glow: readonly [string, string, string];
  /** Hairline colour of the cyber grid (`.bg-cyber-grid`). */
  grid: string;
  /** Tab bar active tint (amber on the site's dark themes). */
  tabActive: string;
  tabActiveMuted: string;
  /** Whether the status bar should use light text. */
  dark: boolean;
}

/* ───────────── Midnight Sapphire — the site's default dark theme ───────────── */
export const darkPalette: Palette = {
  bg: '#030714',
  bgSunken: '#030714',
  surface: '#081432',
  surfaceGradient: ['rgba(10,25,60,0.92)', 'rgba(3,7,20,0.98)'],
  surfaceAlt: 'rgba(255,255,255,0.05)',
  chrome: 'rgba(5,7,15,0.88)',
  border: 'rgba(59,130,246,0.16)',
  borderStrong: 'rgba(59,130,246,0.45)',
  textPrimary: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textTertiary: '#94A3B8',
  textInverse: '#030714',
  primary: brand.sapphireLight,
  primaryPressed: brand.sapphire,
  primaryMuted: 'rgba(37,99,235,0.16)',
  onPrimary: '#FFFFFF',
  primaryGradient: [brand.blue, brand.sapphire, brand.indigo, brand.violet],
  primaryGlow: 'rgba(37,99,235,0.55)',
  gold: brand.goldSoft,
  goldMuted: 'rgba(245,158,11,0.14)',
  onGold: '#1A1203',
  goldGradient: [brand.gold, brand.goldSoft],
  success: brand.emeraldBright,
  successMuted: 'rgba(16,185,129,0.14)',
  warning: brand.goldSoft,
  warningMuted: 'rgba(245,158,11,0.14)',
  danger: '#F87171',
  dangerMuted: 'rgba(239,68,68,0.14)',
  info: brand.cyanBright,
  infoMuted: 'rgba(6,182,212,0.14)',
  skeleton: 'rgba(255,255,255,0.06)',
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.65)',
  overlay: 'rgba(0,0,0,0.62)',
  onOverlay: '#FFFFFF',
  glow: ['rgba(37,99,235,0.28)', 'rgba(99,102,241,0.2)', 'rgba(6,182,212,0.16)'],
  grid: 'rgba(59,130,246,0.06)',
  tabActive: brand.goldSoft,
  tabActiveMuted: 'rgba(245,158,11,0.15)',
  dark: true,
};

/* ───────────── Executive High-Contrast Light ───────────── */
export const lightPalette: Palette = {
  bg: '#F8FAFC',
  bgSunken: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceGradient: ['#FFFFFF', '#FFFFFF'],
  surfaceAlt: '#F1F5F9',
  chrome: 'rgba(255,255,255,0.95)',
  border: '#E2E8F0',
  borderStrong: '#CBD5E1',
  textPrimary: '#0A1E5C',
  textSecondary: '#334155',
  textTertiary: '#64748B',
  textInverse: '#FFFFFF',
  primary: brand.sapphire,
  primaryPressed: brand.blue,
  primaryMuted: '#EFF6FF',
  onPrimary: '#FFFFFF',
  primaryGradient: [brand.blue, brand.sapphire, brand.indigo],
  primaryGlow: 'rgba(37,99,235,0.35)',
  // The site maps every amber accent to blue in light mode.
  gold: brand.blue,
  goldMuted: '#EFF6FF',
  onGold: '#FFFFFF',
  goldGradient: [brand.blue, brand.sapphire],
  success: '#15803D',
  successMuted: '#DCFCE7',
  warning: brand.amber,
  warningMuted: '#FEF3C7',
  danger: '#DC2626',
  dangerMuted: '#FEE2E2',
  info: '#0284C7',
  infoMuted: '#E0F2FE',
  skeleton: '#E2E8F0',
  shadow: '#0A1E5C',
  scrim: 'rgba(10,30,92,0.45)',
  overlay: 'rgba(10,30,92,0.62)',
  onOverlay: '#FFFFFF',
  glow: ['rgba(37,99,235,0.12)', 'rgba(99,102,241,0.08)', 'rgba(6,182,212,0.08)'],
  grid: 'rgba(10,30,92,0.045)',
  tabActive: brand.sapphire,
  tabActiveMuted: '#EFF6FF',
  dark: false,
};

/* ───────────── Corporate Royal Blue ("cyber") ───────────── */
export const cyberPalette: Palette = {
  ...darkPalette,
  bg: '#040D28',
  bgSunken: '#040D28',
  surface: '#0B1A44',
  surfaceGradient: ['rgba(12,32,84,0.94)', 'rgba(4,13,40,0.98)'],
  border: 'rgba(59,130,246,0.45)',
  borderStrong: 'rgba(96,165,250,0.7)',
  primaryGlow: 'rgba(37,99,235,0.7)',
  glow: ['rgba(37,99,235,0.42)', 'rgba(124,58,237,0.3)', 'rgba(6,182,212,0.25)'],
  grid: 'rgba(59,130,246,0.09)',
};

/* ───────────── Crimson Scarlet & Dark Obsidian ("red") ───────────── */
export const redPalette: Palette = {
  ...darkPalette,
  bg: '#0A0B0F',
  bgSunken: '#0A0B0F',
  surface: '#12141C',
  surfaceGradient: ['#151823', '#0F1118'],
  surfaceAlt: '#191C27',
  chrome: 'rgba(14,16,22,0.95)',
  border: 'rgba(225,29,72,0.22)',
  borderStrong: 'rgba(244,63,94,0.6)',
  primary: brand.rose,
  primaryPressed: brand.crimson,
  primaryMuted: 'rgba(225,29,72,0.15)',
  primaryGradient: [brand.crimsonDeep, brand.crimson, brand.rose],
  primaryGlow: 'rgba(225,29,72,0.5)',
  gold: brand.roseSoft,
  goldMuted: 'rgba(225,29,72,0.15)',
  onGold: '#FFFFFF',
  goldGradient: [brand.crimson, brand.rose],
  info: brand.roseSoft,
  infoMuted: 'rgba(225,29,72,0.15)',
  glow: ['rgba(225,29,72,0.35)', 'rgba(244,63,94,0.22)', 'rgba(159,18,57,0.25)'],
  grid: 'rgba(225,29,72,0.07)',
  tabActive: brand.rose,
  tabActiveMuted: 'rgba(225,29,72,0.15)',
  scrim: 'rgba(0,0,0,0.7)',
};

export const palettes: Record<ThemeName, Palette> = {
  dark: darkPalette,
  light: lightPalette,
  cyber: cyberPalette,
  red: redPalette,
};

/**
 * Spin-wheel segment colours. Deliberately identical in every theme — the
 * wheel is a game surface, not a document, and its hues are part of the brand.
 */
export const wheelPalette = [
  brand.sapphire,
  brand.gold,
  brand.emerald,
  brand.indigoSoft,
  brand.rose,
  brand.cyan,
  brand.goldSoft,
  brand.blue,
] as const;

/**
 * `color` at `alpha`. Handles 6-digit hex and rgb()/rgba() tokens, so callers
 * never need to know which form a palette entry takes in a given theme.
 */
export function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const hex = /^#([0-9a-f]{6})$/i.exec(color);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(color);
  if (rgb) {
    const [r, g, b] = rgb[1].split(',').map((v) => v.trim());
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

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
 * Type ramp. Headings are heavier than iOS defaults on purpose — the site sets
 * its titles in black (900) weight with tight tracking.
 */
export const type = {
  display: { fontSize: 34, lineHeight: 40, letterSpacing: -0.8, fontWeight: '900' },
  title1: { fontSize: 28, lineHeight: 34, letterSpacing: -0.6, fontWeight: '900' },
  title2: { fontSize: 22, lineHeight: 28, letterSpacing: -0.4, fontWeight: '800' },
  title3: { fontSize: 18, lineHeight: 24, letterSpacing: -0.2, fontWeight: '800' },
  headline: { fontSize: 16, lineHeight: 22, letterSpacing: -0.1, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, letterSpacing: 0, fontWeight: '400' },
  callout: { fontSize: 14, lineHeight: 20, letterSpacing: 0, fontWeight: '500' },
  footnote: { fontSize: 13, lineHeight: 18, letterSpacing: 0, fontWeight: '400' },
  caption: { fontSize: 12, lineHeight: 16, letterSpacing: 0.1, fontWeight: '500' },
  overline: { fontSize: 11, lineHeight: 14, letterSpacing: 1.2, fontWeight: '800' },
} as const;

export type TypeVariant = keyof typeof type;

/** Numerals that don't jitter while a counter ticks. */
export const monoFont = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
})!;

/**
 * Elevation. On the dark themes the "shadow" is a coloured glow rather than a
 * drop shadow, which is what gives the site's panels their depth.
 */
export function shadow(level: 0 | 1 | 2 | 3, color: string) {
  if (level === 0) return {};
  const spec = {
    1: { radius: 10, offset: 4, opacity: 0.18, elevation: 2 },
    2: { radius: 22, offset: 8, opacity: 0.28, elevation: 5 },
    3: { radius: 36, offset: 14, opacity: 0.4, elevation: 10 },
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
