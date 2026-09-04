import React, { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabContentInset } from '../../src/lib/layout';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Button, IconButton } from '../../src/components/ui/Button';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { ConfirmSheet } from '../../src/components/ui/Sheet';
import { PulseDot } from '../../src/components/ui/Pulse';
import { NavBar, Screen, Skeleton } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useNotifications } from '../../src/store/notifications';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import {
  POINTS_PER_TOKEN,
  WITHDRAWAL_MIN_POINTS,
} from '../../src/api/endpoints';
import { WEB_URL } from '../../src/api/client';
import {
  countryFlag,
  countryName,
  formatDate,
  formatPoints,
  shortAddress,
} from '../../src/lib/format';

/**
 * Account.
 *
 * The hub for everything that is not mining: balance and withdrawal, the
 * miner's own network, identity, help, and the app's own settings. Laid out
 * as the website's profile page — a stack of glass panels, each with an
 * uppercase tracked heading.
 */
export default function AccountScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const tabInset = useTabContentInset();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();

  const { profile, refreshing, refresh, signOut } = useSession();
  const { unreadCount, resetForNewSession } = useNotifications();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const kyc = profile?.kycStatus ?? 'NONE';
  const kycTint =
    kyc === 'APPROVED'
      ? c.success
      : kyc === 'PENDING'
        ? c.gold
        : kyc === 'REJECTED'
          ? c.danger
          : c.textSecondary;
  const kycIcon: keyof typeof Ionicons.glyphMap =
    kyc === 'APPROVED'
      ? 'shield-checkmark'
      : kyc === 'PENDING'
        ? 'hourglass-outline'
        : kyc === 'REJECTED'
          ? 'close-circle-outline'
          : 'shield-outline';

  const canWithdraw =
    profile?.kycStatus === 'APPROVED' &&
    (profile?.pointsBalance ?? 0) >= WITHDRAWAL_MIN_POINTS;

  const copy = (value: string) => {
    void Clipboard.setStringAsync(value);
    feedback.success();
    toast.success(t('app.copied'));
  };

  const referralLink = profile
    ? `${WEB_URL}/${locale}/login?ref=${profile.referralCode}`
    : '';

  return (
    <Screen>
      <NavBar
        title={t('account.title')}
        onBack={null}
        large
        transparent
        right={
          <IconButton
            icon="notifications-outline"
            accessibilityLabel={t('notify.title')}
            badge={unreadCount}
            onPress={() => router.push('/notifications')}
          />
        }
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
          paddingHorizontal: spacing.lg,
          paddingBottom: tabInset,
          gap: spacing.lg,
        }}
      >
        {/* ── Balance — the web's glass-panel hero ── */}
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
              <Text variant="overline" tone="tertiary" uppercase>
                {t('profile.balance')}
              </Text>
              {/* chain-indicator */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: alpha(c.gold, 0.35),
                  backgroundColor: alpha(c.gold, 0.1),
                }}
              >
                <PulseDot color={c.success} size={6} />
                <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                  {t('profile.chainName')}
                </Text>
              </View>
            </View>

            {profile ? (
              <>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'baseline',
                    gap: 6,
                    marginTop: spacing.sm,
                  }}
                >
                  <Text variant="display" mono tone="gold">
                    {formatPoints(profile.pointsBalance, 2, locale)}
                  </Text>
                  <Text variant="callout" tone="brand" weight="800">
                    {t('profile.pointsShort')}
                  </Text>
                </View>
                <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
                  ≈{' '}
                  <Text variant="footnote" mono tone="info" weight="700">
                    {formatPoints(profile.pointsBalance / POINTS_PER_TOKEN, 4, locale)}
                  </Text>{' '}
                  $BONDKOIN
                </Text>
              </>
            ) : (
              <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
                <Skeleton height={40} width="60%" />
                <Skeleton height={16} width="40%" />
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
              <Button
                label={t('account.withdraw')}
                icon="arrow-up-circle-outline"
                onPress={() => router.push('/withdraw')}
                style={{ flex: 1 }}
              />
              <Button
                label={t('account.history')}
                icon="receipt-outline"
                variant="secondary"
                onPress={() => router.push('/history')}
                style={{ flex: 1 }}
              />
            </View>
            {!canWithdraw && profile ? (
              <Text
                variant="caption"
                tone="tertiary"
                center
                style={{ marginTop: spacing.sm }}
              >
                {profile.kycStatus !== 'APPROVED'
                  ? t('profile.withdrawNeedsKyc')
                  : t('profile.withdrawNeedsBalance', { min: WITHDRAWAL_MIN_POINTS })}
              </Text>
            ) : null}
          </Card>
        </Animated.View>

        {/* ── Identity ── */}
        <Animated.View entering={FadeInDown.delay(40).duration(260)}>
          <Card>
            <Text variant="overline" tone="tertiary" uppercase>
              {t('profile.identityTitle')}
            </Text>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                marginTop: spacing.md,
              }}
            >
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.lg,
                  overflow: 'hidden',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LinearGradient
                  colors={[...c.primaryGradient] as [string, string, ...string[]]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                />
                <Text variant="title2" style={{ color: c.onPrimary }}>
                  {(profile?.email ?? '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                {profile ? (
                  <>
                    <Text variant="headline" numberOfLines={1}>
                      {profile.email ?? shortAddress(profile.id)}
                    </Text>
                    <Text variant="caption" tone="tertiary" numberOfLines={1}>
                      {profile.countryCode
                        ? `${countryFlag(profile.countryCode)} ${countryName(profile.countryCode, locale)} · `
                        : ''}
                      {t('account.memberSince', {
                        date: formatDate(profile.createdAt, locale),
                      })}
                    </Text>
                  </>
                ) : (
                  <Skeleton height={20} width="70%" />
                )}
              </View>
            </View>

            {/* KYC status — the web's tinted status box */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('account.identity')}
              onPress={() => router.push('/kyc')}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.md,
                padding: spacing.md,
                minHeight: 48,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: alpha(kycTint, 0.25),
                backgroundColor: alpha(kycTint, 0.1),
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Ionicons name={kycIcon} size={18} color={kycTint} />
              <Text variant="footnote" weight="600" style={{ color: kycTint, flex: 1 }}>
                {t(`kyc.status.${kyc}`)}
              </Text>
              <Text variant="footnote" weight="700" style={{ color: kycTint }}>
                {kyc === 'APPROVED' ? t('profile.viewKyc') : t('profile.completeKyc')} →
              </Text>
            </Pressable>

            {/* User ID */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('account.copyId')}
              disabled={!profile}
              onPress={() => profile && copy(profile.id)}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.sm,
                minHeight: 44,
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: c.border,
                backgroundColor: c.dark ? alpha(c.bg, 0.6) : c.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 9 }}>
                {t('profile.userId')}
              </Text>
              <Text variant="caption" mono tone="secondary" numberOfLines={1} style={{ flex: 1 }}>
                {profile ? shortAddress(profile.id, 10, 6) : '—'}
              </Text>
              <Ionicons name="copy-outline" size={15} color={c.primary} />
            </Pressable>
          </Card>
        </Animated.View>

        {/* ── Referrals ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text variant="overline" tone="tertiary" uppercase>
                {t('profile.referralTitle')}
              </Text>
              {profile ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${t('profile.referralCode')} ${profile.referralCode}`}
                  hitSlop={8}
                  onPress={() => copy(profile.referralCode)}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 5,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: alpha(c.gold, 0.4),
                    backgroundColor: alpha(c.gold, 0.15),
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                    {profile.referralCode}
                  </Text>
                  <Ionicons name="copy-outline" size={11} color={c.gold} />
                </Pressable>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Stat label={t('profile.invited')} value={profile ? String(profile.referralCount) : '—'} />
              <Stat label={t('profile.tier')} value={profile ? `L${profile.referralTier.level}` : '—'} />
              <Stat
                label={t('referrals.multiplier')}
                value={profile ? `×${profile.referralTier.multiplier}` : '—'}
                tone="gold"
              />
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md }}>
              <View
                style={{
                  flex: 1,
                  minHeight: 40,
                  justifyContent: 'center',
                  paddingHorizontal: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: c.border,
                  backgroundColor: c.dark ? alpha(c.bg, 0.7) : c.surfaceAlt,
                }}
              >
                <Text variant="caption" mono tone="secondary" numberOfLines={1}>
                  {referralLink || '—'}
                </Text>
              </View>
              <Button
                label={t('profile.copy')}
                size="sm"
                disabled={!profile}
                onPress={() => copy(referralLink)}
              />
            </View>

            <Button
              label={t('referralsScreen.inviteCta')}
              icon="people-outline"
              variant="secondary"
              onPress={() => router.push('/referrals')}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </Card>
        </Animated.View>

        {/* ── Network ── */}
        <Animated.View entering={FadeInDown.delay(120).duration(260)}>
          <SectionLabel>{t('account.networkSection')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="trophy-outline"
              tone="warning"
              title={t('account.leaderboard')}
              onPress={() => router.push('/(tabs)/leaderboard')}
            />
            <ListRow
              icon="rocket-outline"
              tone="brand"
              title={t('boost.title')}
              onPress={() => router.push('/(tabs)/boosters')}
            />
            <ListRow
              icon="calculator-outline"
              title={t('landing.calculator.title')}
              onPress={() => router.push('/calculator')}
            />
          </ListGroup>
        </Animated.View>

        {/* ── App ── */}
        <Animated.View entering={FadeInDown.delay(160).duration(260)}>
          <SectionLabel>{t('account.appSection')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="notifications-outline"
              tone="brand"
              title={t('account.notifications')}
              value={unreadCount > 0 ? t('notify.unread', { n: unreadCount }) : undefined}
              onPress={() => router.push('/notifications')}
            />
            <ListRow
              icon="settings-outline"
              title={t('account.settings')}
              onPress={() => router.push('/settings')}
            />
          </ListGroup>
        </Animated.View>

        {/* ── Help & legal ── */}
        <Animated.View entering={FadeInDown.delay(200).duration(260)}>
          <SectionLabel>{t('account.helpSection')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="chatbubbles-outline"
              tone="brand"
              title={t('account.support')}
              onPress={() => router.push('/support')}
            />
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
          </ListGroup>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(260)}>
          <Button
            label={t('account.signOut')}
            variant="danger"
            icon="log-out-outline"
            onPress={() => setConfirmSignOut(true)}
            fullWidth
            style={{
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: alpha(c.danger, 0.3),
            }}
          />
        </Animated.View>
      </ScrollView>

      <ConfirmSheet
        visible={confirmSignOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={async () => {
          setConfirmSignOut(false);
          // Derived notifications belong to the account that produced them.
          await resetForNewSession();
          await signOut();
          router.replace('/(auth)/sign-in');
        }}
        icon="log-out-outline"
        destructive
        title={t('account.signOutConfirm')}
        body={t('account.signOutBody')}
        confirmLabel={t('account.signOut')}
        cancelLabel={t('app.cancel')}
      />
    </Screen>
  );
}

/** One of the referral card's three figures — mono, amber for the multiplier. */
function Stat({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'gold';
}) {
  const { c, spacing, radius, alpha } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        padding: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.dark ? alpha(c.bg, 0.5) : c.surfaceAlt,
      }}
    >
      <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 9 }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="title3" mono tone={tone} numberOfLines={1} style={{ marginTop: 2 }}>
        {value}
      </Text>
    </View>
  );
}
