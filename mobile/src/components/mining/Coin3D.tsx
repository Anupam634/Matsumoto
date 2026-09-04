import React, { useEffect } from 'react';
import { View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * The site's rotating 3D $BONDKOIN coin (`.coin` / `.orbit` / `animate-float`).
 *
 * A perspective rotateY spin with two faces that swap at the quarter turn, a
 * stacked "edge" for thickness, two hologram orbit rings tilted on X and
 * rotating on Z in opposite directions, a slow vertical float and an amber
 * aura behind it all. Everything runs on the UI thread.
 */
export function Coin3D({ size = 176 }: { size?: number }) {
  const { c, monoFont, alpha } = useTheme();
  const spin = useSharedValue(0);
  const orbit = useSharedValue(0);
  const float = useSharedValue(0);

  useEffect(() => {
    spin.value = withRepeat(withTiming(360, { duration: 11000, easing: Easing.linear }), -1, false);
    orbit.value = withRepeat(withTiming(360, { duration: 18000, easing: Easing.linear }), -1, false);
    float.value = withRepeat(
      withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(spin);
      cancelAnimation(orbit);
      cancelAnimation(float);
    };
  }, [spin, orbit, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [-6, 6]) }],
  }));

  // Both faces rotate together; the back face is pre-rotated 180° so that
  // whichever one currently faces the viewer is the one that is visible.
  const frontStyle = useAnimatedStyle(() => {
    const deg = spin.value % 360;
    const visible = deg < 90 || deg > 270;
    return {
      opacity: visible ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateX: '10deg' }, { rotateY: `${deg}deg` }],
    };
  });
  const backStyle = useAnimatedStyle(() => {
    const deg = spin.value % 360;
    const visible = deg >= 90 && deg <= 270;
    return {
      opacity: visible ? 1 : 0,
      transform: [{ perspective: 900 }, { rotateX: '10deg' }, { rotateY: `${deg + 180}deg` }],
    };
  });
  // The edge reads as thickness when the coin is side-on.
  const edgeStyle = useAnimatedStyle(() => {
    const deg = spin.value % 360;
    const sideOn = Math.abs(Math.sin((deg * Math.PI) / 180));
    return {
      opacity: 0.25 + sideOn * 0.75,
      transform: [
        { perspective: 900 },
        { rotateX: '10deg' },
        { rotateY: `${deg}deg` },
        { scaleX: 0.06 + sideOn * 0.08 },
      ],
    };
  });

  const orbitA = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: '74deg' }, { rotateZ: `${orbit.value}deg` }],
  }));
  const orbitB = useAnimatedStyle(() => ({
    transform: [{ perspective: 900 }, { rotateX: '74deg' }, { rotateZ: `${-orbit.value * 0.72}deg` }],
  }));

  const stage = size * 1.7;
  const faceRadius = size / 2;
  const face = {
    position: 'absolute' as const,
    width: size,
    height: size,
    borderRadius: faceRadius,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 2,
    borderColor: alpha(c.gold, 0.6),
    backgroundColor: c.dark ? '#050B1E' : c.surface,
    overflow: 'hidden' as const,
  };

  return (
    <View style={{ width: stage, height: stage, alignItems: 'center', justifyContent: 'center' }}>
      {/* Amber aura */}
      <Svg width={stage} height={stage} style={{ position: 'absolute' }}>
        <Defs>
          <RadialGradient id="aura" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={c.gold} stopOpacity={c.dark ? 0.32 : 0.16} />
            <Stop offset="0.55" stopColor={c.gold} stopOpacity={c.dark ? 0.12 : 0.05} />
            <Stop offset="1" stopColor={c.gold} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx={stage / 2} cy={stage / 2} r={stage / 2} fill="url(#aura)" />
      </Svg>

      {/* Orbit rings */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 1.36,
            height: size * 1.36,
            borderRadius: size * 0.68,
            borderWidth: 1.5,
            borderColor: alpha(c.primary, 0.55),
            ...c.dark ? { shadowColor: c.primary, shadowOpacity: 0.5, shadowRadius: 12 } : null,
          },
          orbitA,
        ]}
      >
        <View style={{ position: 'absolute', top: -4, left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: c.info }} />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            width: size * 1.62,
            height: size * 1.62,
            borderRadius: size * 0.81,
            borderWidth: 1.5,
            borderColor: alpha('#6366F1', 0.45),
          },
          orbitB,
        ]}
      >
        <View style={{ position: 'absolute', bottom: -4, left: '50%', width: 8, height: 8, borderRadius: 4, backgroundColor: c.gold }} />
      </Animated.View>

      {/* The coin */}
      <Animated.View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, floatStyle]}>
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              width: size,
              height: size,
              borderRadius: faceRadius,
              backgroundColor: c.dark ? '#3B82F6' : '#1D4ED8',
            },
            edgeStyle,
          ]}
        />
        <Animated.View style={[face, frontStyle]}>
          <CoinFace size={size} caption="$BONDKOIN" gold={c.gold} monoFont={monoFont} />
        </Animated.View>
        <Animated.View style={[face, backStyle]}>
          <CoinFace size={size} caption="BNB CHAIN BEP-20" gold={c.gold} monoFont={monoFont} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function CoinFace({
  size,
  caption,
  gold,
  monoFont,
}: {
  size: number;
  caption: string;
  gold: string;
  monoFont: string;
}) {
  const inner = size * 0.62;
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', gap: 4 }}>
      <Image
        source={require('../../../assets/logo.png')}
        style={{ width: inner, height: inner, borderRadius: inner / 2 }}
        contentFit="cover"
      />
      <Text
        style={{
          fontFamily: monoFont,
          fontSize: 9,
          lineHeight: 12,
          letterSpacing: 1.4,
          fontWeight: '900',
          color: gold,
        }}
      >
        {caption}
      </Text>
    </View>
  );
}
