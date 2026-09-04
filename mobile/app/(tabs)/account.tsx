import React, { useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button, IconButton } from '../../src/components/ui/Button';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { ConfirmSheet } from '../../src/components/ui/Sheet';
import { NavBar, Screen, Skeleton } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useNotifications } from '../../src/store/notifications';
import { useToast } from '../../src/components/ui/Toast';
import {
  POINTS_PER_TOKEN,
  WITHDRAWAL_MIN_POINTS,
} from '../../src/api/endpoints';
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
 * miner's own network, identity, help, and the app's own settings.
 */
export default function AccountScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();

  const { profile, refreshing, refresh, signOut } = useSession();
  const { unreadCount, resetForNewSession } = useNotifications();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  const kycTone =
    profile?.kycStatus === 'APPROVED'
      ? 'success'
      : profile?.kycStatus === 'PENDING'
        ? 'warning'
        : profile?.kycStatus === 'REJECTED'
          ? 'danger'
          : 'neutral';

  const canWithdraw =
    profile?.kycStatus === 'APPROVED' &&
    (profile?.pointsBalance ?? 0) >= WITHDRAWAL_MIN_POINTS;

  return (
    <Screen sunken>
      <NavBar
        title={t('account.title')}
        onBack={null}
        large
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
          paddingBottom: insets.bottom + 110,
          gap: spacing.lg,
        }}
      >
        {/* Identity header */}
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <LinearGradient
            colors={[c.primaryMuted, c.surface]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ padding: spacing.lg }}
          >
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: radius.lg,
                  backgroundColor: c.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
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
                    <Text variant="caption" tone="tertiary">
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

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                marginTop: spacing.lg,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <View>
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('mine.balanceLabel')}
                </Text>
                <View
                  style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}
                >
                  <Text variant="title1" mono>
                    {formatPoints(profile?.pointsBalance ?? 0, 2, locale)}
                  </Text>
                  <Text variant="caption" tone="gold" weight="700">
                    PTS
                  </Text>
                </View>
                <Text variant="caption" tone="secondary">
                  ≈ {formatPoints((profile?.pointsBalance ?? 0) / POINTS_PER_TOKEN, 4, locale)}{' '}
                  $BONDKOIN
                </Text>
              </View>
              <Badge
                label={t(`kyc.status.${profile?.kycStatus ?? 'NONE'}`)}
                tone={kycTone}
                dot
              />
            </View>

            <Button
              label={t('account.withdraw')}
              icon="arrow-up-circle-outline"
              onPress={() => router.push('/withdraw')}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
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
          </LinearGradient>
        </Card>

        {/* Network */}
        <View>
          <SectionLabel>{t('account.networkSection')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="people-outline"
              tone="brand"
              title={t('account.referrals')}
              subtitle={
                profile
                  ? t('mine.tierLabel', {
                      level: profile.referralTier.level,
                      multiplier: profile.referralTier.multiplier,
                    })
                  : undefined
              }
              value={profile ? String(profile.referralCount) : undefined}
              onPress={() => router.push('/referrals')}
            />
            <ListRow
              icon="trophy-outline"
              tone="warning"
              title={t('account.leaderboard')}
              onPress={() => router.push('/(tabs)/leaderboard')}
            />
            <ListRow
              icon="receipt-outline"
              title={t('account.history')}
              onPress={() => router.push('/history')}
            />
            <ListRow
              icon="calculator-outline"
              title={t('landing.calculator.title')}
              onPress={() => router.push('/calculator')}
            />
          </ListGroup>
        </View>

        {/* Wallet & identity */}
        <View>
          <SectionLabel>{t('account.walletSection')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="shield-checkmark-outline"
              tone={profile?.kycStatus === 'APPROVED' ? 'success' : 'warning'}
              title={t('account.identity')}
              value={t(`kyc.status.${profile?.kycStatus ?? 'NONE'}`)}
              onPress={() => router.push('/kyc')}
            />
            <ListRow
              icon="rocket-outline"
              title={t('boost.title')}
              onPress={() => router.push('/(tabs)/boosters')}
            />
            <ListRow
              icon="key-outline"
              title={t('account.copyId')}
              subtitle={profile ? shortAddress(profile.id, 10, 6) : undefined}
              chevron={false}
              onPress={() => {
                if (!profile) return;
                void Clipboard.setStringAsync(profile.id);
                toast.success(t('app.copied'));
              }}
              trailing={<Ionicons name="copy-outline" size={17} color={c.textTertiary} />}
            />
          </ListGroup>
        </View>

        {/* App */}
        <View>
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
        </View>

        {/* Help & legal */}
        <View>
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
        </View>

        <Button
          label={t('account.signOut')}
          variant="danger"
          icon="log-out-outline"
          onPress={() => setConfirmSignOut(true)}
          fullWidth
        />
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
