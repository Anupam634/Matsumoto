import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../ui/Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useI18n, useT } from '../../i18n';
import { formatPoints, relativeTime } from '../../lib/format';
import type { LedgerReason } from '../../api/endpoints';

const REASON_ICON: Record<LedgerReason, keyof typeof Ionicons.glyphMap> = {
  MINING: 'flash',
  TASK_REWARD: 'gift',
  REFERRAL_BONUS: 'people',
  BOOSTER_PURCHASE: 'rocket',
  WITHDRAWAL: 'arrow-up-circle',
  AIRDROP: 'sparkles',
  ADMIN_ADJUST: 'construct',
};

/**
 * One ledger entry.
 *
 * Shared by the dashboard's preview and the full history screen, so a credit
 * reads identically in both places.
 */
export function ActivityRow({
  reason,
  points,
  createdAt,
  last,
}: {
  reason: LedgerReason;
  points: number;
  createdAt: string;
  last?: boolean;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const { locale } = useI18n();

  const positive = points >= 0;
  const tint = positive ? c.success : c.warning;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: 11,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
      }}
    >
      <View
        style={{
          width: 34,
          height: 34,
          borderRadius: radius.sm,
          backgroundColor: `${tint}1A`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={REASON_ICON[reason]} size={16} color={tint} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="callout" weight="600" numberOfLines={1}>
          {t(`dashboard.reason.${reason}`)}
        </Text>
        <Text variant="caption" tone="tertiary">
          {relativeTime(createdAt, t, locale)}
        </Text>
      </View>

      <Text
        variant="callout"
        mono
        weight="700"
        tone={positive ? 'success' : 'warning'}
      >
        {positive ? '+' : ''}
        {formatPoints(points, 2, locale)}
      </Text>
    </View>
  );
}
