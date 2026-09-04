import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { NavBar, Screen } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useFeedback } from '../src/lib/feedback';
import { POINTS_PER_TOKEN, type MiningStatus } from '../src/api/endpoints';
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
 * The web calculator's starting point when nothing is known about the
 * visitor: the $10 plan and a dozen invites. Used here only when the session
 * has not loaded, so both surfaces open on the same worked example.
 */
const DEFAULT_BOOSTER_INDEX = 3;
const DEFAULT_INVITES = 12;

/** The plan whose rate is nearest the miner's own base rate. */
function boosterIndexFor(status: MiningStatus | null): number {
  if (!status) return DEFAULT_BOOSTER_INDEX;
  if (status.activeBoosters <= 0) return 0;
  const base = status.ratePerHour / Math.max(1, status.referralTier.multiplier);
  let best = 0;
  BOOSTERS.forEach((option, i) => {
    if (Math.abs(option.rate - base) < Math.abs(BOOSTERS[best].rate - base)) best = i;
  });
  return best;
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
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const feedback = useFeedback();
  const { profile, mining } = useSession();

  const [boosterIndex, setBoosterIndex] = useState(() => boosterIndexFor(mining));
  const [invites, setInvites] = useState(
    () => profile?.referralCount ?? DEFAULT_INVITES,
  );

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
  const delta = projection.hourly - currentRate;

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
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card glow>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text variant="overline" tone="brand" uppercase>
                {t('landing.calculator.estimatedYield')}
              </Text>
              {currentRate > 0 ? (
                <Badge
                  label={`${delta >= 0 ? '+' : ''}${formatPoints(delta, 2, locale)} /h`}
                  tone={delta >= 0 ? 'success' : 'warning'}
                  icon={delta >= 0 ? 'trending-up' : 'trending-down'}
                />
              ) : null}
            </View>

            <ResultRow label={t('landing.calculator.hourlyRate')}>
              <Text variant="title3" mono tone="info">
                {formatPoints(projection.hourly, 2, locale)}
                <Text variant="caption" tone="tertiary" weight="700">
                  {'  '}BONDKOIN/h
                </Text>
              </Text>
            </ResultRow>
            <ResultRow label={t('landing.calculator.dailyYield')}>
              <Text variant="title3" mono>
                {formatPoints(projection.daily, 1, locale)}
                <Text variant="caption" tone="tertiary" weight="700">
                  {'  '}{t('dashboard.pointsShort').toUpperCase()}
                </Text>
              </Text>
            </ResultRow>
            <ResultRow label={t('landing.calculator.monthlyYield')}>
              <Text variant="title2" mono tone="info">
                {formatPoints(projection.monthly, 0, locale)}
                <Text variant="caption" tone="tertiary" weight="700">
                  {'  '}{t('dashboard.pointsShort').toUpperCase()}
                </Text>
              </Text>
            </ResultRow>

            {/* On-chain payout — the blue-tinted tile at the bottom of the web card */}
            <View
              style={{
                marginTop: spacing.md,
                padding: spacing.lg,
                borderRadius: radius.lg,
                backgroundColor: alpha(c.primary, 0.1),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.3),
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Text variant="overline" tone="brand" uppercase center>
                {t('landing.calculator.onChainPayout')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text variant="title1" mono tone="info">
                  ~{formatPoints(projection.tokens, 0, locale)}
                </Text>
                <Text variant="callout" tone="info" weight="800">
                  $BONDKOIN
                </Text>
              </View>
              <Text variant="caption" tone="tertiary" center>
                {t('withdraw.paidOnChain')} · BEP-20
              </Text>
            </View>
          </Card>
        </Animated.View>

        {/* Booster */}
        <Animated.View entering={FadeInDown.delay(60).duration(260)}>
          <Card>
            <Text variant="overline" tone="gold" uppercase>
              {t('landing.calculator.selectBooster')}
            </Text>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: spacing.sm,
                marginTop: spacing.md,
              }}
            >
              {BOOSTERS.map((option, i) => (
                <BoosterTile
                  key={option.id}
                  label={
                    option.price === 0
                      ? t('landing.figures.baseRate')
                      : formatUsd(option.price, locale)
                  }
                  rate={`${option.rate} /h`}
                  active={i === boosterIndex}
                  onPress={() => {
                    feedback.select();
                    setBoosterIndex(i);
                  }}
                />
              ))}
            </View>
          </Card>
        </Animated.View>

        {/* Invites */}
        <Animated.View entering={FadeInDown.delay(120).duration(260)}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text variant="overline" tone="gold" uppercase style={{ flex: 1 }}>
                {t('landing.calculator.selectInvites')}
              </Text>
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  backgroundColor: alpha(c.gold, 0.15),
                  borderWidth: 1,
                  borderColor: alpha(c.gold, 0.3),
                }}
              >
                <Text variant="caption" tone="gold" mono weight="700">
                  {invites} · L{tier.level} ×{tier.multiplier}
                </Text>
              </View>
            </View>

            <Slider
              value={invites}
              onValueChange={(next) => setInvites(Math.round(next))}
              onSlidingComplete={() => feedback.select()}
              minimumValue={0}
              maximumValue={50}
              step={1}
              minimumTrackTintColor={c.gold}
              maximumTrackTintColor={c.dark ? 'rgba(255,255,255,0.12)' : c.border}
              thumbTintColor={c.gold}
              style={{ marginTop: spacing.md, height: 40 }}
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
        </Animated.View>

        {/* The formula, spelled out — the web's "Reward Calculation Engine" note */}
        <Animated.View entering={FadeInDown.delay(180).duration(260)}>
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.dark ? 'rgba(2,6,23,0.6)' : c.surfaceAlt,
              borderWidth: 1,
              borderColor: c.border,
            }}
          >
            <Ionicons name="calculator-outline" size={17} color={c.primary} />
            <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
              {booster.rate} /h × {tier.multiplier} (L{tier.level}) ={' '}
              <Text variant="caption" tone="info" mono weight="800">
                {formatPoints(projection.hourly, 2, locale)} /h
              </Text>
              {' · '}
              {POINTS_PER_TOKEN} {t('withdraw.pointsShort')} = 1 $BONDKOIN
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(260)} style={{ gap: spacing.sm }}>
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
        </Animated.View>

        <Text variant="caption" tone="tertiary" center>
          {t('landing.footer.disclaimer')}
        </Text>
      </ScrollView>
    </Screen>
  );
}

/** One line of the results card: label left, mono figure right, hairline below. */
function ResultRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { c, spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: c.border,
      }}
    >
      <Text variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

/**
 * A booster option. The selected tile takes the amber ring and lifts to
 * 1.05×, as the web's does; the others sit flat on the recessed ground.
 */
function BoosterTile({
  label,
  rate,
  active,
  onPress,
}: {
  label: string;
  rate: string;
  active: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const scale = useSharedValue(1);
  const lift = useSharedValue(active ? 1.04 : 1);

  React.useEffect(() => {
    lift.value = withSpring(active ? 1.04 : 1, { damping: 18, stiffness: 260 });
  }, [active, lift]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * lift.value }],
  }));

  return (
    <Animated.View
      style={[
        { flexGrow: 1, minWidth: 96, borderRadius: radius.lg },
        active ? glow(c.gold, c.dark ? 2 : 1) : null,
        style,
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={onPress}
        style={{
          minHeight: 60,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          borderRadius: radius.lg,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: active
            ? alpha(c.gold, c.dark ? 0.2 : 0.1)
            : c.dark
              ? 'rgba(2,6,23,0.6)'
              : c.surfaceAlt,
          borderWidth: 1,
          borderColor: active ? c.gold : c.border,
        }}
      >
        <Text variant="caption" weight="700" tone={active ? 'primary' : 'secondary'} center>
          {label}
        </Text>
        <Text
          variant="callout"
          mono
          weight="800"
          tone={active ? 'gold' : 'tertiary'}
          style={{ marginTop: 2 }}
        >
          {rate}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
