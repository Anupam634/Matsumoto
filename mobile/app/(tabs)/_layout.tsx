import React from 'react';
import { Platform, View, type ColorValue } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';

/**
 * The five tabs.
 *
 * Mine, Boost, Market, Ranks, Account — the same five destinations as the web
 * app's mobile tab bar, with Market keeping its place. The bar is translucent
 * on iOS so content scrolls under it, and solid on Android where blur is
 * inconsistent across OEM skins.
 */
export default function TabsLayout() {
  const { c, scheme } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textTertiary,
        tabBarStyle: {
          position: Platform.OS === 'ios' ? 'absolute' : 'relative',
          backgroundColor:
            Platform.OS === 'ios' ? 'transparent' : c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
          elevation: 0,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingTop: 6,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
                  style={{ flex: 1, backgroundColor: `${c.bg}CC` }}
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
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'bag' : 'bag-outline'} color={color} />
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
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: ColorValue;
}) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name={name} size={23} color={color} />
    </View>
  );
}
