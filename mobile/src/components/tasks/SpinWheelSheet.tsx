import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  ZoomIn,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorNote } from '../ui/Chrome';
import { PulseRing } from '../ui/Pulse';
import { useTheme } from '../../theme/ThemeProvider';
import { wheelPalette } from '../../theme/tokens';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';

const AnimatedG = Animated.createAnimatedComponent(G);

const SIZE = 280;
const R = 120;
const HUB = 78;
const FULL_TURNS = 6;
const SPIN_MS = 4200;

/** Segment fills, cycled around the wheel. */
const PALETTE = wheelPalette;

/**
 * The daily prize wheel.
 *
 * The server decides the outcome — `onSpin` claims the task and returns the
 * winning segment — and the animation is then aimed at that segment. The wheel
 * is a presentation of a result, never the thing that decides it.
 */
export function SpinWheelSheet({
  segments,
  onSpin,
  onClose,
}: {
  segments: number[];
  onSpin: () => Promise<{ index: number; earned: number }>;
  onClose: () => void;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<{ index: number; earned: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const rotation = useSharedValue(0);
  /** Angle at which the last haptic fired — lives on the UI thread. */
  const lastTickAngle = useSharedValue(0);
  const hubScale = useSharedValue(1);
  const slice = 360 / segments.length;

  useEffect(() => () => cancelAnimation(rotation), [rotation]);

  const tick = () => feedback.tick();

  const animatedProps = useAnimatedProps(() => {
    // The comparison runs on the UI thread and only crosses to JS when a
    // segment boundary actually passes the pointer — a handful of calls per
    // spin instead of one every frame.
    if (Math.abs(rotation.value - lastTickAngle.value) >= slice) {
      lastTickAngle.value = rotation.value;
      runOnJS(tick)();
    }
    return { rotation: rotation.value } as { rotation: number };
  });

  const hubStyle = useAnimatedStyle(() => ({
    transform: [{ scale: hubScale.value }],
  }));

  async function spin() {
    if (spinning || result) return;
    setSpinning(true);
    setError(null);

    let outcome: { index: number; earned: number };
    try {
      outcome = await onSpin();
    } catch (err) {
      setSpinning(false);
      feedback.error();
      setError(err instanceof Error ? err.message : t('app.offline'));
      return;
    }

    // Land the middle of the winning segment under the pointer at 12 o'clock.
    const targetCentre = (outcome.index + 0.5) * slice;
    const current = ((rotation.value % 360) + 360) % 360;
    let forward = 360 - targetCentre - current;
    while (forward <= 0) forward += 360;
    const destination = rotation.value + FULL_TURNS * 360 + forward;

    lastTickAngle.value = rotation.value;
    rotation.value = withTiming(
      destination,
      { duration: SPIN_MS, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(settle)(outcome);
      },
    );
  }

  function settle(outcome: { index: number; earned: number }) {
    setResult(outcome);
    setSpinning(false);
    feedback.win();
  }

  const idle = !spinning && !result;

  return (
    <Sheet
      visible
      onClose={spinning ? () => {} : onClose}
      dismissable={!spinning}
      title={t('tasksScreen.spinTitle')}
      subtitle={t('tasksScreen.spinBody')}
      scrollable={false}
    >
      <View style={{ alignItems: 'center', gap: spacing.lg }}>
        <View
          style={{
            width: SIZE,
            height: SIZE,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: SIZE / 2,
            ...glow(c.primaryGlow, c.dark ? 3 : 1),
          }}
        >
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Defs>
              {PALETTE.map((fill, i) => (
                <SvgLinearGradient key={i} id={`seg${i}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={fill} />
                  <Stop offset="1" stopColor={fill} stopOpacity={0.78} />
                </SvgLinearGradient>
              ))}
            </Defs>

            {/* Rim */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R + 10}
              fill={c.dark ? '#020617' : c.surfaceAlt}
              stroke={c.borderStrong}
              strokeWidth={2}
            />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R + 4}
              fill="none"
              stroke={alpha(c.gold, 0.5)}
              strokeWidth={1.5}
              strokeDasharray="3 9"
            />

            <AnimatedG
              animatedProps={animatedProps}
              originX={SIZE / 2}
              originY={SIZE / 2}
            >
              {segments.map((value, i) => {
                const start = i * slice - 90;
                const end = start + slice;
                const rad = (deg: number) => (deg * Math.PI) / 180;
                const cx = SIZE / 2;
                const cy = SIZE / 2;
                const x1 = cx + R * Math.cos(rad(start));
                const y1 = cy + R * Math.sin(rad(start));
                const x2 = cx + R * Math.cos(rad(end));
                const y2 = cy + R * Math.sin(rad(end));
                const mid = rad(start + slice / 2);
                const labelX = cx + R * 0.66 * Math.cos(mid);
                const labelY = cy + R * 0.66 * Math.sin(mid);
                const won = result?.index === i;

                return (
                  <G key={i}>
                    <Path
                      d={`M${cx} ${cy} L${x1} ${y1} A${R} ${R} 0 ${slice > 180 ? 1 : 0} 1 ${x2} ${y2} Z`}
                      fill={`url(#seg${i % PALETTE.length})`}
                      stroke={c.dark ? '#020617' : c.surface}
                      strokeWidth={1.5}
                      opacity={result && !won ? 0.35 : 1}
                    />
                    <SvgText
                      x={labelX}
                      y={labelY}
                      fill="#FFFFFF"
                      fontSize={15}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      transform={`rotate(${start + slice / 2 + 90} ${labelX} ${labelY})`}
                    >
                      {`+${value}`}
                    </SvgText>
                  </G>
                );
              })}
              <Circle
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={HUB / 2 + 4}
                fill={c.dark ? '#020617' : c.surface}
              />
            </AnimatedG>
          </Svg>

          {/* Pointer — amber wedge over a red pin, as on the site */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 11,
                borderRightWidth: 11,
                borderTopWidth: 22,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: c.gold,
              }}
            />
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                marginTop: -16,
                backgroundColor: '#EF4444',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            />
          </View>

          {/* Hub */}
          <PulseRing color={c.gold} size={HUB + 10} active={idle} />
          <Animated.View style={[hubStyle, { position: 'absolute' }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tasksScreen.spinCta')}
              disabled={spinning || result !== null}
              onPressIn={() => {
                hubScale.value = withSpring(0.94, { damping: 20, stiffness: 320 });
              }}
              onPressOut={() => {
                hubScale.value = withSpring(1, { damping: 16, stiffness: 260 });
              }}
              onPress={() => void spin()}
              style={{
                width: HUB,
                height: HUB,
                borderRadius: HUB / 2,
                overflow: 'hidden',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: c.dark ? '#020617' : c.surface,
                backgroundColor: result ? c.surfaceAlt : c.gold,
                ...(idle ? glow(c.gold, 2) : null),
              }}
            >
              {!result ? (
                <LinearGradient
                  pointerEvents="none"
                  colors={(c.dark ? ['#F59E0B', '#B45309'] : [...c.goldGradient]) as [string, string, ...string[]]}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
              ) : null}
              <Ionicons
                name={result ? 'checkmark' : 'flash'}
                size={20}
                color={result ? c.textSecondary : c.onGold}
              />
              <Text
                variant="caption"
                weight="900"
                uppercase
                style={{
                  color: result ? c.textSecondary : c.onGold,
                  fontSize: 10,
                  letterSpacing: 1.6,
                  marginTop: -1,
                }}
              >
                {spinning ? '…' : result ? '' : t('tasksScreen.spinCta')}
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        {error ? <ErrorNote message={error} /> : null}

        {result ? (
          <Animated.View
            entering={ZoomIn.duration(300)}
            style={{
              alignItems: 'center',
              gap: 6,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.gold, c.dark ? 0.18 : 0.08),
              borderWidth: 1,
              borderColor: alpha(c.gold, 0.5),
              width: '100%',
              ...glow(c.gold, c.dark ? 2 : 1),
            }}
          >
            <View
              style={{
                paddingHorizontal: 12,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: c.gold,
              }}
            >
              <Text
                variant="overline"
                uppercase
                style={{ color: c.onGold, fontSize: 10, letterSpacing: 1.8 }}
              >
                {t('tasksScreen.reward')}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              <Text variant="display" mono tone="info">
                +{result.earned}
              </Text>
              <Text variant="callout" tone="info" weight="800" uppercase>
                {t('dashboard.pointsShort')}
              </Text>
            </View>
            <Text variant="caption" tone="secondary" center>
              {t('tasksScreen.spinWon', { points: result.earned })}
            </Text>
          </Animated.View>
        ) : null}

        <Button
          label={result ? t('tasks.collect') : t('app.close')}
          onPress={onClose}
          disabled={spinning}
          variant={result ? 'primary' : 'secondary'}
          fullWidth
          size="lg"
        />
      </View>
    </Sheet>
  );
}
