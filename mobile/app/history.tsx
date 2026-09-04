import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Chips } from '../src/components/ui/Segmented';
import { EmptyState, ErrorNote, NavBar, Screen, Skeleton } from '../src/components/ui/Chrome';
import { ActivityRow } from '../src/components/common/ActivityRow';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useAsyncData } from '../src/lib/hooks';
import { formatPoints } from '../src/lib/format';
import { errorMessage } from '../src/api/client';
import {
  getMiningHistory,
  POINTS_PER_TOKEN,
  type LedgerReason,
  type MiningHistory,
} from '../src/api/endpoints';

type Filter = 'ALL' | 'MINING' | 'TASKS' | 'OTHER';

const GROUPS: Record<Exclude<Filter, 'ALL'>, LedgerReason[]> = {
  MINING: ['MINING'],
  TASKS: ['TASK_REWARD'],
  OTHER: [
    'REFERRAL_BONUS',
    'BOOSTER_PURCHASE',
    'WITHDRAWAL',
    'AIRDROP',
    'ADMIN_ADJUST',
  ],
};

/** How deep the ledger goes here — the server's ceiling. */
const PAGE = 200;

/** Rows past this index appear at once; a 200-row stagger would take seconds. */
const STAGGER_LIMIT = 12;

/**
 * The full ledger, filterable.
 *
 * The session store keeps a dozen rows for the dashboard preview; this screen
 * asks for the server's maximum instead, so that the filters have something
 * to filter. The store's copy stands in until the deeper fetch lands.
 */
export default function HistoryScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const { history: preview, refresh } = useSession();

  const load = useCallback(() => getMiningHistory(PAGE), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data, error, refreshing, reload } = useAsyncData<MiningHistory>(
    load,
    toMessage,
  );
  const history = data ?? preview;

  const [filter, setFilter] = useState<Filter>('ALL');

  const entries = useMemo(() => {
    const all = history?.entries ?? [];
    if (filter === 'ALL') return all;
    return all.filter((e) => GROUPS[filter].includes(e.reason));
  }, [history, filter]);

  const onRefresh = () => {
    void reload();
    // Keep the dashboard's preview and balance in step with what we show.
    void refresh();
  };

  return (
    <Screen sunken>
      <NavBar title={t('historyScreen.title')} />

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
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* Lifetime hero — the site's glowing stat panel */}
        <Animated.View
          entering={FadeInDown.duration(260)}
          style={{ paddingHorizontal: spacing.lg }}
        >
          <Card glow>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.md,
              }}
            >
              <View style={{ flex: 1 }}>
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('historyScreen.lifetime')}
                </Text>
                {history ? (
                  <>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <Text variant="display" mono tone="gold">
                        {formatPoints(history.lifetimeEarnedPoints, 2, locale)}
                      </Text>
                      <Text variant="callout" tone="tertiary" weight="800" uppercase>
                        {t('dashboard.pointsShort')}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        gap: 4,
                        marginTop: 2,
                      }}
                    >
                      <Text variant="footnote" tone="tertiary" mono>
                        ≈
                      </Text>
                      <Text variant="callout" tone="info" mono weight="800">
                        {formatPoints(
                          history.lifetimeEarnedPoints / POINTS_PER_TOKEN,
                          4,
                          locale,
                        )}
                      </Text>
                      <Text variant="caption" tone="info" weight="700">
                        $BONDKOIN
                      </Text>
                    </View>
                  </>
                ) : (
                  <Skeleton height={38} width="55%" style={{ marginTop: 6 }} />
                )}
              </View>

              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.primary, 0.15),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="receipt" size={24} color={c.primary} />
              </View>
            </View>
          </Card>
        </Animated.View>

        <Chips
          options={[
            { value: 'ALL', label: t('historyScreen.filterAll') },
            { value: 'MINING', label: t('historyScreen.filterMining') },
            { value: 'TASKS', label: t('historyScreen.filterTasks') },
            { value: 'OTHER', label: t('historyScreen.filterOther') },
          ]}
          value={filter}
          onChange={setFilter}
          style={{ paddingLeft: spacing.lg }}
        />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {error && !history ? (
            <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
          ) : null}

          {!history ? (
            <Skeleton height={240} radius={radius.xl} />
          ) : entries.length === 0 ? (
            <EmptyState icon="receipt-outline" title={t('historyScreen.empty')} />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: spacing.lg,
                  paddingBottom: spacing.xs,
                }}
              >
                <Text variant="headline">{t('dashboard.recentTitle')}</Text>
                <View
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                    backgroundColor: alpha(c.primary, 0.1),
                    borderWidth: 1,
                    borderColor: alpha(c.primary, 0.25),
                  }}
                >
                  <Text variant="caption" tone="brand" mono weight="700">
                    {entries.length}
                  </Text>
                </View>
              </View>
              {entries.map((entry, i) => (
                <Animated.View
                  // Re-key on the filter so the stagger replays when the list changes.
                  key={`${filter}-${entry.id}`}
                  entering={FadeInDown.delay(Math.min(i, STAGGER_LIMIT) * 40).duration(260)}
                >
                  <ActivityRow
                    reason={entry.reason}
                    points={entry.points}
                    createdAt={entry.createdAt}
                    last={i === entries.length - 1}
                  />
                </Animated.View>
              ))}
            </Card>
          )}

          {/* The whole ledger fits on one page unless the server capped it. */}
          {data && data.entries.length > 0 && data.entries.length < PAGE ? (
            <Text variant="caption" tone="tertiary" center>
              {t('historyScreen.endOfHistory')}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}
