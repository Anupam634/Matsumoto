import React from 'react';
import { Platform, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';
import { TAB_BAR_HEIGHT } from '../../src/lib/layout';

/**
 * The five tabs.
 *
 * Mine, Boost, Market, Ranks, Account — the same five destinations as the web
 * app's mobile tab bar, with Market keeping its place. The bar floats over the
 * content on both platforms (translucent blur on iOS, solid on Android where
 * blur is inconsistent across OEM skins) and sizes itself from the real
 * safe-area inset, so it clears the home indicator, a three-button Android
 * nav bar, and a bezel iPhone alike.
 */
export default function TabsLayout() {
  const { c, scheme, alpha } = useTheme();
  const t = useT();
  const feedback = useFeedback();
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'ios' ? 0 : 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: c.bg },
        // Amber on the dark themes, sapphire on light — the site's tab bar.
        tabBarActiveTintColor: c.tabActive,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: Platform.OS === 'ios' ? 'transparent' : c.chrome,
          borderTopWidth: 1,
          borderTopColor: c.border,
          elevation: 0,
          height: TAB_BAR_HEIGHT + bottom,
          paddingTop: 6,
          paddingBottom: bottom,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          letterSpacing: 0,
        },
        tabBarBackground:
          Platform.OS === 'ios'
            ? () => (
                <BlurView
                  intensity={80}
                  tint={scheme === 'dark' ? 'dark' : 'light'}
                  style={{ flex: 1, backgroundColor: alpha(c.bg, 0.86) }}
                />
              )
            : undefined,
      }}
      screenListeners={{
        tabPress: () => feedback.select(),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.mine'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'flash' : 'flash-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="boosters"
        options={{
          title: t('tabs.boost'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'rocket' : 'rocket-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: t('tabs.market'),
          // The marketplace is the "new" destination: cyan, with the site's
          // pinging dot on the icon.
          tabBarActiveTintColor: c.info,
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'cart' : 'cart-outline'}
              color={focused ? c.info : c.textTertiary}
              dot={c.info}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tabs.ranks'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'trophy' : 'trophy-outline'} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name={focused ? 'person-circle' : 'person-circle-outline'}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

function TabIcon({
  name,
  color,
  dot,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
  /** Colour of a small "new" dot at the icon's corner. */
  dot?: string;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={23} color={color} />
      {dot ? <PingDot color={dot} /> : null}
    </View>
  );
}

/** The site's `animate-ping`: a dot with an expanding, fading ring. */
function PingDot({ color }: { color: string }) {
  const ring = useSharedValue(0);
  React.useEffect(() => {
    ring.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    return () => cancelAnimation(ring);
  }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.75 * (1 - ring.value),
    transform: [{ scale: 1 + ring.value * 1.6 }],
  }));
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: -3, right: -5, width: 8, height: 8 }}
    >
      <Animated.View
        style={[
          { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: color },
          ringStyle,
        ]}
      />
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}
