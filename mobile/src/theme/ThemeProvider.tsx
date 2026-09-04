import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  monoFont,
  palettes,
  radius,
  shadow,
  spacing,
  timing,
  type,
  withAlpha,
  type Palette,
  type ThemeName,
} from './tokens';
import { useSettings } from '../store/settings';

export interface Theme {
  /** Which of the four site themes is active. */
  name: ThemeName;
  /** 'dark' for every theme except Executive Light — drives the status bar. */
  scheme: 'light' | 'dark';
  c: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  timing: typeof timing;
  monoFont: string;
  /** `shadow(level)` with the palette's shadow colour already applied. */
  elevation: (level: 0 | 1 | 2 | 3) => ReturnType<typeof shadow>;
  /** A coloured glow — the site's `box-shadow: 0 0 35px rgba(37,99,235,.35)`. */
  glow: (color: string, level?: 1 | 2 | 3) => ReturnType<typeof shadow>;
  /** A palette colour at reduced opacity — for tints behind icons and chips. */
  alpha: (color: string, alpha: number) => string;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { settings } = useSettings();

  // 'system' follows the OS between the site's two base themes; the two
  // accent themes are explicit choices, exactly like the site's toggle.
  const name: ThemeName =
    settings.themeMode === 'system'
      ? system === 'light'
        ? 'light'
        : 'dark'
      : settings.themeMode;

  const value = useMemo<Theme>(() => {
    const c = palettes[name];
    return {
      name,
      scheme: c.dark ? 'dark' : 'light',
      c,
      spacing,
      radius,
      type,
      timing,
      monoFont,
      elevation: (level) => shadow(level, c.shadow),
      glow: (color, level = 2) => shadow(level, color),
      alpha: withAlpha,
    };
  }, [name]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
