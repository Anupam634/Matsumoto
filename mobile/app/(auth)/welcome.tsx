import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Screen } from '../../src/components/ui/Chrome';
import { PulseDot } from '../../src/components/ui/Pulse';
import { Coin3D } from '../../src/components/mining/Coin3D';
import { LivePill } from '../../src/components/common/AuthShell';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSettings } from '../../src/store/settings';

/**
 * First run — the site's landing hero, folded onto one phone screen.
 *
 * Network status strip, brand row, the pulse-dot badge, the headline with its
 * cyan accent, the terminal card with the rotating coin, the three key
 * figures, then the two CTAs. Shown once; the flag lives in Settings so a
 * reinstall shows it again.
 */
export default function Welcome() {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { update } = useSettings();

  const finish = (destination: '/(auth)/sign-up' | '/(auth)/sign-in') => {
    update({ onboarded: true });
    router.replace(destination);
  };

  const figures = [
    { value: '0.90 /h', label: t('landing.figures.baseRate') },
    { value: '3 : 1', label: t('landing.figures.conversion') },
    { value: '100 PTS', label: t('landing.figures.minWithdrawal') },
  ];

  return (
    <Screen>
      {/* ── Network status strip ── */}
      <View
        style={{
          paddingTop: insets.top,
          backgroundColor: c.dark ? alpha(c.bg, 0.9) : c.chrome,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingHorizontal: spacing.lg,
            height: 32,
          }}
        >
          <PulseDot color={c.success} size={7} />
          <Text variant="caption" tone="gold" weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
            {t('landing.network.mainnetStatus')}
          </Text>
          <Text variant="caption" tone="tertiary" style={{ opacity: 0.6 }}>
            |
          </Text>
          <Text variant="caption" tone="secondary" weight="500" numberOfLines={1} style={{ flex: 1 }}>
            {t('landing.network.chain')}
          </Text>
          <Text variant="caption" tone="success" mono weight="700" numberOfLines={1}>
            {t('landing.network.conversionSpec')}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
      >
        {/* ── Brand row ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 60,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <View style={{ borderRadius: radius.md, ...glow(c.primary, 1) }}>
              <Image
                source={require('../../assets/logo.png')}
                style={{ width: 38, height: 38, borderRadius: radius.md }}
                contentFit="contain"
              />
            </View>
            <View>
              <Text variant="headline" weight="900" style={{ letterSpacing: -0.3 }}>
                {t('app.name')}
              </Text>
              <Text
                mono
                tone="info"
                uppercase
                style={{ fontSize: 10, lineHeight: 13, letterSpacing: 1.8, fontWeight: '800' }}
              >
                Labs · BNB Chain
              </Text>
            </View>
          </View>

          <Button
            label={t('onboarding.skip')}
            variant="ghost"
            size="sm"
            onPress={() => finish('/(auth)/sign-up')}
            style={{ marginRight: -spacing.sm }}
          />
        </View>

        {/* ── Hero copy ── */}
        <Animated.View entering={FadeInDown.duration(420)} style={{ marginTop: spacing.md }}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: radius.pill,
              borderWidth: 1,
              borderColor: alpha(c.primary, 0.4),
              backgroundColor: alpha(c.primary, 0.1),
              maxWidth: '100%',
            }}
          >
            <PulseDot color={c.info} size={7} />
            <Text
              variant="overline"
              tone="brand"
              uppercase
              numberOfLines={1}
              style={{ flexShrink: 1, letterSpacing: 0.8 }}
            >
              {t('landing.hero.badge')}
            </Text>
          </View>

          <Text variant="display" style={{ marginTop: spacing.lg, fontSize: 38, lineHeight: 44 }}>
            {t('landing.hero.title')}{' '}
            <Text variant="display" tone="info" style={{ fontSize: 38, lineHeight: 44 }}>
              {t('landing.hero.titleAccent')}
            </Text>
          </Text>

          <Text variant="body" tone="secondary" style={{ marginTop: spacing.md, maxWidth: 360 }}>
            {t('landing.hero.subtitle')}
          </Text>
        </Animated.View>

        {/* ── Terminal card with the coin ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(460)} style={{ marginTop: spacing.xl }}>
          <Card glow padded={false}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
                paddingHorizontal: spacing.lg,
                paddingVertical: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
                <Dot color={c.danger} />
                <Dot color={c.gold} />
                <Dot color={c.success} />
                <Text
                  variant="caption"
                  tone="tertiary"
                  mono
                  weight="600"
                  numberOfLines={1}
                  style={{ marginLeft: 6, flexShrink: 1 }}
                >
                  bondkoin://node-cluster.bep20
                </Text>
              </View>
              <LivePill label={t('landing.simulator.networkStatus')} />
            </View>

            <View style={{ alignItems: 'center', justifyContent: 'center', height: 236 }}>
              <Coin3D size={150} />
            </View>

            <View
              style={{
                marginHorizontal: spacing.lg,
                marginBottom: spacing.lg,
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.lg,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: alpha(c.gold, 0.3),
                backgroundColor: alpha(c.gold, c.dark ? 0.08 : 0.06),
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <Text variant="overline" tone="tertiary" uppercase>
                {t('landing.simulator.baseSpeed')}
              </Text>
              <Text variant="headline" tone="gold" mono weight="900">
                {t('landing.simulator.simulatedRate')}
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* ── Key figures ── */}
        <Animated.View
          entering={FadeInDown.delay(220).duration(460)}
          style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}
        >
          {figures.map((figure) => (
            <Card key={figure.label} elevation={0} padded={false} style={{ flex: 1, padding: spacing.md }}>
              <Text variant="title3" tone="brand" mono numberOfLines={1} adjustsFontSizeToFit>
                {figure.value}
              </Text>
              <Text
                variant="overline"
                tone="secondary"
                uppercase
                numberOfLines={2}
                style={{ marginTop: 6, fontSize: 10, lineHeight: 13, letterSpacing: 0.8 }}
              >
                {figure.label}
              </Text>
            </Card>
          ))}
        </Animated.View>

        {/* ── CTAs ── */}
        <Animated.View
          entering={FadeInDown.delay(320).duration(460)}
          style={{ gap: spacing.sm, marginTop: spacing.xl }}
        >
          <Button
            label={t('auth.createAccount')}
            iconRight="arrow-forward"
            onPress={() => finish('/(auth)/sign-up')}
            fullWidth
            size="lg"
          />
          <Button
            label={t('auth.haveAccount')}
            variant="secondary"
            onPress={() => finish('/(auth)/sign-in')}
            fullWidth
            size="lg"
          />

          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.sm,
              marginTop: spacing.md,
              paddingTop: spacing.md,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}
          >
            <Text variant="caption" tone="success" weight="700">
              ✓
            </Text>
            <Text variant="caption" tone="tertiary" numberOfLines={1} style={{ flexShrink: 1 }}>
              {t('landing.hero.verifiedNode')}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </Screen>
  );
}

/** One of the three terminal-window dots. */
function Dot({ color }: { color: string }) {
  const { alpha } = useTheme();
  return (
    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: alpha(color, 0.8) }} />
  );
}
