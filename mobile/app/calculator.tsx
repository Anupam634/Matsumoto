import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import { Badge, StatRow } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { NavBar, Screen } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useFeedback } from '../src/lib/feedback';
import { POINTS_PER_TOKEN } from '../src/api/endpoints';
import { formatPoints, formatUsd } from '../src/lib/format';

/** Booster options, mirroring the plans the server sells (SPEC §2). */
const BOOSTERS = [
  { id: 'free', price: 0, rate: 0.9 },
  { id: 'b1', price: 1, rate: 2.9 },
  { id: 'b5', price: 5, rate: 10.9 },
  { id: 'b10', price: 10, rate: 20.9 },
  { id: 'b50', price: 50, rate: 90.9 },
];

/** Referral tiers (SPEC §2) — the same ladder the server applies. */
function tierFor(invites: number): { level: number; multiplier: number } {
  if (invites >= 31) return { level: 6, multiplier: 8 };
  if (invites >= 21) return { level: 5, multiplier: 6 };
  if (invites >= 11) return { level: 4, multiplier: 5 };
  if (invites >= 6) return { level: 3, multiplier: 4 };
  if (invites >= 1) return { level: 2, multiplier: 3 };
  return { level: 1, multiplier: 1 };
}

/**
 * Earnings calculator.
 *
 * Projects a rate from a booster tier and an invite count, using the same
 * formula the mining engine runs — `(base + booster bonus) × referral
 * multiplier` — so the figure here matches what the server would actually pay.
 * Starts from the miner's real numbers rather than a generic example.
 */
export default function CalculatorScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const feedback = useFeedback();
  const { profile, mining } = useSession();

  const [boosterIndex, setBoosterIndex] = useState(1);
  const [invites, setInvites] = useState(profile?.referralCount ?? 5);

  const booster = BOOSTERS[boosterIndex];
  const tier = tierFor(invites);

  const projection = useMemo(() => {
    const hourly = booster.rate * tier.multiplier;
    const daily = hourly * 24;
    const monthly = daily * 30;
    return {
      hourly,
      daily,
      monthly,
      tokens: monthly / POINTS_PER_TOKEN,
    };
  }, [booster.rate, tier.multiplier]);

  const currentRate = mining?.ratePerHour ?? 0;

  return (
    <Screen sunken>
      <NavBar
        title={t('landing.calculator.title')}
        subtitle={t('landing.calculator.subtitle')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* Result, first — the answer is the point of the screen. */}
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <LinearGradient
            colors={[c.primaryMuted, c.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: spacing.lg }}
          >
            <Text variant="overline" tone="tertiary" uppercase>
              {t('landing.calculator.hourlyRate')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
              <Text variant="display" mono>
                {formatPoints(projection.hourly, 2, locale)}
              </Text>
              <Text variant="callout" tone="secondary" weight="700">
                /h
              </Text>
            </View>

            {currentRate > 0 ? (
              <Badge
                label={
                  projection.hourly >= currentRate
                    ? `+${formatPoints(projection.hourly - currentRate, 2, locale)} /h`
                    : `${formatPoints(projection.hourly - currentRate, 2, locale)} /h`
                }
                tone={projection.hourly >= currentRate ? 'success' : 'warning'}
                icon={projection.hourly >= currentRate ? 'trending-up' : 'trending-down'}
                style={{ marginTop: spacing.sm }}
              />
            ) : null}

            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <StatRow
                label={t('landing.calculator.dailyYield')}
                value={`${formatPoints(projection.daily, 1, locale)} pts`}
                mono
              />
              <StatRow
                label={t('landing.calculator.monthlyYield')}
                value={`${formatPoints(projection.monthly, 0, locale)} pts`}
                mono
              />
              <StatRow
                label={t('landing.calculator.onChainPayout')}
                value={`${formatPoints(projection.tokens, 2, locale)} $BONDKOIN`}
                mono
                tone="brand"
                strong
              />
            </View>
          </LinearGradient>
        </Card>

        {/* Booster */}
        <SectionLabel>{t('landing.calculator.selectBooster')}</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {BOOSTERS.map((option, i) => {
            const active = i === boosterIndex;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  feedback.select();
                  setBoosterIndex(i);
                }}
                style={{
                  flexGrow: 1,
                  minWidth: 96,
                  paddingVertical: spacing.md,
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.lg,
                  alignItems: 'center',
                  backgroundColor: active ? c.primaryMuted : c.surface,
                  borderWidth: 1.5,
                  borderColor: active ? c.primary : c.border,
                }}
              >
                <Text
                  variant="callout"
                  weight="700"
                  tone={active ? 'brand' : 'primary'}
                >
                  {option.price === 0
                    ? t('landing.figures.baseRate')
                    : formatUsd(option.price, locale)}
                </Text>
                <Text variant="caption" tone="tertiary" mono>
                  {option.rate} /h
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Invites */}
        <SectionLabel>{t('landing.calculator.selectInvites')}</SectionLabel>
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text variant="headline" mono>
              {invites}
            </Text>
            <Badge
              label={`L${tier.level} · ×${tier.multiplier}`}
              tone="gold"
              icon="ribbon"
            />
          </View>

          <Slider
            value={invites}
            onValueChange={(next) => setInvites(Math.round(next))}
            onSlidingComplete={() => feedback.select()}
            minimumValue={0}
            maximumValue={40}
            step={1}
            minimumTrackTintColor={c.primary}
            maximumTrackTintColor={c.surfaceAlt}
            thumbTintColor={c.primary}
            style={{ marginTop: spacing.sm, height: 40 }}
          />

          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginTop: 2,
            }}
          >
            {['0 ×1', '5 ×3', '10 ×4', '20 ×5', '30 ×6', '31+ ×8'].map((label) => (
              <Text key={label} variant="caption" tone="tertiary" mono style={{ fontSize: 10 }}>
                {label}
              </Text>
            ))}
          </View>
        </Card>

        {/* The formula, spelled out */}
        <View
          style={{
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: c.infoMuted,
          }}
        >
          <Ionicons name="calculator-outline" size={17} color={c.info} />
          <Text variant="caption" style={{ color: c.info, flex: 1 }}>
            {booster.rate} /h × {tier.multiplier} ={' '}
            {formatPoints(projection.hourly, 2, locale)} /h ·{' '}
            {POINTS_PER_TOKEN} {t('withdraw.pointsShort')} = 1 $BONDKOIN
          </Text>
        </View>

        <View style={{ gap: spacing.sm }}>
          <Button
            label={t('landing.calculator.cta')}
            icon="rocket-outline"
            onPress={() => router.push('/(tabs)/boosters')}
            fullWidth
            size="lg"
          />
          <Button
            label={t('referralsScreen.inviteCta')}
            icon="person-add-outline"
            variant="secondary"
            onPress={() => router.push('/referrals')}
            fullWidth
          />
        </View>

        <Text variant="caption" tone="tertiary" center>
          {t('landing.footer.disclaimer')}
        </Text>
      </ScrollView>
    </Screen>
  );
}
