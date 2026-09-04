import React, { useEffect } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SIZE = 248;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * The mining control.
 *
 * A progress ring showing how full the 24-hour accrual window is, wrapped
 * around the button that banks it. Ready, accruing and full each get their own
 * colour and copy, so a glance from across the room says what the app wants.
 */
export function MineDial({
  progress,
  ready,
  full,
  claiming,
  pending,
  onPress,
}: {
  /** 0–1 share of the 24h ceiling currently accrued. */
  progress: number;
  ready: boolean;
  full: boolean;
  claiming: boolean;
  /** Live pending points, already formatted. */
  pending: string;
  onPress: () => void;
}) {
  const { c, spacing, radius, elevation } = useTheme();
  const t = useT();

  const sweep = useSharedValue(0);
  const pulse = useSharedValue(0);
  const press = useSharedValue(1);

  useEffect(() => {
    sweep.value = withTiming(Math.max(0, Math.min(1, progress)), {
      duration: 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, sweep]);

  useEffect(() => {
    if (ready) {
      // A slow breath, not a strobe: it should read as "available", not urgent.
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      );
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 250 });
    }
    return () => cancelAnimation(pulse);
  }, [ready, pulse]);

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUMFERENCE * (1 - sweep.value),
  }));

  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + pulse.value * 0.22,
    transform: [{ scale: 1 + pulse.value * 0.05 }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  const accent = ready ? c.gold : full ? c.warning : c.primary;
  const statusKey = ready ? 'readyTitle' : full ? 'cappedTitle' : 'accruingTitle';

  return (
    <View style={{ alignItems: 'center' }}>
      <View
        style={{
          width: SIZE,
          height: SIZE,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Halo behind the dial, breathing while a claim is available. */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: SIZE,
              height: SIZE,
              borderRadius: SIZE / 2,
              backgroundColor: accent,
            },
            haloStyle,
          ]}
        />

        <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
          <Defs>
            <LinearGradient id="dial" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={accent} />
              <Stop offset="1" stopColor={ready ? c.warning : c.info} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={c.surfaceAlt}
            strokeWidth={STROKE}
            fill="none"
          />
          <AnimatedCircle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke="url(#dial)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={CIRCUMFERENCE}
            animatedProps={ringProps}
            // Start the sweep at 12 o'clock rather than 3.
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          />
        </Svg>

        <Animated.View style={buttonStyle}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !ready, busy: claiming }}
            accessibilityLabel={`${t(`mine.${statusKey}`)}. ${pending} ${t('mine.pendingLabel')}`}
            disabled={!ready || claiming}
            onPressIn={() => {
              press.value = withSpring(0.94, { damping: 18, stiffness: 340 });
            }}
            onPressOut={() => {
              press.value = withSpring(1, { damping: 12, stiffness: 220 });
            }}
            onPress={onPress}
            style={{
              width: SIZE - 78,
              height: SIZE - 78,
              borderRadius: (SIZE - 78) / 2,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              ...elevation(2),
            }}
          >
            {claiming ? (
              <ActivityIndicator color={accent} size="large" />
            ) : (
              <>
                <View
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: radius.md,
                    backgroundColor: ready ? c.goldMuted : c.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 2,
                  }}
                >
                  <Ionicons
                    name={ready ? 'flash' : 'hourglass-outline'}
                    size={18}
                    color={accent}
                  />
                </View>
                <Text
                  variant="display"
                  mono
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 32, lineHeight: 38 }}
                >
                  {pending}
                </Text>
                <Text variant="caption" tone="tertiary" uppercase>
                  {t('mine.pendingLabel')}
                </Text>
              </>
            )}
          </Pressable>
        </Animated.View>
      </View>

      <View
        style={{
          alignItems: 'center',
          marginTop: spacing.lg,
          gap: 4,
          paddingHorizontal: spacing.lg,
        }}
      >
        <Text variant="title3" style={{ color: accent }}>
          {t(`mine.${statusKey}`)}
        </Text>
        <Text variant="footnote" tone="secondary" center>
          {t(ready ? 'mine.readyBody' : full ? 'mine.cappedBody' : 'mine.accruingBody')}
        </Text>
      </View>
    </View>
  );
}

/**
 * The reward that floats up off the dial after a successful claim.
 * Mounted only while `points` is set, so the animation restarts every time.
 */
export function RewardBurst({ points }: { points: number }) {
  const { c, radius, elevation } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 1500,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value < 0.75 ? 1 : (1 - progress.value) * 4,
    transform: [
      { translateY: -70 * progress.value },
      { scale: 0.85 + progress.value * 0.25 },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          alignSelf: 'center',
          top: '38%',
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: radius.pill,
          backgroundColor: c.successMuted,
          borderWidth: 1,
          borderColor: c.success,
          zIndex: 20,
          ...elevation(2),
        },
        style,
      ]}
    >
      <Text variant="title3" tone="success" mono>
        +{points.toFixed(2)}
      </Text>
    </Animated.View>
  );
}
