import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

/* ─────────────────────────── Screen shell ─────────────────────────── */

export function Screen({
  children,
  sunken,
  style,
}: {
  children: React.ReactNode;
  /** Recessed background — use whenever the content is a stack of cards. */
  sunken?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: sunken ? c.bgSunken : c.bg },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Scrolling body with the standard gutters and bottom inset. */
export function Body({
  children,
  contentContainerStyle,
  bottomInset = 32,
  ...rest
}: ScrollViewProps & { bottomInset?: number }) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      {...rest}
      contentContainerStyle={[
        {
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + bottomInset,
          gap: spacing.md,
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  );
}

/* ────────────────────────────── Nav bar ───────────────────────────── */

export function NavBar({
  title,
  subtitle,
  onBack,
  right,
  transparent,
  large,
}: {
  title?: string;
  subtitle?: string;
  /** Defaults to router.back(). Pass null to hide the back button. */
  onBack?: (() => void) | null;
  right?: React.ReactNode;
  transparent?: boolean;
  /** Renders the title below the bar, iOS large-title style. */
  large?: boolean;
}) {
  const { c, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feedback = useFeedback();

  const back = onBack === null ? null : (onBack ?? (() => router.back()));

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: transparent ? 'transparent' : c.bg,
        borderBottomWidth: transparent || large ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View
        style={{
          height: 48,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.sm,
          gap: spacing.xs,
        }}
      >
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={() => {
              feedback.select();
              back();
            }}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pressed ? 0.5 : 1,
            })}
          >
            <Ionicons name="chevron-back" size={26} color={c.primary} />
          </Pressable>
        ) : (
          <View style={{ width: spacing.sm }} />
        )}

        <View style={{ flex: 1, alignItems: large ? 'flex-start' : 'center' }}>
          {!large && title ? (
            <Text variant="headline" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {!large && subtitle ? (
            <Text variant="caption" tone="tertiary" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingRight: spacing.sm,
            minWidth: back ? 40 : 0,
            justifyContent: 'flex-end',
          }}
        >
          {right}
        </View>
      </View>

      {large && title ? (
        <View
          style={{
            paddingHorizontal: spacing.lg,
            paddingBottom: spacing.md,
            paddingTop: spacing.xs,
          }}
        >
          <Text variant="title1">{title}</Text>
          {subtitle ? (
            <Text variant="callout" tone="secondary" style={{ marginTop: 4 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

/* ───────────────────────────── Feedback ───────────────────────────── */

export function Loading({ label }: { label?: string }) {
  const { c, spacing } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.md,
      }}
    >
      <ActivityIndicator color={c.primary} />
      {label ? (
        <Text variant="footnote" tone="tertiary">
          {label}
        </Text>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon = 'file-tray-outline',
  title,
  body,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  const { c, spacing, radius } = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      style={{
        alignItems: 'center',
        paddingVertical: spacing.xxxl,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          backgroundColor: c.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}
      >
        <Ionicons name={icon} size={26} color={c.textTertiary} />
      </View>
      <Text variant="headline" center>
        {title}
      </Text>
      {body ? (
        <Text
          variant="footnote"
          tone="secondary"
          center
          style={{ maxWidth: 300 }}
        >
          {body}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: spacing.md }}>{action}</View> : null}
    </Animated.View>
  );
}

/** Inline error strip, used above forms and lists. */
export function ErrorNote({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { c, spacing, radius } = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: c.dangerMuted,
      }}
    >
      <Ionicons name="alert-circle" size={18} color={c.danger} />
      <Text variant="footnote" tone="danger" style={{ flex: 1 }}>
        {message}
      </Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onRetry}>
          <Text variant="footnote" tone="danger" weight="700">
            {retryLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Shimmerless skeleton block — a calm placeholder, not a light show. */
export function Skeleton({
  height = 16,
  width = '100%',
  radius: r,
  style,
}: {
  height?: number;
  width?: number | `${number}%`;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius: tokens } = useTheme();
  return (
    <View
      style={[
        {
          height,
          width,
          borderRadius: r ?? tokens.sm,
          backgroundColor: c.skeleton,
        },
        style,
      ]}
    />
  );
}
