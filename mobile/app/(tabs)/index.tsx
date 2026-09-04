import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTabContentInset } from '../../src/lib/layout';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button, IconButton } from '../../src/components/ui/Button';
import { ConfirmSheet } from '../../src/components/ui/Sheet';
import { EmptyState, ErrorNote, Screen, Skeleton } from '../../src/components/ui/Chrome';
import { NodeTerminal } from '../../src/components/mining/NodeTerminal';
import { violetOf } from '../../src/components/mining/Effects';
import { Sparkline } from '../../src/components/mining/Telemetry';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useSettings } from '../../src/store/settings';
import { useNotifications } from '../../src/store/notifications';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData, useCountUp, useLiveAccrual, useNow } from '../../src/lib/hooks';
import {
  claimMining,
  getBoosters,
  POINTS_PER_TOKEN,
  WITHDRAWAL_MIN_POINTS,
  type BoosterOverview,
  type BoosterPlanDto,
  type LedgerEntryDto,
  type LedgerReason,
  type Profile,
} from '../../src/api/endpoints';
import { errorMessage, WEB_URL } from '../../src/api/client';
import { countdownLabel, formatPoints, relativeTime } from '../../src/lib/format';

/**
 * The mining dashboard — the app's home.
 *
 * A native cut of the web dashboard: the node terminal (the landing page's
 * miner visualizer fused with the hero's Mine control), the balance panel,
 * the four stat cards, and the rails and panels below them in the same order
 * as the site.
 */
export default function MineScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabContentInset();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const feedback = useFeedback();

  const { profile, mining, history, error, refreshing, refresh, patch } =
    useSession();
  const { settings } = useSettings();
  const { unreadCount } = useNotifications();

  const [claiming, setClaiming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [balanceHidden, setBalanceHidden] = useState(settings.privateBalance);

  // Flipping the preference in Settings should take effect on return, not
  // only on the next cold start.
  useEffect(() => {
    setBalanceHidden(settings.privateBalance);
  }, [settings.privateBalance]);

  const pending = useLiveAccrual(mining);
  const now = useNow();

  // The plan rail is catalogue data — a failure here must not blank the
  // dashboard, so its error is simply not shown.
  const loadBoosters = useCallback(() => getBoosters(), []);
  const toMessage = useCallback((err: unknown) => errorMessage(err, t('app.offline')), [t]);
  const { data: boosters, reload: reloadBoosters } = useAsyncData<BoosterOverview>(
    loadBoosters,
    toMessage,
  );

  // The cooldown can lapse between polls; trust the clock as well as the
  // server's last word so the control lights up the second it is allowed to.
  const cooldownOver =
    !!mining?.nextClaimAt && now >= Date.parse(mining.nextClaimAt);
  const ready = !!mining && (mining.canClaim || cooldownOver) && !claiming;
  const progress =
    mining && mining.maxPendingPoints > 0
      ? Math.min(1, pending / mining.maxPendingPoints)
      : 0;
  const countdown = countdownLabel(mining?.nextClaimAt ?? null, now);

  async function mine() {
    setClaimError(null);
    setClaiming(true);
    feedback.strike();
    try {
      const res = await claimMining();
      feedback.reward();
      setCelebrate(res.earnedPoints);
      setTimeout(() => setCelebrate(null), 1700);

      // Reflect the claim immediately; the next poll confirms it.
      patch({
        profile: {
          pointsBalance: (profile?.pointsBalance ?? 0) + res.earnedPoints,
        },
        mining: {
          pendingPoints: 0,
          canClaim: false,
          nextClaimAt: res.nextClaimAt,
        },
      });
      await refresh();
    } catch (err) {
      feedback.error();
      setClaimError(errorMessage(err, t('app.offline')));
    } finally {
      setClaiming(false);
    }
  }

  const onMinePress = () => {
    if (settings.quickMine) return void mine();
    setConfirming(true);
  };

  const onRefresh = () => {
    void refresh({ silent: false });
    void reloadBoosters({ silent: true });
  };

  const loading = !profile || !mining;
  const plans = boosters?.plans ?? [];

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: tabInset,
          gap: spacing.md,
        }}
      >
        {/* ── Top bar: logo + wordmark, bell, settings ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            marginBottom: spacing.xs,
          }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 40, height: 40, borderRadius: radius.md }}
            contentFit="contain"
          />
          <View style={{ flex: 1, marginLeft: 2 }}>
            <Text variant="headline" weight="800" style={{ letterSpacing: -0.3 }}>
              BONDKOIN
            </Text>
            <Text
              variant="overline"
              tone="tertiary"
              uppercase
              numberOfLines={1}
              style={{ fontSize: 9.5, letterSpacing: 1.6, marginTop: 1 }}
            >
              {t('dashboard.cloudMining')}
            </Text>
          </View>
          <IconButton
            icon="notifications-outline"
            accessibilityLabel={t('notify.title')}
            badge={unreadCount}
            onPress={() => router.push('/notifications')}
          />
          <IconButton
            icon="settings-outline"
            accessibilityLabel={t('settings.title')}
            onPress={() => router.push('/settings')}
          />
        </View>

        {error ? <ErrorNote message={error} onRetry={() => void refresh()} retryLabel={t('app.retry')} /> : null}
        {claimError ? <ErrorNote message={claimError} /> : null}

        {/* ── 1. Node terminal ── */}
        {loading ? (
          <Card glow>
            <View style={{ gap: spacing.md }}>
              <Skeleton height={14} width="60%" />
              <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
                <Skeleton height={200} width={200} radius={100} />
              </View>
              <Skeleton height={88} radius={radius.lg} />
              <View style={{ alignItems: 'center' }}>
                <Skeleton height={158} width={158} radius={79} />
              </View>
              <Skeleton height={52} radius={radius.md} />
            </View>
          </Card>
        ) : (
          <NodeTerminal
            mining={mining}
            pending={pending}
            progress={progress}
            ready={ready}
            claiming={claiming}
            countdown={countdown}
            now={now}
            celebrate={celebrate}
            locale={locale}
            onMine={onMinePress}
          />
        )}

        {/* ── 2. Balance ── */}
        <BalancePanel
          profile={profile}
          activeBoosters={mining?.activeBoosters ?? null}
          hidden={balanceHidden}
          canHide={settings.privateBalance}
          onToggleHidden={() => {
            feedback.select();
            setBalanceHidden((v) => !v);
          }}
          locale={locale}
        />

        {/* ── 3. Stat grid ── */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard
            i={0}
            chip={c.success}
            icon="cash-outline"
            label={t('dashboard.totalEarnings')}
            value={history?.lifetimeEarnedPoints ?? 0}
            decimals={2}
            spark
            locale={locale}
          />
          <StatCard
            i={1}
            chip={c.primary}
            icon="hardware-chip-outline"
            label={t('dashboard.hashRate')}
            value={mining?.ratePerHour ?? 0}
            decimals={2}
            suffix=" /h"
            locale={locale}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatCard
            i={2}
            chip={violetOf(c)}
            icon="document-text-outline"
            label={t('dashboard.boosters')}
            value={mining?.activeBoosters ?? 0}
            cta={t('dashboard.buyBoosters')}
            onPress={() => router.push('/(tabs)/boosters')}
            locale={locale}
          />
          <StatCard
            i={3}
            chip={c.info}
            icon="people-outline"
            label={t('dashboard.referrals')}
            value={profile?.referralCount ?? 0}
            badge={
              mining
                ? `L${mining.referralTier.level} ×${mining.referralTier.multiplier}`
                : undefined
            }
            cta={t('dashboard.viewReferrals')}
            onPress={() => router.push('/referrals')}
            locale={locale}
          />
        </View>

        {/* ── 4. Leaderboard banner ── */}
        <LeaderboardBanner onPress={() => router.push('/(tabs)/leaderboard')} />

        {/* ── Booster plans rail ── */}
        {plans.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(120).duration(360)}>
            <Card padded={false} style={{ paddingVertical: spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="headline">{t('dashboard.plansTitle')}</Text>
                  <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                    {t('dashboard.plansSubtitle')}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    feedback.select();
                    router.push('/(tabs)/boosters');
                  }}
                  style={{ minHeight: 32, justifyContent: 'center' }}
                >
                  <Text variant="callout" tone="brand" weight="700">
                    {t('dashboard.viewAll')} →
                  </Text>
                </Pressable>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.lg,
                  paddingBottom: spacing.xs,
                  gap: spacing.md,
                }}
              >
                {plans.map((p, i) => (
                  <PlanCard
                    key={p.id}
                    plan={p}
                    popular={i === 1}
                    locale={locale}
                    onPress={() => router.push('/(tabs)/boosters')}
                  />
                ))}
              </ScrollView>
            </Card>
          </Animated.View>
        ) : null}

        {/* ── Marketplace ecosystem banner ── */}
        <MarketplaceBanner onPress={() => router.push('/(tabs)/market')} />

        {/* ── Platform facts ── */}
        <Card>
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <Feature chip={c.primary} icon="flash" title={t('dashboard.f1t')} body={t('dashboard.f1b')} />
            <Feature chip={c.success} icon="time-outline" title={t('dashboard.f2t')} body={t('dashboard.f2b')} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
            <Feature chip={violetOf(c)} icon="swap-horizontal" title={t('dashboard.f3t')} body={t('dashboard.f3b')} />
            <Feature chip={c.info} icon="shield-checkmark-outline" title={t('dashboard.f4t')} body={t('dashboard.f4b')} />
          </View>
        </Card>

        {/* ── Tasks (their own screen on mobile) ── */}
        <Card onPress={() => router.push('/tasks')} accessibilityLabel={t('dashboard.tasksTitle')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <Chip color={c.gold} icon="gift-outline" size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">{t('dashboard.tasksTitle')}</Text>
              <Text variant="caption" tone="secondary" numberOfLines={2}>
                {t('dashboard.tasksSubtitle')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
          </View>
        </Card>

        {/* ── Recent activity ── */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: spacing.sm,
            }}
          >
            <Text variant="headline">{t('dashboard.recentTitle')}</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                feedback.select();
                router.push('/history');
              }}
              style={{ minHeight: 32, justifyContent: 'center' }}
            >
              <Text variant="callout" tone="brand" weight="700">
                {t('app.seeAll')} →
              </Text>
            </Pressable>
          </View>
          {!history ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={44} radius={12} />
              ))}
            </View>
          ) : history.entries.length === 0 ? (
            <EmptyState icon="sparkles-outline" title={t('mine.activityEmpty')} />
          ) : (
            <View>
              {history.entries.slice(0, 5).map((entry, i) => (
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.delay(i * 40).duration(260)}
                >
                  <LedgerRow
                    entry={entry}
                    last={i === Math.min(4, history.entries.length - 1)}
                    locale={locale}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Referral panel ── */}
        {profile ? (
          <ReferralPanel
            profile={profile}
            locale={locale}
            onViewReferrals={() => router.push('/referrals')}
          />
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          void mine();
        }}
        icon="flash"
        title={t('mine.confirmTitle')}
        body={t('mine.confirmBody', { points: formatPoints(pending, 2, locale) })}
        confirmLabel={t('mine.confirmCta')}
        cancelLabel={t('app.cancel')}
      />
    </Screen>
  );
}

/* ───────────────────────────── Balance panel ───────────────────────────── */

function BalancePanel({
  profile,
  activeBoosters,
  hidden,
  canHide,
  onToggleHidden,
  locale,
}: {
  profile: Profile | null;
  activeBoosters: number | null;
  hidden: boolean;
  canHide: boolean;
  onToggleHidden: () => void;
  locale: string;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const router = useRouter();
  const feedback = useFeedback();
  const balance = useCountUp(profile?.pointsBalance ?? 0);
  const loading = !profile;

  return (
    <Card>
      <Text variant="overline" tone="tertiary" uppercase>
        {t('dashboard.balance')}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('dashboard.balance')}
        onPress={onToggleHidden}
        disabled={!canHide}
        style={{ marginTop: 6 }}
      >
        {loading ? (
          <Skeleton height={36} width="60%" />
        ) : hidden ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text variant="title1" mono>
              ••••••
            </Text>
            <Text variant="caption" tone="tertiary">
              {t('mine.hideBalance')}
            </Text>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
            <Text variant="display" mono numberOfLines={1} adjustsFontSizeToFit>
              {formatPoints(balance, 2, locale)}
            </Text>
            <Text variant="callout" tone="gold" weight="800">
              {t('dashboard.pointsShort')}
            </Text>
          </View>
        )}
      </Pressable>

      {!loading && !hidden ? (
        <Text variant="footnote" tone="secondary" style={{ marginTop: 4 }}>
          ≈{' '}
          <Text variant="footnote" tone="info" mono weight="800">
            {formatPoints(balance / POINTS_PER_TOKEN, 4, locale)}
          </Text>{' '}
          $BONDKOIN{' '}
          <Text variant="caption" tone="tertiary">
            ({t('dashboard.atRate')})
          </Text>
        </Text>
      ) : null}

      <Badge
        label={t('dashboard.chainIndicator')}
        tone="gold"
        icon="link-outline"
        style={{ marginTop: spacing.md }}
      />

      {/* KYC gate */}
      {profile ? (
        profile.kycStatus === 'APPROVED' ? (
          <View
            style={{
              marginTop: spacing.lg,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.success, 0.1),
              borderWidth: 1,
              borderColor: alpha(c.success, 0.2),
            }}
          >
            <Text variant="footnote" weight="600" tone="success">
              ✓ {t('dashboard.kycVerified')}
            </Text>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              feedback.select();
              router.push('/kyc');
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.md,
              marginTop: spacing.lg,
              padding: spacing.md,
              minHeight: 44,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.gold, 0.1),
              borderWidth: 1,
              borderColor: alpha(c.gold, pressed ? 0.5 : 0.25),
            })}
          >
            <Text variant="footnote" tone="gold" style={{ flex: 1 }}>
              {t('dashboard.kycRequired', { status: profile.kycStatus })}
            </Text>
            <Text variant="footnote" tone="gold" weight="800">
              {t('dashboard.verifyCta')} →
            </Text>
          </Pressable>
        )
      ) : null}

      {/* Mini tiles */}
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg }}>
        <MiniTile
          label={t('dashboard.minWithdrawal')}
          value={`${WITHDRAWAL_MIN_POINTS} ${t('dashboard.pointsShort')}`}
        />
        <MiniTile
          label={t('dashboard.boosters')}
          value={activeBoosters === null ? '—' : String(activeBoosters)}
        />
      </View>
    </Card>
  );
}

function MiniTile({ label, value }: { label: string; value: string }) {
  const { c, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.md,
        borderRadius: radius.md,
        backgroundColor: c.surfaceAlt,
      }}
    >
      <Text variant="caption" tone="tertiary" numberOfLines={1}>
        {label}
      </Text>
      <Text variant="callout" weight="800" mono style={{ marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/* ─────────────────────────────── Stat cards ────────────────────────────── */

/** The dashboard's coloured square icon chip. */
function Chip({
  color,
  icon,
  size = 36,
}: {
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
}) {
  const { alpha, radius } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius.md,
        backgroundColor: alpha(color, 0.14),
        borderWidth: 1,
        borderColor: alpha(color, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color={color} />
    </View>
  );
}

function StatCard({
  i,
  chip,
  icon,
  label,
  value,
  decimals = 0,
  suffix = '',
  badge,
  spark,
  cta,
  onPress,
  locale,
}: {
  i: number;
  chip: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  badge?: string;
  spark?: boolean;
  cta?: string;
  onPress?: () => void;
  locale: string;
}) {
  const { c, spacing, alpha, radius } = useTheme();
  const animated = useCountUp(value);
  const violet = violetOf(c);
  return (
    <Animated.View
      entering={FadeInDown.delay(80 + i * 70).duration(380)}
      style={{ flex: 1 }}
    >
      <Card
        onPress={onPress}
        accessibilityLabel={`${label}: ${formatPoints(value, decimals, locale)}${suffix}`}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: spacing.sm,
          }}
        >
          <Chip color={chip} icon={icon} />
          {spark ? <Sparkline color={c.success} /> : null}
        </View>

        <Text
          variant="overline"
          tone="tertiary"
          uppercase
          numberOfLines={1}
          style={{ marginTop: spacing.md, letterSpacing: 0.8 }}
        >
          {label}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
          <Text variant="title2" mono numberOfLines={1}>
            {formatPoints(animated, decimals, locale)}
            {suffix}
          </Text>
          {badge ? (
            <View
              style={{
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: alpha(violet, 0.15),
              }}
            >
              <Text variant="caption" weight="800" style={{ color: violet, fontSize: 10.5 }}>
                {badge}
              </Text>
            </View>
          ) : null}
        </View>
        {cta ? (
          <Text variant="caption" tone="brand" weight="800" numberOfLines={1} style={{ marginTop: 4 }}>
            {cta} →
          </Text>
        ) : null}
      </Card>
    </Animated.View>
  );
}

/* ──────────────────────────── Banners & rails ──────────────────────────── */

function LeaderboardBanner({ onPress }: { onPress: () => void }) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  return (
    <Animated.View entering={FadeInDown.delay(60).duration(360)}>
      <Card
        onPress={onPress}
        accent={alpha(c.success, 0.25)}
        accessibilityLabel={t('leaderboard.title')}
      >
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(c.success, c.dark ? 0.12 : 0.08), alpha(c.success, 0)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.xl - 1 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.md,
              backgroundColor: alpha(c.success, 0.15),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20, lineHeight: 24 }}>🏆</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="headline" weight="800" numberOfLines={1}>
              {t('leaderboard.title')}
            </Text>
            <Text variant="caption" tone="secondary" numberOfLines={1}>
              {t('leaderboard.yourRank')} · {t('leaderboard.catEarnings')}
            </Text>
          </View>
          <Text variant="callout" tone="success" weight="800">
            →
          </Text>
        </View>
      </Card>
    </Animated.View>
  );
}

function PlanCard({
  plan,
  popular,
  locale,
  onPress,
}: {
  plan: BoosterPlanDto;
  popular: boolean;
  locale: string;
  onPress: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  return (
    <Card
      onPress={onPress}
      accent={popular ? alpha(c.gold, 0.6) : undefined}
      glow={popular}
      accessibilityLabel={`$${plan.priceUsd} / ${plan.durationDays} ${t('dashboard.days')}`}
      style={{ width: 216 }}
    >
      {popular ? (
        <View style={{ position: 'absolute', top: spacing.md, right: spacing.md, borderRadius: radius.pill, overflow: 'hidden' }}>
          <LinearGradient
            colors={[...c.goldGradient] as [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingHorizontal: 9, paddingVertical: 3 }}
          >
            <Text variant="overline" uppercase style={{ color: c.onGold, fontSize: 9.5 }}>
              {t('dashboard.popular')}
            </Text>
          </LinearGradient>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
        <Text variant="title1" mono tone="gold">
          ${plan.priceUsd}
        </Text>
        <Text variant="overline" tone="tertiary" uppercase>
          / {plan.durationDays}d
        </Text>
      </View>

      <View
        style={{
          alignSelf: 'flex-start',
          marginTop: spacing.sm,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.sm,
          backgroundColor: alpha(c.success, 0.1),
          borderWidth: 1,
          borderColor: alpha(c.success, 0.3),
        }}
      >
        <Text variant="caption" weight="800" tone="success">
          +{formatPoints(plan.rateBonusPerHour, 2, locale)} BONDKOIN/h
        </Text>
      </View>

      <View
        style={{
          marginTop: spacing.lg,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: c.border,
          gap: 6,
        }}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="caption" tone="secondary">
            {t('dashboard.resultingRate')}
          </Text>
          <Text variant="caption" mono weight="800" tone="gold">
            {formatPoints(plan.resultingRatePerHour, 2, locale)} /h
          </Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
          <Text variant="caption" tone="secondary">
            {t('dashboard.duration')}
          </Text>
          <Text variant="caption" mono weight="700" tone="secondary">
            {plan.durationDays} {t('dashboard.days')}
          </Text>
        </View>
      </View>

      <Button
        label={`${t('dashboard.getStarted')} →`}
        onPress={onPress}
        variant="primary"
        size="md"
        fullWidth
        style={{ marginTop: spacing.lg }}
      />
    </Card>
  );
}

function MarketplaceBanner({ onPress }: { onPress: () => void }) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  return (
    <Animated.View entering={FadeInDown.delay(100).duration(360)}>
      <Card accent={alpha(c.primary, 0.3)} accessibilityLabel={t('mine.marketplaceTitle')}>
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(c.primary, 0), alpha(c.primary, c.dark ? 0.22 : 0.08)]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.xl - 1 }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.primary, 0.2),
              borderWidth: 1,
              borderColor: alpha(c.primary, 0.3),
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24, lineHeight: 30 }}>🛒</Text>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' }}>
              <View
                style={{
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: radius.sm,
                  backgroundColor: alpha(c.primary, 0.2),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                }}
              >
                <Text variant="overline" tone="info" uppercase style={{ fontSize: 9 }}>
                  {t('mine.ecosystemChip')}
                </Text>
              </View>
              <Text variant="caption" mono tone="tertiary" style={{ fontSize: 10 }}>
                {t('marketScreen.preview')}
              </Text>
            </View>
            <Text variant="headline" style={{ marginTop: 6 }}>
              {t('mine.marketplaceTitle')}
            </Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
              {t('marketScreen.subtitle')}
            </Text>
          </View>
        </View>
        <Button
          label={`${t('mine.openMarketplace')} →`}
          onPress={onPress}
          variant="primary"
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </Card>
    </Animated.View>
  );
}

function Feature({
  chip,
  icon,
  title,
  body,
}: {
  chip: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Chip color={chip} icon={icon} />
      <Text variant="callout" weight="800" center style={{ marginTop: 8 }}>
        {title}
      </Text>
      <Text variant="caption" tone="secondary" center style={{ marginTop: 2 }}>
        {body}
      </Text>
    </View>
  );
}

/* ───────────────────────────── Recent activity ─────────────────────────── */

const REASON_ICON: Record<LedgerReason, keyof typeof Ionicons.glyphMap> = {
  MINING: 'flash',
  TASK_REWARD: 'gift',
  REFERRAL_BONUS: 'people',
  BOOSTER_PURCHASE: 'rocket',
  WITHDRAWAL: 'arrow-up-circle',
  AIRDROP: 'sparkles',
  ADMIN_ADJUST: 'construct',
};

function LedgerRow({
  entry,
  last,
  locale,
}: {
  entry: LedgerEntryDto;
  last: boolean;
  locale: string;
}) {
  const { c, spacing } = useTheme();
  const t = useT();
  const chip: Record<LedgerReason, string> = {
    MINING: c.primary,
    TASK_REWARD: c.success,
    REFERRAL_BONUS: c.info,
    BOOSTER_PURCHASE: violetOf(c),
    WITHDRAWAL: c.gold,
    AIRDROP: c.danger,
    ADMIN_ADJUST: c.textTertiary,
  };
  const positive = entry.points >= 0;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 10,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <Chip color={chip[entry.reason] ?? c.textTertiary} icon={REASON_ICON[entry.reason] ?? 'flash'} />
      <View style={{ flex: 1 }}>
        <Text variant="callout" weight="600" numberOfLines={1}>
          {t(`dashboard.reason.${entry.reason}`)}
        </Text>
        <Text variant="caption" tone="tertiary">
          {relativeTime(entry.createdAt, t, locale)}
        </Text>
      </View>
      <Text variant="callout" mono weight="800" tone={positive ? 'success' : 'gold'}>
        {positive ? '+' : ''}
        {formatPoints(entry.points, 2, locale)}
      </Text>
    </View>
  );
}

/* ────────────────────────────── Referral panel ─────────────────────────── */

function ReferralPanel({
  profile,
  locale,
  onViewReferrals,
}: {
  profile: Profile;
  locale: string;
  onViewReferrals: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const feedback = useFeedback();
  const [copied, setCopied] = useState(false);
  const link = `${WEB_URL}/${locale}/login?ref=${profile.referralCode}&mode=register`;

  async function copy() {
    try {
      await Clipboard.setStringAsync(link);
      feedback.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      feedback.error();
    }
  }

  return (
    <Card glow>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 15, lineHeight: 20 }}>👥</Text>
        <Text variant="overline" tone="secondary" uppercase>
          {t('dashboard.referralLink')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        <View
          style={{
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor: alpha(c.gold, 0.15),
            borderWidth: 1,
            borderColor: alpha(c.gold, 0.3),
          }}
        >
          <Text variant="caption" mono weight="800" tone="gold">
            {t('mine.tierLabel', {
              level: profile.referralTier.level,
              multiplier: profile.referralTier.multiplier,
            })}
          </Text>
        </View>
        <View
          style={{
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: radius.sm,
            backgroundColor: c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.border,
          }}
        >
          <Text variant="caption" mono weight="800" tone="secondary">
            {t('mine.codeChip', { code: profile.referralCode })}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
        <View
          style={{
            flex: 1,
            paddingHorizontal: 12,
            paddingVertical: 12,
            borderRadius: radius.md,
            backgroundColor: c.dark ? alpha(c.bg, 0.8) : c.surfaceAlt,
            borderWidth: 1,
            borderColor: c.borderStrong,
            minHeight: 48,
            justifyContent: 'center',
          }}
        >
          <Text variant="callout" mono weight="700" tone="gold" numberOfLines={1} ellipsizeMode="middle">
            {link}
          </Text>
        </View>
        <Button
          label={copied ? `✓ ${t('dashboard.copied')}` : t('dashboard.copy')}
          onPress={() => void copy()}
          variant="primary"
          size="md"
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
          {t('mine.totalInvited', { n: profile.referralCount })}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('dashboard.viewReferrals')}
          onPress={() => {
            feedback.select();
            onViewReferrals();
          }}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            minHeight: 44,
            paddingHorizontal: 14,
            borderRadius: radius.md,
            backgroundColor: alpha(c.gold, pressed ? 0.2 : 0.1),
            borderWidth: 1,
            borderColor: alpha(c.gold, 0.3),
          })}
        >
          <Text variant="caption" weight="800" tone="gold" numberOfLines={1}>
            👥 {t('dashboard.viewReferrals')} →
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}
