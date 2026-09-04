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
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';
import { useT } from '../../i18n';

/* ─────────────────────────── Screen shell ─────────────────────────── */

/**
 * The site's `.glow-field`: soft sapphire, indigo and cyan washes bleeding in
 * from the top, right and bottom of the screen.
 *
 * Deliberately built from three `LinearGradient` layers rather than SVG. A
 * percentage-sized `<Svg>` with a repeating `<Pattern>` re-measures on every
 * layout pass, and because this sits behind *every* screen, several live
 * copies also shared one set of `<Defs>` ids — together that repainted the
 * tree continuously, which stole focus from text fields (the keyboard would
 * not open), flickered the inputs and eventually brought the app down.
 * Gradient layers are composited on the GPU and never re-measure.
 */
export const GlowField = React.memo(function GlowField({
  style,
}: {
  style?: StyleProp<ViewStyle>;
}) {
  const { c, alpha } = useTheme();
  const [g1, g2, g3] = c.glow;
  const fill: ViewStyle = { position: 'absolute', left: 0, right: 0 };

  return (
    <View
      pointerEvents="none"
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}
    >
      {/* Sapphire wash falling from the top. */}
      <LinearGradient
        colors={[g1, alpha(g1, 0)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[fill, { top: 0, height: '55%' }]}
      />
      {/* Indigo wash from the right shoulder. */}
      <LinearGradient
        colors={[alpha(g2, 0), g2]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 1, y: 0.55 }}
        style={[fill, { top: '10%', height: '45%' }]}
      />
      {/* Cyan wash rising from the bottom. */}
      <LinearGradient
        colors={[alpha(g3, 0), g3]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[fill, { bottom: 0, height: '42%' }]}
      />
    </View>
  );
});

export function Screen({
  children,
  sunken,
  plain,
  style,
}: {
  children: React.ReactNode;
  /** Kept for callers; every screen now sits on the same glow field. */
  sunken?: boolean;
  /** Skip the glow field — for screens that paint their own hero. */
  plain?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  void sunken;
  return (
    <View style={[{ flex: 1, backgroundColor: c.bg }, style]}>
      {plain ? null : <GlowField />}
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
  const t = useT();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feedback = useFeedback();

  const back = onBack === null ? null : (onBack ?? (() => router.back()));

  return (
    <View
      style={{
        paddingTop: insets.top,
        backgroundColor: transparent ? 'transparent' : c.chrome,
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
            accessibilityLabel={t('app.back')}
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
  retryLabel,
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
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
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={onRetry}
          style={{ minHeight: 32, justifyContent: 'center' }}
        >
          <Text variant="footnote" tone="danger" weight="700">
            {retryLabel ?? t('app.retry')}
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
