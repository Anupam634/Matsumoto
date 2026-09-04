import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import Constants from 'expo-constants';

import { Text } from '../../src/components/ui/Text';
import { SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useToast } from '../../src/components/ui/Toast';
import { API_URL, deviceFingerprint, WEB_URL } from '../../src/api/client';
import { shortAddress } from '../../src/lib/format';

/** About: versions, the endpoint this build talks to, and the legal links. */
export default function AboutScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const [device, setDevice] = useState('');

  useEffect(() => {
    void deviceFingerprint().then(setDevice);
  }, []);

  const version = Application.nativeApplicationVersion ?? '1.0.0';
  const build =
    Application.nativeBuildVersion ??
    String(
      Platform.OS === 'android'
        ? (Constants.expoConfig?.android?.versionCode ?? 1)
        : (Constants.expoConfig?.ios?.buildNumber ?? 1),
    );

  return (
    <Screen sunken>
      <NavBar title={t('settings.about')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 82, height: 82, borderRadius: radius.xl }}
            contentFit="contain"
          />
          <Text variant="title2">{t('app.name')}</Text>
          <Text variant="footnote" tone="secondary">
            {t('app.tagline')}
          </Text>
          <Badge label={`v${version} (${build})`} tone="brand" />
        </View>

        <View>
          <SectionLabel>{t('settings.about')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="pricetag-outline"
              title={t('settings.version')}
              value={version}
              chevron={false}
            />
            <ListRow
              icon="hammer-outline"
              title={t('settings.build')}
              value={build}
              chevron={false}
            />
            <ListRow
              icon="server-outline"
              title={t('settings.apiEndpoint')}
              value={API_URL.replace(/^https?:\/\//, '')}
              chevron={false}
              onPress={() => {
                void Clipboard.setStringAsync(API_URL);
                toast.success(t('app.copied'));
              }}
            />
            <ListRow
              icon="phone-portrait-outline"
              title={t('settings.deviceId')}
              value={device ? shortAddress(device, 8, 6) : '—'}
              chevron={false}
              onPress={() => {
                if (!device) return;
                void Clipboard.setStringAsync(device);
                toast.success(t('app.copied'));
              }}
            />
          </ListGroup>
        </View>

        <View>
          <SectionLabel>{t('settings.legal')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="help-circle-outline"
              title={t('account.faq')}
              onPress={() => router.push('/legal/faq')}
            />
            <ListRow
              icon="document-text-outline"
              title={t('account.terms')}
              onPress={() => router.push('/legal/terms')}
            />
            <ListRow
              icon="lock-closed-outline"
              title={t('account.privacy')}
              onPress={() => router.push('/legal/privacy')}
            />
            <ListRow
              icon="globe-outline"
              tone="brand"
              title={t('settings.website')}
              value={WEB_URL.replace(/^https?:\/\//, '')}
              onPress={() =>
                void WebBrowser.openBrowserAsync(WEB_URL).catch(() => {})
              }
            />
          </ListGroup>
        </View>

        <Text variant="caption" tone="tertiary" center>
          {t('landing.footer.disclaimer')}
        </Text>
        <Text variant="caption" tone="tertiary" center>
          {t('landing.footer.copyright')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
