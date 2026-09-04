import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Screen } from '../ui/Chrome';
import { PulseDot } from '../ui/Pulse';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';
import { useT } from '../../i18n';

export type AuthMode = 'signin' | 'signup';

/**
 * Shared frame for every auth screen — the site's login page.
 *
 * The form sits in a glass card on the glow-field, under a slim header with
 * a back chevron and the brand lockup. Two blurred blobs (amber top-left,
 * cyan bottom-right) sit in the corners exactly like the site's brand panel.
 * `mode` renders the Sign In / Register toggle at the top of the card.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
  onBack,
  mode,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: (() => void) | null;
  /** Shows the two-segment Sign In / Register toggle under the title. */
  mode?: AuthMode;
}) {
  const { c, spacing, radius, glow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const feedback = useFeedback();
  const t = useT();

  const back = onBack === null ? null : (onBack ?? (() => router.back()));

  return (
    <Screen>
      <CornerBlobs />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            flexGrow: 1,
            paddingTop: insets.top + spacing.xs,
            paddingHorizontal: spacing.lg,
            paddingBottom: insets.bottom + spacing.xl,
          }}
        >
          {/* Header: back + brand lockup */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: 52,
            }}
          >
            {back ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('app.back')}
                hitSlop={12}
                onPress={() => {
                  feedback.select();
                  back();
                }}
                style={({ pressed }) => ({
                  minWidth: 44,
                  minHeight: 44,
                  marginLeft: -spacing.sm,
                  justifyContent: 'center',
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <Ionicons name="chevron-back" size={26} color={c.gold} />
              </Pressable>
            ) : (
              <View style={{ minWidth: 44 }} />
            )}

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View style={{ alignItems: 'flex-end' }}>
                <Text variant="headline" weight="900" style={{ letterSpacing: -0.3 }}>
                  {t('app.name')}
                </Text>
                <Text
                  mono
                  tone="info"
                  uppercase
                  style={{ fontSize: 9, lineHeight: 12, letterSpacing: 1.6, fontWeight: '800' }}
                >
                  Labs · BNB Chain
                </Text>
              </View>
              <View style={{ borderRadius: radius.md, ...glow(c.primary, 1) }}>
                <Image
                  source={require('../../../assets/logo.png')}
                  style={{ width: 34, height: 34, borderRadius: radius.md }}
                  contentFit="contain"
                />
              </View>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(360)} style={{ marginTop: spacing.lg }}>
            <Card glow padded={false} style={{ padding: spacing.xl }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="title1">{title}</Text>
                  {subtitle ? (
                    <Text variant="footnote" tone="tertiary" style={{ marginTop: 6 }}>
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                <LivePill label={t('landing.simulator.networkStatus')} />
              </View>

              {mode ? <AuthModeToggle mode={mode} /> : null}

              <View style={{ gap: spacing.lg, marginTop: spacing.xl }}>{children}</View>
            </Card>
          </Animated.View>

          {footer ? (
            <View style={{ marginTop: 'auto', paddingTop: spacing.xl }}>{footer}</View>
          ) : null}

          <Text
            variant="caption"
            tone="tertiary"
            center
            style={{ marginTop: spacing.lg, paddingHorizontal: spacing.md, opacity: c.dark ? 0.8 : 1 }}
          >
            {t('landing.hero.honesty')}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/* ─────────────────────── Decorative corner blobs ─────────────────────── */

/**
 * The site's `bg-amber-500/15 blur-3xl` and `bg-cyan-500/15 blur-3xl`
 * spheres, drawn as radial gradients so they cost nothing to render.
 */
function CornerBlobs() {
  const { c } = useTheme();
  const peak = c.dark ? 0.22 : 0.1;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <RadialGradient id="authBlobAmber" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.gold} stopOpacity={peak} />
            <Stop offset="0.6" stopColor={c.gold} stopOpacity={peak * 0.35} />
            <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="authBlobCyan" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.info} stopOpacity={peak} />
            <Stop offset="0.6" stopColor={c.info} stopOpacity={peak * 0.35} />
            <Stop offset="1" stopColor={c.info} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="0%" cy="0%" r="42%" fill="url(#authBlobAmber)" />
        <Circle cx="100%" cy="100%" r="42%" fill="url(#authBlobCyan)" />
      </Svg>
    </View>
  );
}

/* ───────────────────────────── Live pill ─────────────────────────────── */

/** The visualizer's "NODE ONLINE" pill — emerald ring, pulsing dot. */
export function LivePill({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { c, radius, alpha } = useTheme();
  return (
    <View
      accessibilityLabel={label}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: alpha(c.success, 0.35),
          backgroundColor: alpha(c.success, 0.1),
        },
        style,
      ]}
    >
      <PulseDot color={c.success} size={7} />
      <Text variant="overline" tone="success" style={{ fontSize: 10, letterSpacing: 1 }}>
        {label}
      </Text>
    </View>
  );
}

/* ─────────────────────── Sign In / Register toggle ─────────────────────── */

/**
 * The login page's two-segment tab row: a bordered pill on a dark ground, the
 * active segment filled amber with dark text. Each segment is its own route,
 * so switching replaces the screen rather than animating a thumb.
 */
function AuthModeToggle({ mode }: { mode: AuthMode }) {
  const { c, radius, spacing, alpha, glow } = useTheme();
  const router = useRouter();
  const feedback = useFeedback();
  const t = useT();

  const options: { value: AuthMode; label: string; href: '/(auth)/sign-in' | '/(auth)/sign-up' }[] = [
    { value: 'signin', label: t('auth.signIn'), href: '/(auth)/sign-in' },
    { value: 'signup', label: t('auth.signUp'), href: '/(auth)/sign-up' },
  ];

  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: 'row',
        marginTop: spacing.xl,
        padding: 4,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.dark ? alpha(c.bg, 0.8) : c.bgSunken,
      }}
    >
      {options.map((option) => {
        const active = option.value === mode;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              feedback.select();
              router.replace(option.href);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 44,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.md,
              backgroundColor: active ? c.gold : 'transparent',
              opacity: pressed && !active ? 0.6 : 1,
              ...(active ? glow(c.gold, 1) : null),
            })}
          >
            <Text
              variant="overline"
              uppercase
              style={{ color: active ? c.onGold : c.textTertiary }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ───────────────────────────── Field label ───────────────────────────── */

/**
 * The site's `field-label`: 11px, bold, uppercase, tracked. Rendered above an
 * `<Input accessibilityLabel={…}>` so the field still announces its name.
 */
export function FieldLabel({
  children,
  optional,
  trailing,
}: {
  children: string;
  optional?: boolean;
  trailing?: React.ReactNode;
}) {
  const t = useT();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        marginBottom: 6,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexShrink: 1 }}>
        <Text variant="overline" tone="tertiary" uppercase>
          {children}
        </Text>
        {optional ? (
          <Text variant="caption" tone="tertiary" style={{ fontWeight: '400' }}>
            ({t('app.optional').toLowerCase()})
          </Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

/* ────────────────────────────── Text link ────────────────────────────── */

/** The amber text links on the login page ("Forgot password?", "Resend Code"). */
export function TextLink({
  label,
  onPress,
  icon,
  tone = 'gold',
  disabled,
  loading,
  style,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: 'gold' | 'secondary';
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, spacing } = useTheme();
  const feedback = useFeedback();
  const isDisabled = disabled || loading;
  const color = tone === 'gold' ? c.gold : c.textSecondary;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      disabled={isDisabled}
      hitSlop={6}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => [
        {
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          paddingHorizontal: spacing.sm,
          opacity: isDisabled ? 0.45 : pressed ? 0.6 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : icon ? (
        <Ionicons name={icon} size={14} color={color} />
      ) : null}
      <Text variant="footnote" weight="700" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

/* ────────────────────────────── Info note ────────────────────────────── */

/** The login page's amber "code sent" box. */
export function InfoNote({ message }: { message: string }) {
  const { c, spacing, radius, alpha } = useTheme();
  return (
    <View
      accessibilityRole="text"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: alpha(c.gold, 0.4),
        backgroundColor: c.goldMuted,
      }}
    >
      <Ionicons name="mail-open-outline" size={17} color={c.gold} />
      <Text variant="footnote" tone="gold" style={{ flex: 1 }}>
        {message}
      </Text>
    </View>
  );
}
