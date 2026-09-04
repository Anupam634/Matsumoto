import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSettings } from '../../src/store/settings';
import { useFeedback } from '../../src/lib/feedback';

const { width } = Dimensions.get('window');

/**
 * First-run carousel.
 *
 * Three slides that say what the product actually is — accrual, boosters and
 * referrals, on-chain payout — before asking anyone to create an account.
 * Shown once; the flag lives in Settings so a reinstall shows it again.
 */
export default function Welcome() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const t = useT();
  const { update } = useSettings();
  const feedback = useFeedback();

  const [page, setPage] = useState(0);
  const scroller = useRef<ScrollView>(null);

  const slides = [
    {
      icon: 'flash' as const,
      tint: c.gold,
      title: t('onboarding.slide1Title'),
      body: t('onboarding.slide1Body'),
    },
    {
      icon: 'rocket' as const,
      tint: c.primary,
      title: t('onboarding.slide2Title'),
      body: t('onboarding.slide2Body'),
    },
    {
      icon: 'wallet' as const,
      tint: c.success,
      title: t('onboarding.slide3Title'),
      body: t('onboarding.slide3Body'),
    },
  ];

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / width);
    if (next !== page) {
      setPage(next);
      feedback.select();
    }
  };

  const finish = (destination: '/(auth)/sign-up' | '/(auth)/sign-in') => {
    update({ onboarded: true });
    router.replace(destination);
  };

  const isLast = page === slides.length - 1;

  return (
    <Screen>
      <LinearGradient
        colors={[c.primaryMuted, c.bg]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />

      <View
        style={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 34, height: 34, borderRadius: radius.sm }}
            contentFit="contain"
          />
          <View>
            <Text variant="headline">{t('app.name')}</Text>
            <Text variant="caption" tone="tertiary">
              {t('app.tagline')}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => finish('/(auth)/sign-up')}
        >
          <Text variant="callout" tone="secondary" weight="600">
            {t('onboarding.skip')}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        style={{ flex: 1 }}
      >
        {slides.map((slide, i) => (
          <View
            key={slide.title}
            style={{
              width,
              paddingHorizontal: spacing.xl,
              alignItems: 'center',
              justifyContent: 'center',
              gap: spacing.lg,
            }}
          >
            <Animated.View
              entering={FadeInDown.delay(80).duration(420)}
              style={{
                width: 108,
                height: 108,
                borderRadius: radius.xxl,
                backgroundColor: c.surface,
                borderWidth: 1,
                borderColor: c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name={slide.icon} size={46} color={slide.tint} />
            </Animated.View>

            <View style={{ gap: spacing.sm, alignItems: 'center' }}>
              <Text variant="title1" center>
                {slide.title}
              </Text>
              <Text
                variant="body"
                tone="secondary"
                center
                style={{ maxWidth: 330 }}
              >
                {slide.body}
              </Text>
            </View>

            {i === 2 ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginTop: spacing.sm,
                }}
              >
                <Figure label="0.90 /h" caption={t('landing.figures.baseRate')} />
                <Figure label="3 : 1" caption={t('landing.figures.conversion')} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View
        style={{
          paddingHorizontal: spacing.xl,
          paddingBottom: insets.bottom + spacing.xl,
          gap: spacing.lg,
        }}
      >
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 7,
          }}
        >
          {slides.map((slide, i) => (
            <View
              key={slide.title}
              style={{
                width: i === page ? 22 : 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: i === page ? c.primary : c.borderStrong,
              }}
            />
          ))}
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={isLast ? t('auth.createAccount') : t('app.next')}
            iconRight={isLast ? undefined : 'arrow-forward'}
            onPress={() => {
              if (isLast) {
                finish('/(auth)/sign-up');
                return;
              }
              const next = page + 1;
              setPage(next);
              scroller.current?.scrollTo({ x: next * width, animated: true });
            }}
            fullWidth
            size="lg"
          />
          <Button
            label={t('auth.haveAccount')}
            variant="ghost"
            onPress={() => finish('/(auth)/sign-in')}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

function Figure({ label, caption }: { label: string; caption: string }) {
  const { c, spacing, radius } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        alignItems: 'center',
        minWidth: 132,
      }}
    >
      <Text variant="title3" mono tone="brand">
        {label}
      </Text>
      <Text variant="caption" tone="tertiary" center numberOfLines={2}>
        {caption}
      </Text>
    </View>
  );
}
