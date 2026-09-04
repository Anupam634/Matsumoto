import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, View, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '../ui/Text';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { PulseDot } from '../ui/Pulse';
import { GlowField } from '../ui/Chrome';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../store/settings';
import { useSession } from '../../store/session';
import { useNotifications } from '../../store/notifications';
import { useT } from '../../i18n';

/** Grace period before a background trip re-locks — matches banking apps. */
const RELOCK_AFTER_MS = 30_000;

/**
 * Biometric app lock.
 *
 * Presented as an opaque native modal while locked, so it sits above every
 * route — including the screens the navigator itself presents modally, which
 * an absolutely-positioned overlay in the React tree would slide underneath.
 * Opt-in from Settings, and it unlocks itself if the device turns out to have
 * no biometrics enrolled — a lock nobody can open would just be a way to lose
 * an account.
 *
 * Dressed as the site's hero: glow field and cyber grid behind a glass panel,
 * the logo in a blue halo, a pulsing SECURED badge and a gradient Unlock.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const { c, spacing, radius, scheme, alpha, glow } = useTheme();
  const t = useT();
  const { settings, update } = useSettings();
  const { state, signOut } = useSession();
  const { resetForNewSession } = useNotifications();

  const enabled = settings.appLock && state === 'signedIn';
  const [locked, setLocked] = useState(enabled);
  const [failed, setFailed] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const backgroundedAt = useRef<number | null>(null);

  const authenticate = useCallback(async () => {
    if (prompting) return;
    setPrompting(true);
    setFailed(false);
    try {
      const supported = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!supported || !enrolled) {
        // Nothing to authenticate against: disable the setting rather than
        // leaving the user staring at a door with no key.
        update({ appLock: false });
        setLocked(false);
        return;
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('lock.title'),
        cancelLabel: t('app.cancel'),
        disableDeviceFallback: false,
      });
      if (result.success) {
        setLocked(false);
      } else {
        setFailed(true);
      }
    } catch {
      setFailed(true);
    } finally {
      setPrompting(false);
    }
  }, [prompting, t, update]);

  /* Lock on launch, and whenever the setting is switched on. */
  useEffect(() => {
    if (!enabled) {
      setLocked(false);
      return;
    }
    setLocked(true);
  }, [enabled]);

  /* Prompt as soon as the overlay appears. */
  useEffect(() => {
    if (enabled && locked && !prompting) void authenticate();
    // Only when the lock first goes up: re-running on every render would
    // re-prompt in a loop after a cancel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, locked]);

  /* Re-lock after a real absence, not a glance at the notification shade. */
  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (next === 'active' && backgroundedAt.current) {
        const away = Date.now() - backgroundedAt.current;
        backgroundedAt.current = null;
        if (away > RELOCK_AFTER_MS) setLocked(true);
      }
    });
    return () => sub.remove();
  }, [enabled]);

  return (
    <View style={{ flex: 1 }}>
      {children}

      <Modal
        visible={enabled && locked}
        presentationStyle="overFullScreen"
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        navigationBarTranslucent
        // Android back button: the lock is not dismissable that way.
        onRequestClose={() => {}}
      >
        {/* A native modal is its own window: restate the bar style for it. */}
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
            backgroundColor: c.bg,
          }}
        >
          <GlowField />

          <Animated.View entering={FadeInDown.duration(320)} style={{ width: '100%', maxWidth: 360 }}>
            <Card glow style={{ alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.md }}>
              {/* SECURED badge — the site's pulse-dot pill */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: alpha(c.gold, 0.4),
                  backgroundColor: alpha(c.gold, 0.1),
                }}
              >
                <PulseDot color={c.success} size={7} />
                <Text variant="overline" tone="gold" uppercase style={{ fontSize: 10 }}>
                  {t('lock.secured')}
                </Text>
              </View>

              <View
                style={{
                  borderRadius: radius.xl,
                  marginTop: spacing.xs,
                  ...(c.dark ? glow(c.primaryGlow, 3) : null),
                }}
              >
                <Image
                  source={require('../../../assets/logo.png')}
                  style={{ width: 84, height: 84, borderRadius: radius.xl }}
                  contentFit="contain"
                />
              </View>

              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text variant="title2" center>
                  {t('lock.title')}
                </Text>
                <Text
                  variant="footnote"
                  tone={failed ? 'danger' : 'secondary'}
                  center
                  style={{ maxWidth: 280 }}
                >
                  {failed ? t('lock.failed') : t('lock.body')}
                </Text>
              </View>

              <View style={{ width: '100%', gap: spacing.sm, marginTop: spacing.xs }}>
                <Button
                  label={t('lock.unlock')}
                  icon="finger-print"
                  onPress={authenticate}
                  loading={prompting}
                  fullWidth
                  size="lg"
                />
                <Button
                  label={t('lock.signOut')}
                  variant="ghost"
                  onPress={() => {
                    setLocked(false);
                    // Same exit as the Account menu: derived notifications and
                    // anything scheduled in the OS go with the account.
                    void resetForNewSession().then(() => signOut());
                  }}
                  fullWidth
                />
              </View>
            </Card>
          </Animated.View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: spacing.xl,
            }}
          >
            <Ionicons name="lock-closed" size={12} color={c.textTertiary} />
            <Text variant="overline" tone="tertiary" uppercase>
              {t('app.name')}
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}
