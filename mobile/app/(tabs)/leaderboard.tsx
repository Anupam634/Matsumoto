import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Segmented, Chips } from '../../src/components/ui/Segmented';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import {
  getLeaderboard,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { countryFlag, countryName, formatPoints } from '../../src/lib/format';

/**
 * Global rankings.
 *
 * Three boards (mined, held, invited) over three periods. The caller's own
 * standing is pinned at the top and repeated inline, so nobody has to scroll a
 * hundred rows to find themselves.
 */
export default function LeaderboardScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();

  const [category, setCategory] = useState<LeaderboardCategory>('EARNINGS');
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!opts.silent) setRefreshing(true);
      try {
        setBoard(await getLeaderboard({ category, period, limit: 100 }));
        setError(null);
      } catch (err) {
        setError(errorMessage(err, t('leaderboard.error')));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [category, period, t],
  );

  React.useEffect(() => {
    setLoading(true);
    void load({ silent: true });
  }, [load]);

  const unit =
    board?.unit === 'miners' ? t('leaderboard.unitMiners') : t('leaderboard.unitPoints');
  const decimals = board?.unit === 'miners' ? 0 : 2;
  const entries = board?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <Screen sunken>
      <NavBar
        title={t('leaderboard.title')}
        subtitle={t('leaderboard.subtitle')}
        onBack={null}
        large
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingBottom: insets.bottom + 110,
          gap: spacing.md,
        }}
      >
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {/* Your standing */}
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[c.goldMuted, c.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('ranksScreen.yourStanding')}
                </Text>
                {board?.me.badge.label ? (
                  <Badge label={board.me.badge.label} tone="gold" />
                ) : null}
              </View>

              {loading ? (
                <Skeleton height={36} width="45%" style={{ marginTop: spacing.md }} />
              ) : board?.me.rank == null ? (
                <View style={{ marginTop: spacing.sm }}>
                  <Text variant="title2" tone="secondary">
                    {t('leaderboard.unranked')}
                  </Text>
                  <Text variant="footnote" tone="tertiary" style={{ marginTop: 2 }}>
                    {t('leaderboard.unrankedHint')}
                  </Text>
                </View>
              ) : (
                <>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 8,
                      marginTop: spacing.sm,
                    }}
                  >
                    <Text variant="display" mono>
                      #{board.me.rank}
                    </Text>
                    {board.me.badge.medal ? (
                      <Text variant="title2">{board.me.badge.medal}</Text>
                    ) : null}
                  </View>
                  <Text variant="footnote" tone="secondary">
                    {t('leaderboard.outOf', { total: board.totalRanked })}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      gap: spacing.xl,
                      marginTop: spacing.md,
                      paddingTop: spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: c.border,
                    }}
                  >
                    <View>
                      <Text variant="caption" tone="tertiary">
                        {t('leaderboard.yourScore')}
                      </Text>
                      <Text variant="headline" mono tone="gold">
                        {formatPoints(board.me.value, decimals, locale)} {unit}
                      </Text>
                    </View>
                    {board.me.percentile !== null ? (
                      <View>
                        <Text variant="caption" tone="tertiary">
                          {t('leaderboard.topPercent', { percent: board.me.percentile })}
                        </Text>
                        <View
                          style={{
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: c.surfaceAlt,
                            marginTop: 8,
                            width: 120,
                            overflow: 'hidden',
                          }}
                        >
                          <View
                            style={{
                              height: 6,
                              borderRadius: 3,
                              width: `${Math.max(4, 101 - board.me.percentile)}%`,
                              backgroundColor: c.gold,
                            }}
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                </>
              )}
            </LinearGradient>
          </Card>

          {/* Board selectors */}
          <Segmented
            options={[
              { value: 'EARNINGS', label: t('leaderboard.catEarnings') },
              { value: 'BALANCE', label: t('leaderboard.catBalance') },
              { value: 'REFERRALS', label: t('leaderboard.catReferrals') },
            ]}
            value={category}
            onChange={setCategory}
          />
        </View>

        <Chips
          options={[
            { value: 'ALL_TIME', label: t('leaderboard.periodAllTime') },
            { value: 'MONTH', label: t('leaderboard.periodMonth') },
            { value: 'WEEK', label: t('leaderboard.periodWeek') },
          ]}
          value={board?.period ?? period}
          onChange={setPeriod}
          style={{ paddingLeft: spacing.lg }}
        />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {board && !board.periodSupported ? (
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: c.infoMuted,
              }}
            >
              <Ionicons name="information-circle" size={16} color={c.info} />
              <Text variant="caption" style={{ color: c.info, flex: 1 }}>
                {t('leaderboard.snapshotNotice')}
              </Text>
            </View>
          ) : null}

          {error ? (
            <ErrorNote message={error} onRetry={() => void load()} retryLabel={t('leaderboard.retry')} />
          ) : null}

          {/* Podium */}
          {loading ? (
            <View style={{ gap: spacing.md }}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height={62} radius={radius.xl} />
              ))}
            </View>
          ) : entries.length === 0 ? (
            <EmptyState icon="trophy-outline" title={t('leaderboard.empty')} />
          ) : (
            <>
              <SectionLabel>{t('ranksScreen.top3')}</SectionLabel>
              <View style={{ gap: spacing.sm }}>
                {podium.map((entry) => (
                  <PodiumRow
                    key={entry.id}
                    entry={entry}
                    unit={unit}
                    decimals={decimals}
                  />
                ))}
              </View>

              {rest.length > 0 ? (
                <>
                  <SectionLabel>{t('leaderboard.fullBoard')}</SectionLabel>
                  <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
                    {rest.map((entry, i) => (
                      <EntryRow
                        key={entry.id}
                        entry={entry}
                        unit={unit}
                        decimals={decimals}
                        last={i === rest.length - 1}
                      />
                    ))}
                  </Card>
                </>
              ) : null}

              <Text variant="caption" tone="tertiary" center>
                {t('leaderboard.integrityBody')}
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function PodiumRow({
  entry,
  unit,
  decimals,
}: {
  entry: LeaderboardEntry;
  unit: string;
  decimals: number;
}) {
  const { c, spacing, radius } = useTheme();
  const { locale } = useI18n();
  const t = useT();

  const accent = entry.rank === 1 ? c.gold : entry.rank === 2 ? c.textTertiary : c.warning;

  return (
    <Card
      style={
        entry.isCurrentUser
          ? { borderColor: c.primary, borderWidth: 1.5 }
          : undefined
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: radius.md,
            backgroundColor: `${accent}1F`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text variant="title3">{entry.badge.medal || `#${entry.rank}`}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text variant="headline" mono numberOfLines={1} style={{ flexShrink: 1 }}>
              {entry.displayName}
            </Text>
            {entry.isCurrentUser ? (
              <Badge label={t('ranksScreen.you')} tone="brand" />
            ) : null}
          </View>
          <Text variant="caption" tone="tertiary">
            {entry.countryCode === 'GLOBAL'
              ? '🌐'
              : `${countryFlag(entry.countryCode)} ${countryName(entry.countryCode, locale)}`}
            {entry.isMiningActive ? ` · ${t('leaderboard.active')}` : ''}
          </Text>
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text variant="headline" mono tone="gold">
            {formatPoints(entry.value, decimals, locale)}
          </Text>
          <Text variant="caption" tone="tertiary">
            {unit}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function EntryRow({
  entry,
  unit,
  decimals,
  last,
}: {
  entry: LeaderboardEntry;
  unit: string;
  decimals: number;
  last?: boolean;
}) {
  const { c, spacing } = useTheme();
  const { locale } = useI18n();
  const t = useT();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        backgroundColor: entry.isCurrentUser ? c.primaryMuted : undefined,
        marginHorizontal: entry.isCurrentUser ? -spacing.lg : 0,
        paddingHorizontal: entry.isCurrentUser ? spacing.lg : 0,
      }}
    >
      <Text
        variant="callout"
        mono
        tone="tertiary"
        style={{ width: 38 }}
        numberOfLines={1}
      >
        #{entry.rank}
      </Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="callout" mono weight="600" numberOfLines={1} style={{ flexShrink: 1 }}>
            {entry.displayName}
          </Text>
          {entry.isCurrentUser ? <Badge label={t('ranksScreen.you')} tone="brand" /> : null}
        </View>
        <Text variant="caption" tone="tertiary">
          {entry.countryCode === 'GLOBAL' ? '🌐' : countryFlag(entry.countryCode)}{' '}
          {entry.isMiningActive ? t('leaderboard.active') : t('leaderboard.idle')}
        </Text>
      </View>
      <Text variant="callout" mono weight="700">
        {formatPoints(entry.value, decimals, locale)}
      </Text>
    </View>
  );
}
