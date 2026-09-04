import React from 'react';
import {
  Pressable,
  Switch,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

type RowTone = 'default' | 'brand' | 'danger' | 'success' | 'warning';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  tone?: RowTone;
  /** Right-hand value text, e.g. the current setting. */
  value?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (next: boolean) => void; disabled?: boolean };
  /** Custom trailing content, taking precedence over value/chevron. */
  trailing?: React.ReactNode;
  chevron?: boolean;
  disabled?: boolean;
  first?: boolean;
  last?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * One row of a grouped list — the Settings idiom, reused for every menu.
 *
 * Rows are meant to be stacked inside a `<ListGroup>`, which draws the card
 * around them and the hairline separators between.
 */
export function ListRow({
  title,
  subtitle,
  icon,
  tone = 'default',
  value,
  onPress,
  toggle,
  trailing,
  chevron,
  disabled,
  last,
  style,
}: ListRowProps) {
  const { c, spacing, radius } = useTheme();
  const feedback = useFeedback();

  const accent = {
    default: c.textSecondary,
    brand: c.primary,
    danger: c.danger,
    success: c.success,
    warning: c.warning,
  }[tone];

  const accentBg = {
    default: c.surfaceAlt,
    brand: c.primaryMuted,
    danger: c.dangerMuted,
    success: c.successMuted,
    warning: c.warningMuted,
  }[tone];

  const showChevron = chevron ?? (!!onPress && !toggle && !trailing);

  // iOS-style inset separator: starts at the text, not the card edge.
  const separatorInset = icon ? spacing.lg + 30 + spacing.md : spacing.lg;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: subtitle ? 12 : 13,
        paddingHorizontal: spacing.lg,
        minHeight: 52,
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {icon ? (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: radius.sm,
            backgroundColor: accentBg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={16} color={accent} />
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        <Text
          variant="body"
          weight="500"
          tone={tone === 'danger' ? 'danger' : 'primary'}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text variant="caption" tone="tertiary" style={{ marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {trailing ??
        (toggle ? (
          <Switch
            value={toggle.value}
            disabled={toggle.disabled || disabled}
            onValueChange={(next) => {
              feedback.select();
              toggle.onChange(next);
            }}
            trackColor={{ false: c.borderStrong, true: c.primary }}
            thumbColor={c.onPrimary}
            ios_backgroundColor={c.borderStrong}
          />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {value ? (
              <Text variant="callout" tone="tertiary" numberOfLines={1}>
                {value}
              </Text>
            ) : null}
            {showChevron ? (
              <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
            ) : null}
          </View>
        ))}
    </View>
  );

  const separator = last ? null : (
    <View
      style={{
        height: 1,
        marginLeft: separatorInset,
        backgroundColor: c.border,
      }}
    />
  );

  if (!onPress || disabled) {
    return (
      <View style={style}>
        {content}
        {separator}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => [
        { backgroundColor: pressed ? c.surfaceAlt : 'transparent' },
        style,
      ]}
    >
      {content}
      {separator}
    </Pressable>
  );
}

/** Card wrapper that clips its rows, so separators meet the rounded corners. */
export function ListGroup({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, elevation } = useTheme();
  const rows = React.Children.toArray(children).filter(Boolean);

  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderRadius: radius.xl,
          borderWidth: 1,
          borderColor: c.border,
          overflow: 'hidden',
          ...elevation(1),
        },
        style,
      ]}
    >
      {rows.map((child, i) =>
        React.isValidElement<ListRowProps>(child)
          ? React.cloneElement(child, {
              key: child.key ?? i,
              first: i === 0,
              last: i === rows.length - 1,
            })
          : child,
      )}
    </View>
  );
}
