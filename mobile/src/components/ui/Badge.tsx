import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';

export type BadgeTone =
  | 'neutral'
  | 'brand'
  | 'gold'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

export function Badge({
  label,
  tone = 'neutral',
  icon,
  dot,
  style,
}: {
  label: string;
  tone?: BadgeTone;
  icon?: keyof typeof Ionicons.glyphMap;
  /** A leading status dot instead of an icon. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius } = useTheme();

  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.textSecondary },
    brand: { bg: c.primaryMuted, fg: c.primary },
    gold: { bg: c.goldMuted, fg: c.gold },
    success: { bg: c.successMuted, fg: c.success },
    warning: { bg: c.warningMuted, fg: c.warning },
    danger: { bg: c.dangerMuted, fg: c.danger },
    info: { bg: c.infoMuted, fg: c.info },
  };
  const { bg, fg } = map[tone];

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 5,
          paddingHorizontal: 9,
          paddingVertical: 4,
          borderRadius: radius.pill,
          backgroundColor: bg,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {dot ? (
        <View
          style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: fg }}
        />
      ) : icon ? (
        <Ionicons name={icon} size={11} color={fg} />
      ) : null}
      <Text variant="caption" weight="700" style={{ color: fg }}>
        {label}
      </Text>
    </View>
  );
}

/** Horizontal key/value line — the workhorse of every detail panel. */
export function StatRow({
  label,
  value,
  mono,
  tone,
  strong,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: 'success' | 'danger' | 'brand' | 'gold';
  strong?: boolean;
}) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: 6,
      }}
    >
      <Text variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      <Text
        variant={strong ? 'headline' : 'callout'}
        weight={strong ? '700' : '600'}
        tone={tone ?? 'primary'}
        mono={mono}
        style={{ flexShrink: 1, textAlign: 'right' }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: c.border,
        marginLeft: inset,
      }}
    />
  );
}
