import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { SettingsProvider, useSettings } from '../src/store/settings';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { I18nProvider } from '../src/i18n';
import { FeedbackProvider } from '../src/lib/feedback';
import { ToastProvider } from '../src/components/ui/Toast';
import { SessionProvider, useSession } from '../src/store/session';
import { NotificationsProvider } from '../src/store/notifications';
import { AppLock } from '../src/components/common/AppLock';
import { NotificationScheduler } from '../src/components/common/NotificationScheduler';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SettingsProvider>
          <ThemeProvider>
            <I18nProvider>
              <FeedbackProvider>
                <ToastProvider>
                  <SessionProvider>
                    <NotificationsProvider>
                      <AppLock>
                        <NotificationScheduler />
                        <RootNavigator />
                      </AppLock>
                    </NotificationsProvider>
                  </SessionProvider>
                </ToastProvider>
              </FeedbackProvider>
            </I18nProvider>
          </ThemeProvider>
        </SettingsProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Auth gate.
 *
 * Redirects rather than swapping navigators, so a deep link into a protected
 * screen survives the sign-in round trip and the back stack stays coherent.
 */
function RootNavigator() {
  const { c, scheme } = useTheme();
  const { state } = useSession();
  const { settings, hydrated } = useSettings();
  const segments = useSegments();
  const router = useRouter();

  const ready = state !== 'loading' && hydrated;

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (!ready) return;
    const group = segments[0];
    const inAuth = group === '(auth)';

    if (state === 'signedOut' && !inAuth) {
      router.replace(settings.onboarded ? '/(auth)/sign-in' : '/(auth)/welcome');
    } else if (state === 'signedIn' && inAuth) {
      router.replace('/(tabs)');
    }
  }, [ready, state, segments, router, settings.onboarded]);

  if (!ready) {
    // The native splash is still up; this only paints the ground beneath it.
    return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: c.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'none' }} />
        <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
        <Stack.Screen
          name="tasks"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="notifications"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
