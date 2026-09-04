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
 * The dashboard's `REASON_CHIP` colours, one hue per ledger reason. These are
 * brand hues rather than palette tokens on the site too, so they read the
 * same in every theme.
 */
const REASON_CHIP: Record<LedgerReason, string> = {
  MINING: '#818CF8',
  TASK_REWARD: '#22C55E',
  REFERRAL_BONUS: '#38BDF8',
  BOOSTER_PURCHASE: '#A78BFA',
  WITHDRAWAL: '#F59E0B',
  AIRDROP: '#EC4899',
  ADMIN_ADJUST: '#94A3B8',
};

/**
 * One ledger entry.
 *
 * Shared by the dashboard's preview and the full history screen, so a credit
 * reads identically in both places: a tinted chip per reason, the reason and
 * time, and a tabular `+x` in emerald or `−x` in amber.
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
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const { locale } = useI18n();

  const positive = points >= 0;
  const chip = REASON_CHIP[reason] ?? REASON_CHIP.ADMIN_ADJUST;

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
          width: 36,
          height: 36,
          borderRadius: radius.md,
          backgroundColor: alpha(chip, c.dark ? 0.15 : 0.12),
          borderWidth: 1,
          borderColor: alpha(chip, c.dark ? 0.35 : 0.3),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={REASON_ICON[reason]} size={16} color={chip} />
      </View>

      <View style={{ flex: 1 }}>
        <Text variant="callout" weight="700" numberOfLines={1}>
          {t(`dashboard.reason.${reason}`)}
        </Text>
        <Text variant="caption" tone="tertiary">
          {relativeTime(createdAt, t, locale)}
        </Text>
      </View>

      <Text
        variant="callout"
        mono
        weight="800"
        tone={positive ? 'success' : 'gold'}
        style={{ flexShrink: 0 }}
      >
        {positive ? '+' : '−'}
        {formatPoints(Math.abs(points), 2, locale)}
      </Text>
    </View>
  );
}
