import React, { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

/**
 * The site's `.pulse-dot`: a solid dot with a ring that grows and fades on a
 * 1.8 s loop. Used for "live" indicators — NODE ONLINE, network status.
 */
export function PulseDot({
  color,
  size = 8,
  style,
}: {
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const ring = useSharedValue(0);

  useEffect(() => {
    ring.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.bezier(0.215, 0.61, 0.355, 1) }),
      -1,
      false,
    );
    return () => cancelAnimation(ring);
  }, [ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.9 * (1 - ring.value),
    transform: [{ scale: 0.9 + ring.value * 1.5 }],
  }));

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
          ringStyle,
        ]}
      />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
}

/**
 * The site's `.pulse-ring` on the Mine button: a soft halo that expands and
 * fades behind a circular control while a claim is available.
 */
export function PulseRing({
  color,
  size,
  active = true,
  style,
}: {
  color: string;
  size: number;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const ring = useSharedValue(0);

  useEffect(() => {
    if (active) {
      ring.value = 0;
      ring.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(ring);
      ring.value = withTiming(0, { duration: 200 });
    }
    return () => cancelAnimation(ring);
  }, [active, ring]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: active ? 0.55 * (1 - ring.value) : 0,
    transform: [{ scale: 1 + ring.value * 0.45 }],
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
        ringStyle,
        style,
      ]}
    />
  );
}
