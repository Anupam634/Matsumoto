import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { PulseRing } from '../ui/Pulse';
import { useTheme } from '../../theme/ThemeProvider';
import type { Palette } from '../../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * The site's `#ringGradient`: indigo → violet → sky. Read off the theme so the
 * red theme gets crimson → rose and Executive Light stays sapphire.
 */
export function ringStops(c: Palette): [string, string, string] {
  const g = c.primaryGradient;
  return [g[g.length - 2] ?? c.primary, g[g.length - 1] ?? c.primary, c.info];
}

/** The web's accent for "violet" chips — the last stop of the brand gradient. */
export function violetOf(c: Palette): string {
  return c.primaryGradient[c.primaryGradient.length - 1] ?? c.primary;
}

/* ───────────────────────────── Progress ring ───────────────────────────── */

/**
 * The dashboard's `ProgressRing`: a 7pt track with a gradient sweep that fills
 * over the 24-hour accrual window, starting at 12 o'clock.
 */
export function ProgressRing({
  size = 158,
  stroke = 7,
  progress,
  children,
}: {
  size?: number;
  stroke?: number;
  /** 0–1. */
  progress: number;
  children?: React.ReactNode;
}) {
  const { c, alpha } = useTheme();
  const r = size / 2 - 13;
  const circumference = 2 * Math.PI * r;
  const [s0, s1, s2] = ringStops(c);

  const sweep = useSharedValue(0);
  useEffect(() => {
    sweep.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, sweep]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - sweep.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="mineRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={s0} />
            <Stop offset="0.55" stopColor={s1} />
            <Stop offset="1" stopColor={s2} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke={alpha(c.textPrimary, c.dark ? 0.08 : 0.1)}
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="url(#mineRing)"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={ringProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/* ───────────────────────────── Mine button ─────────────────────────────── */

/**
 * The round `.btn-gold` Mine control from the dashboard hero: a brand-gradient
 * disc with ⚡ + label, a `.pulse-ring` halo and amber glow while a claim is
 * available, the countdown while the window is still filling, and a spinner
 * while the claim is in flight.
 */
export function MineButton({
  size = 120,
  ready,
  claiming,
  label,
  countdown,
  accessibilityLabel,
  onPress,
  onEarlyPress,
}: {
  size?: number;
  ready: boolean;
  claiming: boolean;
  label: string;
  countdown: string | null;
  accessibilityLabel: string;
  onPress: () => void;
  onEarlyPress: () => void;
}) {
  const { c, glow, elevation } = useTheme();
  const press = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const halo = ready
    ? glow(c.gold, c.dark ? 3 : 2)
    : elevation(claiming ? 1 : 2);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <PulseRing color={c.gold} size={size} active={ready && !claiming} />
      <Animated.View style={[{ borderRadius: size / 2, ...halo }, pressStyle]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ disabled: !ready, busy: claiming }}
          disabled={claiming}
          onPressIn={() => {
            press.value = withSpring(ready ? 0.94 : 0.98, { damping: 18, stiffness: 340 });
          }}
          onPressOut={() => {
            press.value = withSpring(1, { damping: 12, stiffness: 220 });
          }}
          onPress={ready ? onPress : onEarlyPress}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: c.primary,
            opacity: ready || claiming ? 1 : 0.55,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={[...c.primaryGradient] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {c.dark ? (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 0,
                left: size * 0.25,
                right: size * 0.25,
                height: 1,
                backgroundColor: 'rgba(255,255,255,0.4)',
              }}
            />
          ) : null}

          {claiming ? (
            <ActivityIndicator color={c.onPrimary} size="large" />
          ) : ready ? (
            <>
              <Text style={{ fontSize: 26, lineHeight: 32 }}>⚡</Text>
              <Text
                variant="caption"
                weight="900"
                uppercase
                style={{ color: c.onPrimary, letterSpacing: 1.4, marginTop: 2 }}
              >
                {label}
              </Text>
            </>
          ) : (
            <>
              <Ionicons name="hourglass-outline" size={22} color={c.onPrimary} />
              <Text
                variant="caption"
                mono
                weight="800"
                style={{ color: c.onPrimary, marginTop: 4 }}
              >
                {countdown ?? '—'}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────────── Effects ───────────────────────────────── */

/**
 * `.mine-shockwave`: a ring that snaps out from the button and fades. Mount it
 * fresh (change its `key`) for every tap.
 */
export function Shockwave({ size, color }: { size: number; color: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
  }, [v]);
  const style = useAnimatedStyle(() => ({
    opacity: (1 - v.value) * 0.85,
    transform: [{ scale: 0.75 + v.value * 1.15 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 3,
          borderColor: color,
        },
        style,
      ]}
    />
  );
}

/**
 * `.burst-particle` × 14: brand-coloured sparks flung radially off the button
 * on a successful claim, each a beat behind the last.
 */
export function Burst({ radius = 78, count = 14 }: { radius?: number; count?: number }) {
  const { c } = useTheme();
  const [s0, s1, s2] = ringStops(c);
  const colors = [s0, s1, s2, c.success, c.gold];
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <Particle
          key={i}
          angle={(2 * Math.PI * i) / count}
          color={colors[i % colors.length]}
          delay={i * 12}
          radius={radius}
        />
      ))}
    </View>
  );
}

function Particle({
  angle,
  color,
  delay,
  radius,
}: {
  angle: number;
  color: string;
  delay: number;
  radius: number;
}) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withTiming(1, { duration: 720, easing: Easing.out(Easing.cubic) }),
    );
  }, [v, delay]);
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const style = useAnimatedStyle(() => {
    const d = radius * (0.3 + 0.7 * v.value);
    return {
      opacity: 1 - v.value,
      transform: [
        { translateX: dx * d },
        { translateY: dy * d },
        { scale: 1 - v.value * 0.7 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * `.float-up`: the "+X.XX PTS" emerald pill that rises off the control after a
 * claim lands. Mounted only while the celebration is live.
 */
export function FloatUp({ label, style }: { label: string; style?: StyleProp<ViewStyle> }) {
  const { c, radius, alpha, glow } = useTheme();
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) });
  }, [v]);
  const animated = useAnimatedStyle(() => ({
    opacity: v.value < 0.7 ? 1 : (1 - v.value) / 0.3,
    transform: [{ translateY: -72 * v.value }, { scale: 0.85 + v.value * 0.2 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          alignSelf: 'center',
          top: -8,
          paddingHorizontal: 14,
          paddingVertical: 6,
          borderRadius: radius.pill,
          backgroundColor: alpha(c.success, c.dark ? 0.2 : 0.12),
          borderWidth: 1,
          borderColor: alpha(c.success, 0.45),
          zIndex: 20,
          ...(c.dark ? glow(c.success, 2) : null),
        },
        animated,
        style,
      ]}
    >
      <Text variant="title3" tone="success" mono weight="900">
        {label}
      </Text>
    </Animated.View>
  );
}
