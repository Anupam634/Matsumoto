import React from 'react';
import { Redirect } from 'expo-router';
import { useSession } from '../src/store/session';
import { useSettings } from '../src/store/settings';
import { Screen, Loading } from '../src/components/ui/Chrome';

/**
 * Entry route.
 *
 * Sends the miner straight to the dashboard when a session exists, and to
 * onboarding or sign-in when it does not. `RootNavigator` handles the same
 * decision for deep links; this only covers a cold launch at "/".
 */
export default function Index() {
  const { state } = useSession();
  const { settings, hydrated } = useSettings();

  if (state === 'loading' || !hydrated) {
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  }

  if (state === 'signedIn') return <Redirect href="/(tabs)" />;
  return (
    <Redirect href={settings.onboarded ? '/(auth)/sign-in' : '/(auth)/welcome'} />
  );
}
