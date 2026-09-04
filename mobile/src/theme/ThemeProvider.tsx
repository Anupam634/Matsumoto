import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import {
  darkPalette,
  lightPalette,
  monoFont,
  radius,
  shadow,
  spacing,
  timing,
  type,
  type Palette,
} from './tokens';
import { useSettings } from '../store/settings';

export interface Theme {
  scheme: 'light' | 'dark';
  c: Palette;
  spacing: typeof spacing;
  radius: typeof radius;
  type: typeof type;
  timing: typeof timing;
  monoFont: string;
  /** `shadow(level)` with the palette's shadow colour already applied. */
  elevation: (level: 0 | 1 | 2 | 3) => ReturnType<typeof shadow>;
}

const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const system = useColorScheme();
  const { settings } = useSettings();

  const scheme: 'light' | 'dark' =
    settings.themeMode === 'system'
      ? system === 'dark'
        ? 'dark'
        : 'light'
      : settings.themeMode;

  const value = useMemo<Theme>(() => {
    const c = scheme === 'dark' ? darkPalette : lightPalette;
    return {
      scheme,
      c,
      spacing,
      radius,
      type,
      timing,
      monoFont,
      elevation: (level) => shadow(level, c.shadow),
    };
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
