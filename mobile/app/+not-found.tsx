import React from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Button } from '../src/components/ui/Button';
import { NavBar, Screen } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useT } from '../src/i18n';

/** Anything the router cannot match — a stale deep link, usually. */
export default function NotFound() {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const router = useRouter();

  return (
    <Screen>
      <NavBar title={t('app.name')} onBack={null} transparent />
      <View style={{ flex: 1, justifyContent: 'center', padding: spacing.lg }}>
        <Animated.View entering={FadeInDown.duration(300)}>
          <Card glow style={{ alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm }}>
            <View
              style={{
                width: 64,
                height: 64,
                borderRadius: radius.lg,
                backgroundColor: alpha(c.primary, 0.15),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.3),
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: spacing.sm,
              }}
            >
              <Ionicons name="compass-outline" size={30} color={c.primary} />
            </View>
            <Text variant="caption" mono tone="gold" uppercase style={{ fontSize: 10, letterSpacing: 1.2 }}>
              404
            </Text>
            <Text variant="title2" center>
              {t('app.notFoundTitle')}
            </Text>
            <Text variant="footnote" tone="secondary" center style={{ maxWidth: 300 }}>
              {t('app.notFoundBody')}
            </Text>
            <Button
              label={t('app.goHome')}
              icon="home-outline"
              onPress={() => router.replace('/(tabs)')}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        </Animated.View>
      </View>
    </Screen>
  );
}
