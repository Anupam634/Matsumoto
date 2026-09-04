import React, { useEffect } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { Button } from './Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback } from '../../lib/feedback';

/**
 * Bottom sheet.
 *
 * Slides in over a dimmed backdrop and springs to rest, which is the modal
 * idiom on both platforms now. Tapping the scrim or the grabber dismisses it,
 * and the content scrolls internally so a tall sheet never clips its actions.
 */
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
  scrollable = true,
  /** Fraction of the screen the sheet may occupy. */
  maxHeight = 0.9,
  dismissable = true,
  style,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: number;
  dismissable?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { c, spacing, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = visible
      ? withSpring(1, { damping: 22, stiffness: 240, mass: 0.7 })
      : withTiming(0, { duration: 160 });
  }, [visible, progress]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 420 }],
    opacity: progress.value,
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  const close = () => {
    if (!dismissable) return;
    feedback.select();
    onClose();
  };

  const inner = (
    <View style={{ gap: spacing.md }}>{children}</View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={close}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: c.scrim,
            },
            scrimStyle,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            style={{ flex: 1 }}
            onPress={close}
          />
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          <Animated.View
            style={[
              {
                backgroundColor: c.surface,
                borderTopLeftRadius: radius.xxl,
                borderTopRightRadius: radius.xxl,
                paddingBottom: insets.bottom + spacing.lg,
                maxHeight: `${maxHeight * 100}%`,
                ...elevation(3),
              },
              sheetStyle,
              style,
            ]}
          >
            {/* Grabber */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={close}
              style={{ alignItems: 'center', paddingVertical: spacing.md }}
            >
              <View
                style={{
                  width: 38,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: c.borderStrong,
                }}
              />
            </Pressable>

            {title ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: spacing.md,
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text variant="title3">{title}</Text>
                  {subtitle ? (
                    <Text
                      variant="footnote"
                      tone="secondary"
                      style={{ marginTop: 3 }}
                    >
                      {subtitle}
                    </Text>
                  ) : null}
                </View>
                {dismissable ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Close"
                    hitSlop={10}
                    onPress={close}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: c.surfaceAlt,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="close" size={17} color={c.textSecondary} />
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: spacing.lg,
                  paddingBottom: spacing.md,
                }}
              >
                {inner}
              </ScrollView>
            ) : (
              <View style={{ paddingHorizontal: spacing.lg }}>{inner}</View>
            )}

            {footer ? (
              <View
                style={{
                  paddingHorizontal: spacing.lg,
                  paddingTop: spacing.md,
                  gap: spacing.sm,
                  borderTopWidth: 1,
                  borderTopColor: c.border,
                }}
              >
                {footer}
              </View>
            ) : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

/**
 * Confirmation sheet — a destructive or committing choice.
 *
 * Preferred over `Alert.alert` so confirmations look like the rest of the app
 * and can carry an icon and a longer explanation.
 */
export function ConfirmSheet({
  visible,
  onClose,
  onConfirm,
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  icon = 'help-circle',
  loading,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
}) {
  const { c, spacing, radius } = useTheme();

  return (
    <Sheet visible={visible} onClose={onClose} scrollable={false}>
      <View style={{ alignItems: 'center', gap: spacing.sm }}>
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: radius.lg,
            backgroundColor: destructive ? c.dangerMuted : c.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={icon}
            size={26}
            color={destructive ? c.danger : c.primary}
          />
        </View>
        <Text variant="title3" center>
          {title}
        </Text>
        {body ? (
          <Text variant="footnote" tone="secondary" center>
            {body}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          label={confirmLabel}
          onPress={onConfirm}
          loading={loading}
          variant={destructive ? 'danger' : 'primary'}
          fullWidth
        />
        <Button
          label={cancelLabel}
          onPress={onClose}
          variant="ghost"
          fullWidth
        />
      </View>
    </Sheet>
  );
}
