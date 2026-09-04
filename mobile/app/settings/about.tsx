import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Application from 'expo-application';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Image } from 'expo-image';
import Constants, { AppOwnership } from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { PulseDot } from '../../src/components/ui/Pulse';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useToast } from '../../src/components/ui/Toast';
import { API_URL, deviceFingerprint, WEB_URL } from '../../src/api/client';
import { shortAddress } from '../../src/lib/format';

/** About: versions, the endpoint this build talks to, and the legal links. */
export default function AboutScreen() {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const router = useRouter();
  const toast = useToast();

  const [device, setDevice] = useState('');

  useEffect(() => {
    void deviceFingerprint().then(setDevice);
  }, []);

  // The manifest is the source of truth; the native binary's own numbers are
  // only meaningful in a standalone build (Expo Go would report Expo Go's).
  const standalone = Constants.appOwnership !== AppOwnership.Expo;
  const version =
    Constants.expoConfig?.version ??
    (standalone ? Application.nativeApplicationVersion : null) ??
    '1.0.0';
  const manifestBuild =
    Platform.OS === 'android'
      ? Constants.expoConfig?.android?.versionCode
      : Constants.expoConfig?.ios?.buildNumber;
  const build = String(
    manifestBuild ?? (standalone ? Application.nativeBuildVersion : null) ?? 1,
  );

  return (
    <Screen>
      <NavBar title={t('settings.about')} transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        {/* Logo hero — the site's glowing glass panel */}
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card glow style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
            <View
              style={{
                borderRadius: radius.xl,
                ...(c.dark ? glow(c.primaryGlow, 2) : null),
              }}
            >
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 84, height: 84, borderRadius: radius.xl }}
                contentFit="contain"
              />
            </View>
            <Text variant="title2" center style={{ marginTop: spacing.md }}>
              {t('app.name')}
            </Text>
            <Text variant="footnote" tone="secondary" center>
              {t('app.tagline')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: spacing.md,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: alpha(c.gold, 0.35),
                backgroundColor: alpha(c.gold, 0.1),
              }}
            >
              <PulseDot color={c.success} size={6} />
              <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                v{version} ({build})
              </Text>
            </View>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
          <SectionLabel>{t('settings.about')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="pricetag-outline"
              tone="brand"
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
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
        </Animated.View>

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
