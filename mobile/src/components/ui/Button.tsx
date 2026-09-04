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
import { LinearGradient } from 'expo-linear-gradient';
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
 * The app's button — the site's `.btn-gold` / `.btn-primary`.
 *
 * Primary and gold are gradient fills with a coloured halo (sapphire → violet
 * on the blue themes, crimson on the red one); secondary is the translucent
 * outlined pill. Springs down to 0.97 on press and carries the haptic with it.
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
  const { c, radius, glow } = useTheme();
  const feedback = useFeedback();
  const scale = useSharedValue(1);

  const isDisabled = disabled || loading;

  const palette = {
    primary: {
      bg: c.primary,
      fg: c.onPrimary,
      border: 'transparent',
      gradient: c.primaryGradient,
      halo: c.primaryGlow,
    },
    gold: {
      bg: c.gold,
      fg: c.onGold,
      border: 'transparent',
      gradient: c.goldGradient,
      halo: c.gold,
    },
    secondary: {
      bg: c.surfaceAlt,
      fg: c.textPrimary,
      border: c.borderStrong,
      gradient: null,
      halo: null,
    },
    ghost: { bg: 'transparent', fg: c.primary, border: 'transparent', gradient: null, halo: null },
    danger: { bg: c.dangerMuted, fg: c.danger, border: 'transparent', gradient: null, halo: null },
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
    <Animated.View
      style={[
        animatedStyle,
        fullWidth && { width: '100%' },
        palette.halo && !isDisabled ? { borderRadius: radius.lg, ...glow(palette.halo, 2) } : null,
        style,
      ]}
    >
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
        accessibilityLabel={label}
        disabled={isDisabled}
        hitSlop={size === 'sm' ? { top: 4, bottom: 4 } : undefined}
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
          overflow: 'hidden',
        }}
      >
        {palette.gradient ? (
          <LinearGradient
            pointerEvents="none"
            colors={[...palette.gradient] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
        ) : null}
        {palette.gradient && c.dark ? (
          // The site's inset top highlight on gradient buttons.
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 8,
              right: 8,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.35)',
            }}
          />
        ) : null}
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
          <Text variant="overline" style={{ color: c.onPrimary, fontSize: 9 }}>
            {badge > 9 ? '9+' : badge}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
