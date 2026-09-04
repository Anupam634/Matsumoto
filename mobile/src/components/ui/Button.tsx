import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

type Variant = 'primary' | 'gold' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  /** Suppresses the haptic tap — for buttons that fire their own richer cue. */
  silent?: boolean;
  testID?: string;
}

const HEIGHT: Record<Size, number> = { sm: 38, md: 48, lg: 56 };
const PADDING: Record<Size, number> = { sm: 14, md: 18, lg: 22 };

/**
 * The app's button.
 *
 * Springs down to 0.97 on press — the iOS "this is a real control" cue — and
 * carries the haptic with it so every commit feels the same everywhere.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  silent,
  testID,
}: ButtonProps) {
  const { c, radius, elevation } = useTheme();
  const feedback = useFeedback();
  const scale = useSharedValue(1);

  const isDisabled = disabled || loading;

  const palette = {
    primary: { bg: c.primary, fg: c.onPrimary, border: 'transparent' },
    gold: { bg: c.gold, fg: c.onGold, border: 'transparent' },
    secondary: { bg: c.surfaceAlt, fg: c.textPrimary, border: c.border },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent' },
    danger: { bg: c.dangerMuted, fg: c.danger, border: 'transparent' },
  }[variant];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (isDisabled) return;
    if (!silent) feedback.press();
    onPress?.();
  }, [isDisabled, silent, feedback, onPress]);

  return (
    <Animated.View style={[animatedStyle, fullWidth && { width: '100%' }, style]}>
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        accessibilityLabel={label}
        disabled={isDisabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={handlePress}
        style={{
          height: HEIGHT[size],
          paddingHorizontal: PADDING[size],
          borderRadius: radius.lg,
          backgroundColor: palette.bg,
          borderWidth: variant === 'secondary' ? 1 : 0,
          borderColor: palette.border,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          opacity: isDisabled ? 0.45 : 1,
          ...(variant === 'primary' || variant === 'gold'
            ? elevation(isDisabled ? 0 : 1)
            : {}),
        }}
      >
        {loading ? (
          <ActivityIndicator color={palette.fg} size="small" />
        ) : (
          <>
            {icon && (
              <Ionicons
                name={icon}
                size={size === 'sm' ? 15 : 18}
                color={palette.fg}
              />
            )}
            <Text
              variant={size === 'sm' ? 'callout' : 'headline'}
              weight="700"
              style={{ color: palette.fg }}
              numberOfLines={1}
            >
              {label}
            </Text>
            {iconRight && (
              <Ionicons
                name={iconRight}
                size={size === 'sm' ? 15 : 18}
                color={palette.fg}
              />
            )}
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

/** A compact circular icon button — nav bars, card corners, dismiss affordances. */
export function IconButton({
  icon,
  onPress,
  size = 38,
  tone = 'default',
  accessibilityLabel,
  badge,
  style,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  tone?: 'default' | 'brand' | 'plain';
  accessibilityLabel: string;
  /** Small count dot, for the notification bell. */
  badge?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius } = useTheme();
  const feedback = useFeedback();

  const bg =
    tone === 'brand'
      ? c.primaryMuted
      : tone === 'plain'
        ? 'transparent'
        : c.surfaceAlt;
  const fg = tone === 'brand' ? c.primary : c.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={() => {
        feedback.select();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      <Ionicons name={icon} size={size * 0.5} color={fg} />
      {badge !== undefined && badge > 0 && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 4,
            borderRadius: radius.pill,
            backgroundColor: c.danger,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: c.bg,
          }}
        >
          <Text variant="overline" style={{ color: '#FFFFFF', fontSize: 9 }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
