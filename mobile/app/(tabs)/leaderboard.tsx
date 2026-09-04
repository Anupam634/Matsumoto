import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabContentInset } from '../../src/lib/layout';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Chips } from '../../src/components/ui/Segmented';
import { Input } from '../../src/components/ui/Input';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useFeedback } from '../../src/lib/feedback';
import {
  getLeaderboard,
  type LeaderboardCategory,
  type LeaderboardEntry,
  type LeaderboardPeriod,
  type LeaderboardResponse,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { countryFlag, countryName, formatPoints, relativeTime } from '../../src/lib/format';

const CATEGORY_HINT: Record<LeaderboardCategory, string> = {
  EARNINGS: 'leaderboard.catEarningsHint',
  BALANCE: 'leaderboard.catBalanceHint',
  REFERRALS: 'leaderboard.catReferralsHint',
};

/** The web's category tiles carry an emoji each. */
const CATEGORY_ICON: Record<LeaderboardCategory, string> = {
  EARNINGS: '⛏️',
  BALANCE: '💰',
  REFERRALS: '👥',
};

/** Bronze is the one medal tone the palette has no name for. */
const BRONZE = '#FB923C';

/**
 * Global rankings.
 *
 * Three boards (mined, held, invited) over three periods. The caller's own
 * standing is pinned at the top and repeated inline, so nobody has to scroll a
 * hundred rows to find themselves.
 */
export default function LeaderboardScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const tabInset = useTabContentInset();
  const t = useT();
  const { locale } = useI18n();
  const feedback = useFeedback();

  const [category, setCategory] = useState<LeaderboardCategory>('EARNINGS');
  const [period, setPeriod] = useState<LeaderboardPeriod>('ALL_TIME');
  const [board, setBoard] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Fast category/period taps fire overlapping requests; only the newest one
  // is allowed to touch state, so a slow earlier response can't overwrite it.
  const reqId = useRef(0);

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      const id = ++reqId.current;
      if (!opts.silent) setRefreshing(true);
      try {
        const next = await getLeaderboard({ category, period, limit: 100 });
        if (id !== reqId.current) return;
        setBoard(next);
        setError(null);
      } catch (err) {
        if (id !== reqId.current) return;
        setError(errorMessage(err, t('leaderboard.error')));
      } finally {
        if (id === reqId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [category, period, t],
  );

  React.useEffect(() => {
    setLoading(true);
    void load({ silent: true });
  }, [load]);

  // While a new board is loading, the previous board's header details
  // (badge, period notice, timestamp) would describe the wrong category.
  const current = loading ? null : board;

  const unit =
    board?.unit === 'miners' ? t('leaderboard.unitMiners') : t('leaderboard.unitPoints');
  const decimals = board?.unit === 'miners' ? 0 : 2;
  const entries = useMemo(() => board?.entries ?? [], [board]);

  const query = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!query) return entries;
    return entries.filter(
      (e) =>
        e.displayName.toLowerCase().includes(query) ||
        e.countryCode.toLowerCase().includes(query) ||
        String(e.rank) === query,
    );
  }, [entries, query]);

  const searching = query.length > 0;
  const podium = searching ? [] : entries.slice(0, 3);
  const rest = searching ? filtered : entries.slice(3);

  const showBadge =
    current != null && current.me.rank != null && !!current.me.badge.label;

  const categories: { value: LeaderboardCategory; label: string }[] = [
    { value: 'EARNINGS', label: t('leaderboard.catEarnings') },
    { value: 'BALANCE', label: t('leaderboard.catBalance') },
    { value: 'REFERRALS', label: t('leaderboard.catReferrals') },
  ];

  return (
    <Screen>
      <NavBar
        title={t('leaderboard.title')}
        subtitle={t('leaderboard.subtitle')}
        onBack={null}
        large
        transparent
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void load()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingBottom: tabInset,
          gap: spacing.md,
        }}
      >
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {/* ── Your rank — the web's amber-ringed glass card ── */}
          <Card glow accent={alpha(c.gold, c.dark ? 0.4 : 0.6)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text variant="overline" tone="tertiary" uppercase>
                {t('leaderboard.yourRank')}
              </Text>
              <View
                style={{
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: alpha(c.gold, 0.4),
                  backgroundColor: alpha(c.gold, 0.15),
                }}
              >
                <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                  {showBadge ? current.me.badge.label : '—'}
                </Text>
              </View>
            </View>

            {loading || !board ? (
              <Skeleton height={40} width="45%" style={{ marginTop: spacing.md }} />
            ) : board.me.rank == null ? (
              <View style={{ marginTop: spacing.sm, gap: 2 }}>
                <Text variant="title2" tone="secondary">
                  {t('leaderboard.unranked')}
                </Text>
                <Text variant="caption" tone="tertiary">
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
                  <Text variant="display" mono tone="gold">
                    #{board.me.rank}
                  </Text>
                  {board.me.badge.medal ? (
                    <Text variant="title2">{board.me.badge.medal}</Text>
                  ) : null}
                </View>
                <Text variant="caption" tone="tertiary" weight="600">
                  {t('leaderboard.outOf', { total: board.totalRanked })}
                </Text>

                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.lg,
                    marginTop: spacing.md,
                    paddingTop: spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: c.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 10 }}>
                      {t('leaderboard.yourScore')}
                    </Text>
                    <Text variant="headline" mono tone="gold" style={{ marginTop: 2 }}>
                      {formatPoints(board.me.value, decimals, locale)}{' '}
                      <Text variant="caption" tone="tertiary" weight="700">
                        {unit}
                      </Text>
                    </Text>
                  </View>
                  {board.me.percentile !== null ? (
                    <View style={{ flex: 1 }}>
                      <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 10 }}>
                        {t('leaderboard.topPercent', { percent: board.me.percentile })}
                      </Text>
                      <View
                        accessible
                        accessibilityRole="progressbar"
                        accessibilityLabel={t('leaderboard.topPercent', {
                          percent: board.me.percentile,
                        })}
                        accessibilityValue={{
                          min: 0,
                          max: 100,
                          now: Math.round(Math.max(4, 101 - board.me.percentile)),
                        }}
                        style={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: c.surfaceAlt,
                          borderWidth: 1,
                          borderColor: c.border,
                          marginTop: 8,
                          overflow: 'hidden',
                        }}
                      >
                        <LinearGradient
                          colors={[c.gold, c.success]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            height: '100%',
                            borderRadius: 4,
                            width: `${Math.max(4, 101 - board.me.percentile)}%`,
                          }}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </Card>

          {/* ── Board selectors — the web's category tiles + period pills ── */}
          <Card>
            <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: spacing.sm }}>
              {t('leaderboard.categoryLabel')}
            </Text>
            <View style={{ flexDirection: 'row', gap: spacing.sm }}>
              {categories.map((option) => {
                const active = option.value === category;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    onPress={() => {
                      if (active) return;
                      feedback.select();
                      setCategory(option.value);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 44,
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 2,
                      paddingVertical: spacing.sm,
                      paddingHorizontal: 4,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: active ? alpha(c.primary, 0.6) : c.border,
                      backgroundColor: active ? alpha(c.primary, 0.15) : c.surfaceAlt,
                      opacity: pressed ? 0.8 : 1,
                    })}
                  >
                    <Text variant="body">{CATEGORY_ICON[option.value]}</Text>
                    <Text
                      variant="caption"
                      weight="800"
                      numberOfLines={1}
                      style={{ color: active ? c.primary : c.textSecondary }}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
              {t(CATEGORY_HINT[category])}
            </Text>

            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: c.border,
                gap: spacing.sm,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('leaderboard.periodLabel')}
                </Text>
                {current ? (
                  <Text variant="caption" mono tone="tertiary" style={{ fontSize: 10 }}>
                    {t('leaderboard.updated', {
                      time: relativeTime(current.generatedAt, t, locale),
                    })}
                  </Text>
                ) : null}
              </View>
              <Chips
                options={[
                  { value: 'ALL_TIME', label: t('leaderboard.periodAllTime') },
                  { value: 'MONTH', label: t('leaderboard.periodMonth') },
                  { value: 'WEEK', label: t('leaderboard.periodWeek') },
                ]}
                value={current?.period ?? period}
                onChange={setPeriod}
                disabled={category === 'BALANCE'}
              />
            </View>

            {current && !current.periodSupported ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginTop: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: alpha(c.info, 0.2),
                  backgroundColor: alpha(c.info, 0.06),
                }}
              >
                <Ionicons name="information-circle" size={16} color={c.info} />
                <Text variant="caption" style={{ color: c.info, flex: 1 }}>
                  {t('leaderboard.snapshotNotice')}
                </Text>
              </View>
            ) : null}
          </Card>

          {error ? (
            <ErrorNote message={error} onRetry={() => void load()} retryLabel={t('leaderboard.retry')} />
          ) : null}

          {loading ? (
            <View style={{ gap: spacing.md }}>
              <Skeleton height={190} radius={radius.xl} />
              <Skeleton height={260} radius={radius.xl} />
            </View>
          ) : entries.length === 0 ? (
            <Card>
              <EmptyState icon="trophy-outline" title={t('leaderboard.empty')} />
            </Card>
          ) : (
            <>
              {/* ── Podium ── */}
              {podium.length > 0 ? (
                <Card>
                  <Text variant="title3">🏅 {t('leaderboard.podium')}</Text>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                    {CATEGORY_ICON[category]}{' '}
                    {categories.find((x) => x.value === category)?.label} ·{' '}
                    {t('leaderboard.outOf', { total: board?.totalRanked ?? 0 })}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-end',
                      gap: spacing.sm,
                      marginTop: spacing.md,
                    }}
                  >
                    {podium.map((entry, i) => (
                      <Animated.View
                        key={entry.id}
                        entering={FadeInDown.delay(i * 60).duration(280)}
                        style={{ flex: 1 }}
                      >
                        <PodiumCard entry={entry} unit={unit} decimals={decimals} />
                      </Animated.View>
                    ))}
                  </View>
                </Card>
              ) : null}

              {/* ── Full board ── */}
              <Card>
                <Text variant="title3">📊 {t('leaderboard.fullBoard')}</Text>
                <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
                  {t('leaderboard.subtitle')}
                </Text>
                <Input
                  icon="search"
                  placeholder={t('leaderboard.searchPlaceholder')}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  containerStyle={{ marginTop: spacing.md }}
                />

                {rest.length === 0 ? (
                  searching ? (
                    <EmptyState icon="search-outline" title={t('leaderboard.noMatches')} />
                  ) : null
                ) : (
                  <View
                    style={{
                      marginTop: spacing.md,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: c.border,
                      backgroundColor: c.dark ? alpha(c.bg, 0.6) : c.surfaceAlt,
                      overflow: 'hidden',
                    }}
                  >
                    {/* Column header, mono like the web's <thead> */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.md,
                        paddingVertical: 8,
                        paddingHorizontal: spacing.md,
                        borderBottomWidth: 1,
                        borderBottomColor: c.border,
                        backgroundColor: c.surfaceAlt,
                      }}
                    >
                      <Text variant="caption" mono tone="tertiary" style={{ width: 38, fontSize: 10 }}>
                        {t('leaderboard.rank')}
                      </Text>
                      <Text variant="caption" mono tone="tertiary" style={{ flex: 1, fontSize: 10 }}>
                        {t('leaderboard.miner')}
                      </Text>
                      <Text variant="caption" mono tone="tertiary" style={{ fontSize: 10 }}>
                        {t('leaderboard.score')}
                      </Text>
                    </View>
                    {rest.map((entry, i) => (
                      <Animated.View
                        key={entry.id}
                        entering={FadeInDown.delay(Math.min(i, 12) * 30).duration(240)}
                      >
                        <EntryRow
                          entry={entry}
                          unit={unit}
                          decimals={decimals}
                          last={i === rest.length - 1}
                        />
                      </Animated.View>
                    ))}
                  </View>
                )}
              </Card>

              {/* ── Integrity note ── */}
              <Card>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: radius.sm,
                      backgroundColor: alpha(c.primary, 0.15),
                      borderWidth: 1,
                      borderColor: alpha(c.primary, 0.3),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="shield-checkmark-outline" size={15} color={c.primary} />
                  </View>
                  <Text variant="callout" weight="700" style={{ flex: 1 }}>
                    {t('leaderboard.integrityTitle')}
                  </Text>
                </View>
                <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
                  {t('leaderboard.integrityBody')}
                </Text>
              </Card>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

/** One of the three podium tiles: medal, name, flag, amber score. */
function PodiumCard({
  entry,
  unit,
  decimals,
}: {
  entry: LeaderboardEntry;
  unit: string;
  decimals: number;
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const { locale } = useI18n();
  const t = useT();

  const accent = entry.rank === 1 ? c.gold : entry.rank === 2 ? c.textTertiary : BRONZE;
  const value = formatPoints(entry.value, decimals, locale);
  const first = entry.rank === 1;

  return (
    <View
      accessible
      accessibilityLabel={`#${entry.rank} ${entry.displayName}, ${value} ${unit}`}
      style={{
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: alpha(accent, first ? 0.5 : 0.4),
        overflow: 'hidden',
        paddingVertical: first ? spacing.lg : spacing.md,
        paddingHorizontal: 6,
        alignItems: 'center',
        gap: 2,
        backgroundColor: c.surface,
        ...(first && c.dark ? glow(accent, 1) : null),
      }}
    >
      <LinearGradient
        pointerEvents="none"
        colors={[alpha(accent, c.dark ? 0.2 : 0.12), c.dark ? alpha(c.bg, 0.9) : c.surface]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {entry.isCurrentUser ? (
        <View
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            paddingHorizontal: 6,
            paddingVertical: 1,
            borderRadius: radius.pill,
            backgroundColor: alpha(c.gold, 0.2),
          }}
        >
          <Text variant="overline" tone="gold" style={{ fontSize: 9, lineHeight: 12 }}>
            {t('leaderboard.you')}
          </Text>
        </View>
      ) : null}
      <Text style={{ fontSize: first ? 30 : 26, lineHeight: first ? 36 : 32 }}>
        {entry.badge.medal || '🎖️'}
      </Text>
      <Text variant="caption" mono weight="800" numberOfLines={1} style={{ marginTop: 4 }}>
        {entry.displayName}
      </Text>
      <Text variant="caption" tone="tertiary" numberOfLines={1} style={{ fontSize: 10 }}>
        {entry.countryCode === 'GLOBAL'
          ? '🌐'
          : `${countryFlag(entry.countryCode)} ${countryName(entry.countryCode, locale)}`}
      </Text>
      <Text variant="headline" mono tone="gold" numberOfLines={1} style={{ marginTop: 4 }}>
        {value}
      </Text>
      <Text variant="overline" tone="tertiary" uppercase style={{ fontSize: 9, lineHeight: 12 }}>
        {unit}
      </Text>
    </View>
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
  const { c, spacing, alpha } = useTheme();
  const { locale } = useI18n();
  const t = useT();
  const value = formatPoints(entry.value, decimals, locale);

  return (
    <View
      accessible
      accessibilityLabel={`#${entry.rank} ${entry.displayName}, ${value} ${unit}`}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 11,
        paddingHorizontal: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        backgroundColor: entry.isCurrentUser ? alpha(c.gold, 0.08) : 'transparent',
      }}
    >
      <Text
        variant="callout"
        mono
        weight="800"
        tone="secondary"
        style={{ width: 38 }}
        numberOfLines={1}
      >
        #{entry.rank}
      </Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text variant="callout" mono weight="700" numberOfLines={1} style={{ flexShrink: 1 }}>
            {entry.displayName}
          </Text>
          {entry.isCurrentUser ? <Badge label={t('leaderboard.you')} tone="gold" /> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <Text variant="caption" tone="tertiary">
            {entry.countryCode === 'GLOBAL' ? '🌐' : countryFlag(entry.countryCode)}
          </Text>
          <Badge
            label={entry.isMiningActive ? t('leaderboard.active') : t('leaderboard.idle')}
            tone={entry.isMiningActive ? 'success' : 'neutral'}
            dot
          />
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="callout" mono weight="800" tone="gold">
          {value}
        </Text>
        <Text variant="caption" tone="tertiary" style={{ fontSize: 10 }}>
          {unit}
        </Text>
      </View>
    </View>
  );
}
