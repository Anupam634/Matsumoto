import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '../../theme/ThemeProvider';

/**
 * Transient confirmation, shown at the top so it never covers the tab bar or a
 * primary action. One at a time: a new toast replaces the current one rather
 * than stacking.
 */

type ToastTone = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  tone: ToastTone;
  key: number;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VISIBLE_MS = 2600;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { c, spacing, radius, elevation } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progress = useSharedValue(0);

  const show = useCallback(
    (message: string, tone: ToastTone = 'info') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ message, tone, key: Date.now() });
      progress.value = withSpring(1, { damping: 20, stiffness: 260 });
      timer.current = setTimeout(() => {
        progress.value = withTiming(0, { duration: 200 });
        // Unmount after the exit animation, not before it.
        setTimeout(() => setToast(null), 220);
      }, VISIBLE_MS);
    },
    [progress],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * -24 }],
  }));

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
    }),
    [show],
  );

  const tone = toast?.tone ?? 'info';
  const accent =
    tone === 'success' ? c.success : tone === 'error' ? c.danger : c.primary;
  const icon =
    tone === 'success'
      ? 'checkmark-circle'
      : tone === 'error'
        ? 'alert-circle'
        : 'information-circle';

  const banner = toast ? (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: insets.top + spacing.sm,
          left: spacing.lg,
          right: spacing.lg,
          zIndex: 1000,
        },
        animatedStyle,
      ]}
    >
      <View
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.lg,
          backgroundColor: c.surface,
          borderWidth: 1,
          borderColor: c.border,
          ...elevation(2),
        }}
      >
        <Ionicons name={icon} size={19} color={accent} />
        <Text variant="footnote" weight="600" style={{ flex: 1 }}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  ) : null;

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* iOS: a window-level overlay so the toast sits above any open Sheet
          (a native Modal). Android draws Modals in their own window, so the
          toast stays in the root view there. */}
      {Platform.OS === 'ios' ? (
        <FullWindowOverlay>
          <View pointerEvents="box-none" style={{ flex: 1 }}>
            {banner}
          </View>
        </FullWindowOverlay>
      ) : (
        banner
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
