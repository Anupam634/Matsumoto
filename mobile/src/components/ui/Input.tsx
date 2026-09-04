import React, { forwardRef, useState } from 'react';
import {
  Pressable,
  TextInput,
  View,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  hint?: string;
  error?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Trailing control — a paste button, a unit, a max shortcut. */
  trailing?: React.ReactNode;
  optional?: boolean;
  mono?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Text field with a floating label above the box.
 *
 * The border, not a shadow, carries focus — matching the platform's own fields
 * and keeping the row height stable when the state changes.
 */
export const Input = forwardRef<TextInput, InputProps>(function Input(
  {
    label,
    hint,
    error,
    icon,
    trailing,
    optional,
    mono,
    containerStyle,
    multiline,
    ...rest
  },
  ref,
) {
  const { c, radius, spacing, type, monoFont, glow } = useTheme();
  const t = useT();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? c.danger : focused ? c.primary : c.borderStrong;
  // The site's focus ring: `box-shadow: 0 0 0 3px rgba(37,99,235,.3)`.
  const focusRing = focused && !error ? glow(c.primaryGlow, 1) : null;

  return (
    <View style={containerStyle}>
      {label ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            marginBottom: 6,
          }}
        >
          <Text variant="overline" tone="tertiary" uppercase>
            {label}
          </Text>
          {optional ? (
            <Text variant="caption" tone="tertiary">
              {t('app.optional')}
            </Text>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          gap: spacing.sm,
          minHeight: multiline ? 108 : 50,
          paddingHorizontal: spacing.md,
          paddingVertical: multiline ? spacing.md : 0,
          backgroundColor: c.surfaceAlt,
          borderRadius: radius.lg,
          borderWidth: 1.5,
          borderColor,
          ...focusRing,
        }}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={focused ? c.primary : c.textTertiary}
            style={multiline ? { marginTop: 2 } : undefined}
          />
        ) : null}

        <TextInput
          ref={ref}
          accessibilityLabel={label}
          {...rest}
          multiline={multiline}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          placeholderTextColor={c.textTertiary}
          selectionColor={c.primary}
          style={{
            flex: 1,
            color: c.textPrimary,
            fontSize: mono ? 13 : type.body.fontSize,
            lineHeight: multiline ? 20 : undefined,
            fontFamily: mono ? monoFont : undefined,
            paddingVertical: multiline ? 0 : 14,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
        />

        {trailing}
      </View>

      {error ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginTop: 6,
          }}
        >
          <Ionicons name="alert-circle" size={13} color={c.danger} />
          <Text variant="caption" tone="danger" style={{ flex: 1 }}>
            {error}
          </Text>
        </View>
      ) : hint ? (
        <Text variant="caption" tone="tertiary" style={{ marginTop: 6 }}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
});

/** Small text action rendered inside a field (Paste, Max, Show). */
export function InputAction({
  label,
  onPress,
  icon,
  accessibilityLabel,
  disabled,
  tint,
}: {
  label?: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Required for icon-only actions — the glyph name is not a label. */
  accessibilityLabel?: string;
  disabled?: boolean;
  /** Icon colour override, e.g. brand once there is something to send. */
  tint?: string;
}) {
  const { c, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={10}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: disabled ? 0.4 : pressed ? 0.6 : 1,
        minHeight: 32,
        minWidth: 32,
        paddingHorizontal: label ? 10 : 4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.sm,
        backgroundColor: label ? c.primaryMuted : 'transparent',
      })}
    >
      {label ? (
        <Text variant="caption" tone="brand" weight="700">
          {label}
        </Text>
      ) : (
        <Ionicons name={icon!} size={18} color={tint ?? c.textTertiary} />
      )}
    </Pressable>
  );
}
