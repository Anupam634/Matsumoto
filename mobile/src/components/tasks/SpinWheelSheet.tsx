import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { ErrorNote } from '../ui/Chrome';
import { useTheme } from '../../theme/ThemeProvider';
import { useT } from '../../i18n';
import { useFeedback } from '../../lib/feedback';

const AnimatedG = Animated.createAnimatedComponent(G);

const SIZE = 280;
const R = 120;
const FULL_TURNS = 6;
const SPIN_MS = 4200;

/** Segment fills, cycled around the wheel. */
const PALETTE = [
  ['#F59E0B', '#D97706'],
  ['#2563EB', '#1D4ED8'],
  ['#7C3AED', '#6D28D9'],
  ['#10B981', '#059669'],
  ['#EA580C', '#C2410C'],
  ['#4F46E5', '#4338CA'],
];

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
  const { c, spacing, radius } = useTheme();
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
          }}
        >
          <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
            <Defs>
              {PALETTE.map(([from, to], i) => (
                <LinearGradient key={i} id={`seg${i}`} x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor={from} />
                  <Stop offset="1" stopColor={to} />
                </LinearGradient>
              ))}
            </Defs>

            {/* Rim */}
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R + 8}
              fill={c.surfaceAlt}
              stroke={c.borderStrong}
              strokeWidth={2}
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
                      stroke="#FFFFFF"
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
              <Circle cx={SIZE / 2} cy={SIZE / 2} r={30} fill={c.surface} />
            </AnimatedG>
          </Svg>

          {/* Pointer */}
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 2,
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 11,
                borderRightWidth: 11,
                borderTopWidth: 20,
                borderLeftColor: 'transparent',
                borderRightColor: 'transparent',
                borderTopColor: c.gold,
              }}
            />
          </View>

          {/* Hub */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('tasksScreen.spinCta')}
            disabled={spinning || result !== null}
            onPress={() => void spin()}
            style={({ pressed }) => ({
              position: 'absolute',
              width: 78,
              height: 78,
              borderRadius: 39,
              backgroundColor: result ? c.surfaceAlt : c.gold,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 3,
              borderColor: c.surface,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            })}
          >
            <Ionicons
              name={result ? 'checkmark' : 'flash'}
              size={20}
              color={result ? c.textSecondary : '#3A2606'}
            />
            <Text
              variant="caption"
              weight="800"
              style={{ color: result ? c.textSecondary : '#3A2606', fontSize: 10 }}
            >
              {spinning ? '…' : result ? '' : t('tasksScreen.spinCta')}
            </Text>
          </Pressable>
        </View>

        {error ? <ErrorNote message={error} /> : null}

        {result ? (
          <View
            style={{
              alignItems: 'center',
              gap: 4,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: c.successMuted,
              width: '100%',
            }}
          >
            <Text variant="overline" tone="success" uppercase>
              {t('tasksScreen.spinWon', { points: result.earned })}
            </Text>
            <Text variant="display" mono tone="success">
              +{result.earned}
            </Text>
          </View>
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
