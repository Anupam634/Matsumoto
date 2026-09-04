import React from 'react';
import {
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

export interface CardProps {
  children: React.ReactNode;
  /** 0 flat, 1 resting, 2 lifted. */
  elevation?: 0 | 1 | 2;
  padded?: boolean;
  onPress?: () => void;
  /** Brand-coloured halo around the panel — the site's `.card-glow-gold`. */
  glow?: boolean;
  /** Border tint override, e.g. an amber ring on the popular plan. */
  accent?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * The glass panel from the site: a navy gradient surface, a blue-tinted
 * hairline, a soft drop shadow and a one-pixel highlight along the top edge.
 * On Executive Light it collapses to a plain white card with a grey border.
 */
export function Card({
  children,
  elevation: level = 1,
  padded = true,
  onPress,
  glow,
  accent,
  style,
  accessibilityLabel,
}: CardProps) {
  const { c, radius, spacing, elevation, glow: glowShadow } = useTheme();
  const feedback = useFeedback();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: accent ?? (glow ? c.borderStrong : c.border),
    ...(padded ? { padding: spacing.lg } : null),
    ...(glow ? glowShadow(accent ?? c.primaryGlow, level === 0 ? 1 : 2) : elevation(level)),
  };

  const surface = (
    <>
      <LinearGradient
        pointerEvents="none"
        colors={[c.surfaceGradient[0], c.surfaceGradient[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          borderRadius: radius.xl - 1,
        }}
      />
      {c.dark ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: radius.md,
            right: radius.md,
            height: 1,
            backgroundColor: 'rgba(255,255,255,0.08)',
          }}
        />
      ) : null}
    </>
  );

  if (!onPress) {
    return (
      <View style={[base, style]}>
        {surface}
        {children}
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={() => {
          feedback.select();
          onPress();
        }}
        style={[base, style]}
      >
        {surface}
        {children}
      </Pressable>
    </Animated.View>
  );
}

/** Card header: title, optional subtitle, optional trailing action. */
export function CardHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  icon,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { c, spacing, radius } = useTheme();
  const feedback = useFeedback();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.md,
      }}
    >
      {icon && (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.md,
            backgroundColor: c.primaryMuted,
            borderWidth: 1,
            borderColor: c.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={c.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text variant="headline">{title}</Text>
        {subtitle ? (
          <Text variant="footnote" tone="secondary" style={{ marginTop: 1 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => {
            feedback.select();
            onAction();
          }}
          style={{ minHeight: 32, justifyContent: 'center' }}
        >
          <Text variant="callout" tone="brand" weight="700">
            {actionLabel} →
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Section label above a group of cards — the site's uppercase tracked label. */
export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { spacing } = useTheme();
  return (
    <View style={[{ paddingHorizontal: spacing.xs, marginBottom: spacing.sm }, style]}>
      <Text variant="overline" tone="tertiary" uppercase>
        {children}
      </Text>
    </View>
  );
}
