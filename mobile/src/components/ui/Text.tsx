import React from 'react';
import {
  Text as RNText,
  type TextProps as RNTextProps,
  type TextStyle,
} from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { TypeVariant } from '../../theme/tokens';

type Tone =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'brand'
  | 'gold'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'inverse';

export interface TextProps extends RNTextProps {
  variant?: TypeVariant;
  tone?: Tone;
  /** Tabular figures — use for anything that ticks or is compared in a column. */
  mono?: boolean;
  weight?: TextStyle['fontWeight'];
  center?: boolean;
  uppercase?: boolean;
}

/**
 * The only text primitive in the app.
 *
 * Every size and colour comes from the token set, so a screen cannot invent a
 * fifteenth grey or a 17px heading.
 */
export function Text({
  variant = 'body',
  tone = 'primary',
  mono,
  weight,
  center,
  uppercase,
  style,
  ...rest
}: TextProps) {
  const { c, type, monoFont } = useTheme();

  const color = {
    primary: c.textPrimary,
    secondary: c.textSecondary,
    tertiary: c.textTertiary,
    brand: c.primary,
    gold: c.gold,
    success: c.success,
    warning: c.warning,
    danger: c.danger,
    info: c.info,
    inverse: c.textInverse,
  }[tone];

  const spec = type[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontSize: spec.fontSize,
          lineHeight: spec.lineHeight,
          letterSpacing: spec.letterSpacing,
          fontWeight: (weight ?? spec.fontWeight) as TextStyle['fontWeight'],
          color,
          ...(mono ? { fontFamily: monoFont } : null),
          ...(center ? { textAlign: 'center' as const } : null),
          ...(uppercase ? { textTransform: 'uppercase' as const } : null),
        },
        style,
      ]}
    />
  );
}
