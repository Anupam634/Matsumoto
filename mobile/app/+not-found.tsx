import React from 'react';
import { useRouter } from 'expo-router';
import { Button } from '../src/components/ui/Button';
import { EmptyState, NavBar, Screen } from '../src/components/ui/Chrome';
import { useT } from '../src/i18n';

/** Anything the router cannot match — a stale deep link, usually. */
export default function NotFound() {
  const t = useT();
  const router = useRouter();

  return (
    <Screen sunken>
      <NavBar title={t('app.name')} onBack={null} />
      <EmptyState
        icon="compass-outline"
        title={t('app.somethingWrong')}
        body={t('app.unavailable')}
        action={
          <Button
            label={t('tabs.mine')}
            icon="home-outline"
            onPress={() => router.replace('/(tabs)')}
          />
        }
      />
    </Screen>
  );
}
