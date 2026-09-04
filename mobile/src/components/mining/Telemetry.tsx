import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { PulseDot } from '../ui/Pulse';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { formatPoints } from '../../lib/format';
import { POINTS_PER_TOKEN } from '../../api/endpoints';

/**
 * The read-outs of the site's Interactive Miner Visualizer — terminal chrome,
 * the floating hashrate badge, the amber points accumulator, the pulsing rig
 * and the hardware telemetry strip. Pure presentation; the numbers come in.
 */

/* ───────────────────────────── Terminal header ─────────────────────────── */

export function TerminalHeader({ online }: { online: boolean }) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const dots = [c.danger, c.warning, c.success];
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
        paddingBottom: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {dots.map((d, i) => (
          <View
            key={i}
            style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: alpha(d, 0.85) }}
          />
        ))}
        <Text
          variant="caption"
          mono
          tone="tertiary"
          weight="600"
          numberOfLines={1}
          style={{ marginLeft: 4, flexShrink: 1, fontSize: 11 }}
        >
          {t('mine.terminalHost')}
        </Text>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.pill,
          backgroundColor: alpha(c.success, 0.1),
          borderWidth: 1,
          borderColor: alpha(c.success, 0.3),
        }}
      >
        <PulseDot color={c.success} size={7} />
        <Text variant="overline" tone="success" uppercase style={{ fontSize: 10 }}>
          {t(online ? 'mine.nodeOnline' : 'mine.nodeIdle')}
        </Text>
      </View>
    </View>
  );
}

/* ───────────────────────────── Hashrate badge ──────────────────────────── */

export function HashrateBadge({
  ratePerHour,
  locale,
  style,
}: {
  ratePerHour: number;
  locale: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, alpha, elevation } = useTheme();
  const t = useT();
  return (
    <View
      style={[
        {
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.md,
          backgroundColor: alpha(c.surface, c.dark ? 0.85 : 0.96),
          borderWidth: 1,
          borderColor: alpha(c.gold, 0.4),
          alignItems: 'flex-end',
          ...elevation(2),
        },
        style,
      ]}
    >
      <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 9, letterSpacing: 1.6 }}>
        {t('mine.baseHashrate')}
      </Text>
      <Text variant="caption" mono weight="900" tone="gold" style={{ marginTop: 1 }}>
        {formatPoints(ratePerHour, 2, locale)} BONDKOIN/h
      </Text>
    </View>
  );
}

/* ─────────────────────────── Points accumulator ────────────────────────── */

export function PointsAccumulator({ points, locale }: { points: number; locale: string }) {
  const { c, radius, spacing, alpha } = useTheme();
  const t = useT();
  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: alpha(c.gold, 0.3),
        overflow: 'hidden',
        alignItems: 'center',
        padding: spacing.lg,
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(c.gold, c.dark ? 0.12 : 0.08), alpha(c.gold, 0)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Text variant="overline" uppercase style={{ color: alpha(c.gold, 0.9) }}>
        {t('mine.pointsAccumulated')}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 }}>
        <Text
          variant="title1"
          mono
          tone="gold"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ fontSize: 30, lineHeight: 36 }}
        >
          {formatPoints(points, 5, locale)}
        </Text>
        <Text variant="callout" weight="800" style={{ color: alpha(c.gold, 0.8) }}>
          PTS
        </Text>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginTop: 6,
        }}
      >
        <Text variant="caption" mono weight="700" tone="info">
          ≈ {formatPoints(points / POINTS_PER_TOKEN, 5, locale)} $BONDKOIN
        </Text>
        <Text variant="caption" tone="tertiary">
          •
        </Text>
        <Text variant="caption" weight="700" tone="success">
          {t('mine.fixedConversion')}
        </Text>
      </View>
    </View>
  );
}

/* ─────────────────────────────── Mining rig ────────────────────────────── */

/** Three slabs that pulse in turn while accrual is running — the hero's rig. */
export function MiningRig({ active }: { active: boolean }) {
  const { c, alpha } = useTheme();
  const [s0, s1, s2] = [c.primary, c.primaryGradient[c.primaryGradient.length - 1] ?? c.primary, c.info];
  return (
    <View style={{ alignItems: 'center', gap: 5 }} accessibilityElementsHidden>
      {[s0, s1, s2].map((tint, i) => (
        <RigSlab key={i} tint={tint} delay={i * 260} active={active} />
      ))}
      <View
        style={{
          marginTop: 2,
          height: 5,
          width: 52,
          borderRadius: 3,
          backgroundColor: alpha(c.primary, 0.3),
        }}
      />
    </View>
  );
}

function RigSlab({ tint, delay, active }: { tint: string; delay: number; active: boolean }) {
  const { c, alpha } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    if (active) {
      v.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
            withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
          ),
          -1,
          false,
        ),
      );
    } else {
      cancelAnimation(v);
      v.value = withTiming(0, { duration: 250 });
    }
    return () => cancelAnimation(v);
  }, [active, delay, v]);
  const style = useAnimatedStyle(() => ({
    opacity: active ? 0.45 + v.value * 0.55 : 0.35,
    transform: [{ scaleX: 0.96 + v.value * 0.04 }],
  }));
  return (
    <Animated.View
      style={[
        {
          width: 56,
          height: 11,
          borderRadius: 4,
          backgroundColor: alpha(tint, c.dark ? 0.55 : 0.4),
          borderWidth: 1,
          borderColor: alpha(tint, 0.7),
        },
        style,
      ]}
    />
  );
}

/* ───────────────────────────── Telemetry strip ─────────────────────────── */

export function TelemetryStrip({ temp }: { temp: number }) {
  const { spacing } = useTheme();
  const t = useT();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <TelemetryTile label={t('mine.nodeTemp')} value={`${temp}°C`} tone="gold" />
      <TelemetryTile label={t('mine.efficiency')} value="99.8%" tone="success" />
      <TelemetryTile label={t('mine.localPower')} value={t('mine.localPowerValue')} tone="info" />
    </View>
  );
}

function TelemetryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'gold' | 'success' | 'info';
}) {
  const { c, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 6,
        borderRadius: radius.md,
        backgroundColor: c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text
        variant="overline"
        tone="tertiary"
        uppercase
        numberOfLines={1}
        style={{ fontSize: 9, letterSpacing: 1 }}
      >
        {label}
      </Text>
      <Text
        variant="caption"
        mono
        weight="800"
        tone={tone}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={{ marginTop: 2 }}
      >
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────────── Sparkline ─────────────────────────────── */

/** The stat card's decorative upward trend — not real series data. */
export function Sparkline({ color, width = 56, height = 24 }: { color: string; width?: number; height?: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 56 24" fill="none" accessibilityElementsHidden>
      <Path
        d="M1 20 L9 16 L17 18 L25 11 L33 13 L41 6 L49 8 L55 2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/* ───────────────────────────────── Pill ────────────────────────────────── */

/** The hero's rate / countdown pills. */
export function Pill({
  icon,
  label,
  tint,
  mono,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint?: string;
  mono?: boolean;
}) {
  const { c, radius, alpha } = useTheme();
  const color = tint ?? c.textSecondary;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: radius.pill,
        backgroundColor: tint ? alpha(tint, 0.1) : 'transparent',
        borderWidth: 1,
        borderColor: tint ? alpha(tint, 0.25) : c.border,
      }}
    >
      <Ionicons name={icon} size={13} color={color} />
      <Text variant="callout" weight="700" mono={mono} style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
