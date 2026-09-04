import React, { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, CardHeader, SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { IconButton } from '../../src/components/ui/Button';
import { ConfirmSheet } from '../../src/components/ui/Sheet';
import { EmptyState, ErrorNote, Screen, Skeleton } from '../../src/components/ui/Chrome';
import { MineDial, RewardBurst } from '../../src/components/mining/MineDial';
import { ActivityRow } from '../../src/components/common/ActivityRow';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useSettings } from '../../src/store/settings';
import { useNotifications } from '../../src/store/notifications';
import { useFeedback } from '../../src/lib/feedback';
import { useCountUp, useLiveAccrual, useNow } from '../../src/lib/hooks';
import { claimMining, POINTS_PER_TOKEN } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import {
  countdownLabel,
  formatCompact,
  formatPoints,
  relativeTime,
} from '../../src/lib/format';

/**
 * The mining dashboard — the app's home.
 *
 * One control does the important thing (bank the accrued points); everything
 * else on the screen exists to answer "how much, how fast, and what next".
 */
export default function MineScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
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

  const pending = useLiveAccrual(mining);
  const balance = useCountUp(profile?.pointsBalance ?? 0);
  const now = useNow();

  const ready = !!mining?.canClaim && !claiming;
  const progress =
    mining && mining.maxPendingPoints > 0
      ? Math.min(1, pending / mining.maxPendingPoints)
      : 0;
  const full = progress >= 0.999 && !ready;
  const countdown = countdownLabel(mining?.nextClaimAt ?? null, now);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('mine.greetingMorning');
    if (hour < 18) return t('mine.greetingAfternoon');
    return t('mine.greetingEvening');
  }, [t]);

  async function mine() {
    setClaimError(null);
    setClaiming(true);
    feedback.strike();
    try {
      const res = await claimMining();
      feedback.reward();
      setCelebrate(res.earnedPoints);
      setTimeout(() => setCelebrate(null), 1600);

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

  const loading = !profile || !mining;

  return (
    <Screen sunken>
      <LinearGradient
        colors={[ready ? c.goldMuted : c.primaryMuted, c.bgSunken]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 280 }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh({ silent: false })}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: insets.bottom + 110,
          gap: spacing.md,
        }}
      >
        {/* ── Header ── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            marginBottom: spacing.xs,
          }}
        >
          <Image
            source={require('../../assets/logo.png')}
            style={{ width: 40, height: 40, borderRadius: radius.md }}
            contentFit="contain"
          />
          <View style={{ flex: 1 }}>
            <Text variant="caption" tone="tertiary">
              {greeting}
            </Text>
            <Text variant="headline" numberOfLines={1}>
              {profile?.email?.split('@')[0] ?? t('app.name')}
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

        {/* ── Mining dial ── */}
        <Card padded={false} style={{ paddingVertical: spacing.xxl, overflow: 'hidden' }}>
          {loading ? (
            <View style={{ alignItems: 'center', gap: spacing.md }}>
              <Skeleton height={248} width={248} radius={124} />
              <Skeleton height={18} width="50%" />
            </View>
          ) : (
            <>
              {celebrate !== null ? <RewardBurst points={celebrate} /> : null}
              <MineDial
                progress={progress}
                ready={ready}
                full={full}
                claiming={claiming}
                pending={formatPoints(pending, 4, locale)}
                onPress={onMinePress}
              />

              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: spacing.sm,
                  marginTop: spacing.lg,
                  paddingHorizontal: spacing.lg,
                  flexWrap: 'wrap',
                }}
              >
                <Badge
                  label={`${formatPoints(mining.ratePerHour, 2, locale)} /h`}
                  tone="brand"
                  icon="speedometer-outline"
                />
                {countdown ? (
                  <Badge label={countdown} tone="neutral" icon="time-outline" />
                ) : null}
                <Badge
                  label={t('mine.capacity', { percent: Math.round(progress * 100) })}
                  tone={full ? 'warning' : 'neutral'}
                />
              </View>
            </>
          )}
        </Card>

        {/* ── Balance ── */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
            }}
          >
            <View style={{ flex: 1 }}>
              <Text variant="overline" tone="tertiary" uppercase>
                {t('mine.balanceLabel')}
              </Text>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('mine.balanceLabel')}
                onPress={() => {
                  feedback.select();
                  setBalanceHidden((v) => !v);
                }}
                disabled={!settings.privateBalance}
                style={{ marginTop: 4 }}
              >
                {loading ? (
                  <Skeleton height={34} width="60%" />
                ) : balanceHidden ? (
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                  >
                    <Text variant="title1" mono>
                      ••••••
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {t('mine.hideBalance')}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 6,
                    }}
                  >
                    <Text variant="display" mono>
                      {formatPoints(balance, 2, locale)}
                    </Text>
                    <Text variant="callout" tone="gold" weight="700">
                      PTS
                    </Text>
                  </View>
                )}
              </Pressable>

              {!loading && !balanceHidden ? (
                <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                  ≈{' '}
                  <Text variant="footnote" tone="brand" mono weight="700">
                    {formatPoints(balance / POINTS_PER_TOKEN, 4, locale)}
                  </Text>{' '}
                  $BONDKOIN
                </Text>
              ) : null}
            </View>

            <Badge label="BNB Chain" tone="gold" icon="link-outline" />
          </View>

          {/* KYC gate */}
          {profile ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/kyc')}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.lg,
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor:
                  profile.kycStatus === 'APPROVED'
                    ? c.successMuted
                    : profile.kycStatus === 'PENDING'
                      ? c.warningMuted
                      : c.primaryMuted,
              }}
            >
              <Ionicons
                name={
                  profile.kycStatus === 'APPROVED'
                    ? 'shield-checkmark'
                    : profile.kycStatus === 'PENDING'
                      ? 'hourglass-outline'
                      : 'shield-outline'
                }
                size={18}
                color={
                  profile.kycStatus === 'APPROVED'
                    ? c.success
                    : profile.kycStatus === 'PENDING'
                      ? c.warning
                      : c.primary
                }
              />
              <Text variant="footnote" weight="600" style={{ flex: 1 }}>
                {profile.kycStatus === 'APPROVED'
                  ? t('mine.verifiedBanner')
                  : profile.kycStatus === 'PENDING'
                    ? t('mine.pendingKycBanner')
                    : t('mine.verifyBanner')}
              </Text>
              {profile.kycStatus !== 'APPROVED' ? (
                <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
              ) : null}
            </Pressable>
          ) : null}
        </Card>

        {/* ── Stats ── */}
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            icon="speedometer-outline"
            tint={c.primary}
            label={t('mine.rateLabel')}
            value={loading ? '—' : `${formatPoints(mining.ratePerHour, 2, locale)}`}
            suffix="/h"
          />
          <StatTile
            icon="trending-up-outline"
            tint={c.success}
            label={t('mine.lifetimeLabel')}
            value={
              history ? formatCompact(history.lifetimeEarnedPoints, locale) : '—'
            }
            suffix="pts"
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <StatTile
            icon="rocket-outline"
            tint={c.gold}
            label={t('mine.boostersLabel')}
            value={loading ? '—' : String(mining.activeBoosters)}
            onPress={() => router.push('/(tabs)/boosters')}
          />
          <StatTile
            icon="people-outline"
            tint={c.info}
            label={t('mine.inviteesLabel')}
            value={profile ? String(profile.referralCount) : '—'}
            badge={
              profile
                ? `×${profile.referralTier.multiplier}`
                : undefined
            }
            onPress={() => router.push('/referrals')}
          />
        </View>

        {/* ── Quick actions ── */}
        <SectionLabel>{t('mine.quickActions')}</SectionLabel>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <QuickAction
            icon="gift-outline"
            label={t('mine.actionTasks')}
            tint={c.gold}
            onPress={() => router.push('/tasks')}
          />
          <QuickAction
            icon="rocket-outline"
            label={t('mine.actionBoost')}
            tint={c.primary}
            onPress={() => router.push('/(tabs)/boosters')}
          />
          <QuickAction
            icon="person-add-outline"
            label={t('mine.actionInvite')}
            tint={c.info}
            onPress={() => router.push('/referrals')}
          />
          <QuickAction
            icon="arrow-up-circle-outline"
            label={t('mine.actionWithdraw')}
            tint={c.success}
            onPress={() => router.push('/withdraw')}
          />
        </View>

        {/* ── Recent activity ── */}
        <Card style={{ marginTop: spacing.xs }}>
          <CardHeader
            icon="pulse-outline"
            title={t('mine.activityTitle')}
            actionLabel={t('app.seeAll')}
            onAction={() => router.push('/history')}
          />
          {!history ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={44} radius={12} />
              ))}
            </View>
          ) : history.entries.length === 0 ? (
            <EmptyState
              icon="sparkles-outline"
              title={t('mine.activityEmpty')}
            />
          ) : (
            <View>
              {history.entries.slice(0, 5).map((entry, i) => (
                <Animated.View
                  key={entry.id}
                  entering={FadeInDown.delay(i * 40).duration(260)}
                >
                  <ActivityRow
                    reason={entry.reason}
                    points={entry.points}
                    createdAt={entry.createdAt}
                    last={i === Math.min(4, history.entries.length - 1)}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </Card>

        {/* ── Referral prompt ── */}
        {profile ? (
          <Card onPress={() => router.push('/referrals')} accessibilityLabel={t('referrals.title')}>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: c.infoMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="people" size={22} color={c.info} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{t('referralsScreen.inviteCta')}</Text>
                <Text variant="caption" tone="secondary" numberOfLines={2}>
                  {t('mine.tierLabel', {
                    level: profile.referralTier.level,
                    multiplier: profile.referralTier.multiplier,
                  })}{' '}
                  · {profile.referralCode}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
            </View>
          </Card>
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

/* ───────────────────────────── Pieces ───────────────────────────── */

function StatTile({
  icon,
  tint,
  label,
  value,
  suffix,
  badge,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
  suffix?: string;
  badge?: string;
  onPress?: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={{ flex: 1 }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.sm,
            backgroundColor: `${tint}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={tint} />
        </View>
        {badge ? <Badge label={badge} tone="brand" /> : null}
        {onPress && !badge ? (
          <Ionicons name="chevron-forward" size={15} color={c.textTertiary} />
        ) : null}
      </View>

      <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.md }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <Text variant="title3" mono numberOfLines={1}>
          {value}
        </Text>
        {suffix ? (
          <Text variant="caption" tone="tertiary">
            {suffix}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}

function QuickAction({
  icon,
  label,
  tint,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  const feedback = useFeedback();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => ({
        flex: 1,
        alignItems: 'center',
        gap: 6,
        paddingVertical: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: `${tint}1F`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={19} color={tint} />
      </View>
      <Text variant="caption" weight="600" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}
