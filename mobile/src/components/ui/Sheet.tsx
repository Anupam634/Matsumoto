import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedKeyboard,
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
import { useT } from '../../i18n';

const EXIT_MS = 180;
const DISMISS_DISTANCE = 110;
const DISMISS_VELOCITY = 900;

/**
 * Bottom sheet.
 *
 * Slides in over a dimmed backdrop and springs to rest, which is the modal
 * idiom on both platforms now. Tapping the scrim, pulling the grabber down,
 * or the hardware back button dismisses it; the exit animation plays before
 * the native modal unmounts, and `onDismiss` fires only once it is fully gone
 * — the moment to present a camera or another modal on top.
 *
 * The keyboard is tracked with Reanimated rather than KeyboardAvoidingView:
 * RN's Modal disables Android's resize behaviour when it is translucent, so
 * KeyboardAvoidingView never fires there.
 */
export function Sheet({
  visible,
  onClose,
  onDismiss,
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
  /** Called after the close animation, once the modal is off screen. */
  onDismiss?: () => void;
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
  const t = useT();
  const insets = useSafeAreaInsets();
  const feedback = useFeedback();

  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  // SDK 54 is edge-to-edge on Android, so the translucency flags are moot.
  const keyboard = useAnimatedKeyboard();

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  const finishClose = useCallback(() => {
    setMounted(false);
    onDismissRef.current?.();
  }, []);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      drag.value = 0;
      progress.value = withSpring(1, { damping: 22, stiffness: 240, mass: 0.7 });
      return;
    }
    if (!mounted) return;
    progress.value = withTiming(0, { duration: EXIT_MS }, (done) => {
      if (done) runOnJS(finishClose)();
    });
    // `mounted` is deliberately not a dependency: this effect reacts to
    // `visible` flipping, and reads the current mount state when it does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, progress, drag, finishClose]);

  const close = useCallback(() => {
    if (!dismissable) return;
    feedback.select();
    onClose();
  }, [dismissable, feedback, onClose]);

  const pan = Gesture.Pan()
    .enabled(dismissable)
    .activeOffsetY(8)
    .onUpdate((e) => {
      drag.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        runOnJS(close)();
      } else {
        drag.value = withSpring(0, { damping: 20, stiffness: 260 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * 420 + drag.value }],
    opacity: progress.value,
    marginBottom: keyboard.height.value,
  }));

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));

  if (!mounted) return null;

  const inner = <View style={{ gap: spacing.md }}>{children}</View>;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={close}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
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
              accessibilityLabel={t('app.close')}
              style={{ flex: 1 }}
              onPress={close}
            />
          </Animated.View>

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
            <GestureDetector gesture={pan}>
              <View>
                {/* Grabber */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('app.close')}
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
                        accessibilityLabel={t('app.close')}
                        hitSlop={10}
                        onPress={close}
                        style={({ pressed }) => ({
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: c.surfaceAlt,
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: pressed ? 0.6 : 1,
                        })}
                      >
                        <Ionicons name="close" size={17} color={c.textSecondary} />
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </GestureDetector>

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
        </View>
      </GestureHandlerRootView>
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
