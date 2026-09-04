import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Chips } from '../src/components/ui/Segmented';
import { Input } from '../src/components/ui/Input';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useToast } from '../src/components/ui/Toast';
import { useFeedback } from '../src/lib/feedback';
import { useAsyncData } from '../src/lib/hooks';
import { getReferralStats, type ReferralStatsResponse } from '../src/api/endpoints';
import { errorMessage, WEB_URL } from '../src/api/client';
import { countryFlag, formatDate } from '../src/lib/format';

type RosterFilter = 'ALL' | 'ACTIVE' | 'IDLE';

/** Tier names, matching the web app's ladder. */
const TIER_NAMES = [
  'Free Miner',
  'Bronze Scout',
  'Silver Leader',
  'Gold Master',
  'Platinum Syndicate',
  'Cyber Sovereign',
];

/**
 * The referral network.
 *
 * Invites do not pay a commission — they raise a multiplier on everything the
 * miner earns. The tier ladder is shown in full so the next rung, and what it
 * is worth, is never a mystery.
 */
export default function ReferralsScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const feedback = useFeedback();

  const load = useCallback(() => getReferralStats(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: stats, error, loading, refreshing, reload } =
    useAsyncData<ReferralStatsResponse>(load, toMessage);

  const [filter, setFilter] = useState<RosterFilter>('ALL');
  const [query, setQuery] = useState('');

  const code = stats?.referralCode ?? '';
  const link = `${WEB_URL}/${locale}/login?ref=${code}&mode=register`;

  const roster = useMemo(() => {
    const list = stats?.referralsList ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((member) => {
      if (filter === 'ACTIVE' && !member.isMiningActive) return false;
      if (filter === 'IDLE' && member.isMiningActive) return false;
      if (!q) return true;
      return member.maskedEmail.toLowerCase().includes(q);
    });
  }, [stats, filter, query]);

  const share = async () => {
    feedback.press();
    try {
      await Share.share({
        title: t('referralsScreen.shareTitle'),
        message: t('referralsScreen.shareMessage', { code, link }),
      });
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    feedback.success();
    toast.success(t('app.copied'));
  };

  const idleCount =
    (stats?.totalInvited ?? 0) - (stats?.activeMinersCount ?? 0);

  return (
    <Screen sunken>
      <NavBar title={t('referrals.title')} subtitle={t('referrals.subtitle')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {error ? (
            <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
          ) : null}

          {/* Invite card */}
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[c.goldMuted, c.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg, gap: spacing.md }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('referrals.code')}
                </Text>
                {stats ? (
                  <Badge
                    label={`${TIER_NAMES[stats.currentTier.level - 1] ?? ''} · ×${stats.currentTier.multiplier}`}
                    tone="gold"
                    icon="ribbon"
                  />
                ) : null}
              </View>

              {loading ? (
                <Skeleton height={40} />
              ) : (
                <Card
                  elevation={0}
                  padded={false}
                  onPress={() => void copy(code)}
                  accessibilityLabel={t('app.copy')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    padding: spacing.md,
                    backgroundColor: c.surfaceAlt,
                    borderRadius: radius.lg,
                  }}
                >
                  <Text variant="title3" mono tone="gold" style={{ flex: 1 }}>
                    {code || '—'}
                  </Text>
                  <Ionicons name="copy-outline" size={18} color={c.gold} />
                </Card>
              )}

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label={t('referrals.share')}
                  icon="share-social-outline"
                  onPress={() => void share()}
                  variant="gold"
                  style={{ flex: 1 }}
                />
                <Button
                  label={t('referrals.copyLink')}
                  icon="link-outline"
                  variant="secondary"
                  onPress={() => void copy(link)}
                  style={{ flex: 1 }}
                />
              </View>
            </LinearGradient>
          </Card>

          {/* Network numbers */}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <MiniStat
              icon="people-outline"
              tint={c.primary}
              label={t('referrals.totalInvited')}
              value={stats ? String(stats.totalInvited) : '—'}
            />
            <MiniStat
              icon="flash-outline"
              tint={c.success}
              label={t('referrals.activeMiners')}
              value={stats ? String(stats.activeMinersCount) : '—'}
            />
            <MiniStat
              icon="trending-up-outline"
              tint={c.gold}
              label={t('referrals.multiplier')}
              value={stats ? `×${stats.currentTier.multiplier}` : '—'}
            />
          </View>

          {/* Progress to the next tier */}
          {stats ? (
            <Card>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: spacing.sm,
                }}
              >
                <Text variant="headline">{t('referrals.tierProgression')}</Text>
                <Badge
                  label={`L${stats.currentTier.level}`}
                  tone="brand"
                />
              </View>

              {stats.nextTier ? (
                <>
                  <View
                    style={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: c.surfaceAlt,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: 8,
                        width: `${Math.max(3, stats.progressToNextPercent)}%`,
                        borderRadius: 4,
                        backgroundColor: c.gold,
                      }}
                    />
                  </View>
                  <Text
                    variant="footnote"
                    tone="secondary"
                    style={{ marginTop: spacing.sm }}
                  >
                    {t('referralsScreen.nextTier', {
                      n: stats.invitesNeededForNext,
                      level: stats.nextTier.level,
                      multiplier: stats.nextTier.multiplier,
                    })}
                  </Text>
                </>
              ) : (
                <Text variant="footnote" tone="success">
                  {t('referralsScreen.maxTier')}
                </Text>
              )}

              {/* The full ladder */}
              <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                {stats.allTiers.map((tier) => {
                  const current = tier.level === stats.currentTier.level;
                  const unlocked = stats.currentTier.level >= tier.level;
                  return (
                    <View
                      key={tier.level}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        padding: spacing.md,
                        borderRadius: radius.md,
                        backgroundColor: current ? c.goldMuted : c.surfaceAlt,
                        borderWidth: current ? 1 : 0,
                        borderColor: c.gold,
                        opacity: unlocked ? 1 : 0.6,
                      }}
                    >
                      <Ionicons
                        name={unlocked ? 'lock-open' : 'lock-closed'}
                        size={15}
                        color={unlocked ? c.success : c.textTertiary}
                      />
                      <View style={{ flex: 1 }}>
                        <Text variant="callout" weight="600">
                          {TIER_NAMES[tier.level - 1] ?? `Tier ${tier.level}`}
                        </Text>
                        <Text variant="caption" tone="tertiary">
                          {tier.minInvites === 0
                            ? '0'
                            : tier.maxInvites >= 2000
                              ? `${tier.minInvites}+`
                              : `${tier.minInvites}–${tier.maxInvites}`}{' '}
                          {t('referrals.invitesCount').toLowerCase()}
                        </Text>
                      </View>
                      <Text variant="headline" mono tone={current ? 'gold' : 'secondary'}>
                        ×{tier.multiplier}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : loading ? (
            <Skeleton height={220} radius={radius.xl} />
          ) : null}

          <SectionLabel>{t('referralsScreen.rosterTitle')}</SectionLabel>

          <Input
            icon="search"
            placeholder={t('app.search')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
          />
        </View>

        <Chips
          options={[
            { value: 'ALL', label: t('referralsScreen.filterAll'), count: stats?.totalInvited },
            {
              value: 'ACTIVE',
              label: t('referralsScreen.filterActive'),
              count: stats?.activeMinersCount,
            },
            { value: 'IDLE', label: t('referralsScreen.filterIdle'), count: idleCount },
          ]}
          value={filter}
          onChange={setFilter}
          style={{ paddingLeft: spacing.lg }}
        />

        <View style={{ paddingHorizontal: spacing.lg }}>
          {loading ? (
            <Skeleton height={150} radius={radius.xl} />
          ) : roster.length === 0 ? (
            <EmptyState
              icon="person-add-outline"
              title={t('referralsScreen.rosterEmpty')}
              action={
                <Button
                  label={t('referralsScreen.inviteCta')}
                  icon="share-social-outline"
                  onPress={() => void share()}
                />
              }
            />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {roster.map((member, i) => (
                <View
                  key={member.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                    borderBottomWidth: i === roster.length - 1 ? 0 : 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: member.isMiningActive
                        ? c.successMuted
                        : c.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons
                      name={member.isMiningActive ? 'flash' : 'moon-outline'}
                      size={15}
                      color={member.isMiningActive ? c.success : c.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="callout" mono weight="600" numberOfLines={1}>
                      {member.maskedEmail}
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {countryFlag(member.countryCode)}{' '}
                      {formatDate(member.joinedAt, locale)}
                    </Text>
                  </View>
                  <Badge
                    label={
                      member.isMiningActive
                        ? t('referrals.active')
                        : t('referrals.idle')
                    }
                    tone={member.isMiningActive ? 'success' : 'neutral'}
                  />
                </View>
              ))}
            </Card>
          )}
        </View>

        <View style={{ paddingHorizontal: spacing.lg }}>
          <Text variant="caption" tone="tertiary" center>
            {t('referrals.integrityBody')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function MiniStat({
  icon,
  tint,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  label: string;
  value: string;
}) {
  const { spacing, radius } = useTheme();
  return (
    <Card style={{ flex: 1 }} padded={false}>
      <View style={{ padding: spacing.md, gap: 6 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.sm,
            backgroundColor: `${tint}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={15} color={tint} />
        </View>
        <Text variant="title3" mono numberOfLines={1}>
          {value}
        </Text>
        <Text variant="caption" tone="tertiary" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}
