import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * iOS-style segmented control: a pill that slides under the active segment.
 *
 * Best for two to four peer options. Anything longer belongs in `<Chips>`,
 * which scrolls.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, spacing } = useTheme();
  const feedback = useFeedback();
  const [width, setWidth] = useState(0);

  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segmentWidth = width > 0 ? (width - 6) / options.length : 0;
  const offset = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  // Keep the thumb glued to the selected segment when either changes.
  React.useEffect(() => {
    offset.value = withSpring(index * segmentWidth, {
      damping: 20,
      stiffness: 240,
    });
  }, [index, segmentWidth, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      onLayout={onLayout}
      style={[
        {
          flexDirection: 'row',
          backgroundColor: c.surfaceAlt,
          borderRadius: radius.md,
          padding: 3,
        },
        style,
      ]}
    >
      {segmentWidth > 0 ? (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 3,
              left: 3,
              bottom: 3,
              width: segmentWidth,
              borderRadius: radius.sm,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
            },
            thumbStyle,
          ]}
        />
      ) : null}

      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              feedback.select();
              onChange(option.value);
            }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              variant="callout"
              weight={active ? '700' : '500'}
              tone={active ? 'primary' : 'secondary'}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A scrolling row of filter pills, for lists with many facets. */
export function Chips<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (next: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, radius, spacing } = useTheme();
  const feedback = useFeedback();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: spacing.sm, paddingRight: spacing.lg }}
      style={style}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => {
              feedback.select();
              onChange(option.value);
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: radius.pill,
              backgroundColor: active ? c.primary : c.surface,
              borderWidth: 1,
              borderColor: active ? c.primary : c.border,
            }}
          >
            <Text
              variant="footnote"
              weight={active ? '700' : '500'}
              style={{ color: active ? c.onPrimary : c.textSecondary }}
            >
              {option.label}
            </Text>
            {option.count !== undefined ? (
              <Text
                variant="caption"
                weight="700"
                style={{ color: active ? c.onPrimary : c.textTertiary }}
              >
                {option.count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
