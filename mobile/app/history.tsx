import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Chips } from '../src/components/ui/Segmented';
import { EmptyState, NavBar, Screen, Skeleton } from '../src/components/ui/Chrome';
import { ActivityRow } from '../src/components/common/ActivityRow';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { formatPoints } from '../src/lib/format';
import { POINTS_PER_TOKEN, type LedgerReason } from '../src/api/endpoints';

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

/** The full ledger, filterable — the same entries the dashboard previews. */
export default function HistoryScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const { history, refreshing, refresh } = useSession();

  const [filter, setFilter] = useState<Filter>('ALL');

  const entries = useMemo(() => {
    const all = history?.entries ?? [];
    if (filter === 'ALL') return all;
    return all.filter((e) => GROUPS[filter].includes(e.reason));
  }, [history, filter]);

  return (
    <Screen sunken>
      <NavBar title={t('historyScreen.title')} />

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
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        <View style={{ paddingHorizontal: spacing.lg }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[c.successMuted, c.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg }}
            >
              <Text variant="overline" tone="tertiary" uppercase>
                {t('historyScreen.lifetime')}
              </Text>
              {history ? (
                <>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}
                  >
                    <Text variant="display" mono>
                      {formatPoints(history.lifetimeEarnedPoints, 2, locale)}
                    </Text>
                    <Text variant="callout" tone="gold" weight="700">
                      PTS
                    </Text>
                  </View>
                  <Text variant="footnote" tone="secondary">
                    ≈{' '}
                    {formatPoints(
                      history.lifetimeEarnedPoints / POINTS_PER_TOKEN,
                      4,
                      locale,
                    )}{' '}
                    $BONDKOIN
                  </Text>
                </>
              ) : (
                <Skeleton height={38} width="55%" style={{ marginTop: 6 }} />
              )}
            </LinearGradient>
          </Card>
        </View>

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

        <View style={{ paddingHorizontal: spacing.lg }}>
          {!history ? (
            <Skeleton height={240} radius={radius.xl} />
          ) : entries.length === 0 ? (
            <EmptyState icon="receipt-outline" title={t('historyScreen.empty')} />
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {entries.map((entry, i) => (
                <ActivityRow
                  key={entry.id}
                  reason={entry.reason}
                  points={entry.points}
                  createdAt={entry.createdAt}
                  last={i === entries.length - 1}
                />
              ))}
            </Card>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
