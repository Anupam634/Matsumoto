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
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

export interface CardProps {
  children: React.ReactNode;
  /** 0 flat, 1 resting, 2 lifted. Cards on a sunken ground want 1. */
  elevation?: 0 | 1 | 2;
  padded?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** The surface everything sits on: 20pt radius, hairline border, soft lift. */
export function Card({
  children,
  elevation: level = 1,
  padded = true,
  onPress,
  style,
  accessibilityLabel,
}: CardProps) {
  const { c, radius, spacing, elevation } = useTheme();
  const feedback = useFeedback();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const base: ViewStyle = {
    backgroundColor: c.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: c.border,
    ...(padded ? { padding: spacing.lg } : null),
    ...elevation(level),
  };

  if (!onPress) return <View style={[base, style]}>{children}</View>;

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
        >
          <Text variant="callout" tone="brand" weight="600">
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Section label above a group of cards (iOS grouped-list style). */
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
