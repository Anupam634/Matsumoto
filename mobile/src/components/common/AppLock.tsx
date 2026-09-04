import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, View, type AppStateStatus } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Text } from '../ui/Text';
import { Button } from '../ui/Button';
import { useTheme } from '../../theme/ThemeProvider';
import { useSettings } from '../../store/settings';
import { useSession } from '../../store/session';
import { useT } from '../../i18n';

/** Grace period before a background trip re-locks — matches banking apps. */
const RELOCK_AFTER_MS = 30_000;

/**
 * Biometric app lock.
 *
 * Renders over the whole app while locked, blurring what is behind it so a
 * balance is not readable through the overlay. Opt-in from Settings, and it
 * unlocks itself if the device turns out to have no biometrics enrolled — a
 * lock nobody can open would just be a way to lose an account.
 */
export function AppLock({ children }: { children: React.ReactNode }) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const { settings, update } = useSettings();
  const { state, signOut } = useSession();

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

      {enabled && locked ? (
        <BlurView
          intensity={60}
          tint={c.bg === '#FFFFFF' ? 'light' : 'dark'}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
            padding: spacing.xl,
            gap: spacing.md,
            backgroundColor: `${c.bg}E6`,
          }}
        >
          <Image
            source={require('../../../assets/logo.png')}
            style={{ width: 76, height: 76, borderRadius: radius.xl }}
            contentFit="contain"
          />
          <Text variant="title2" center>
            {t('lock.title')}
          </Text>
          <Text
            variant="footnote"
            tone="secondary"
            center
            style={{ maxWidth: 280 }}
          >
            {failed ? t('lock.failed') : t('lock.body')}
          </Text>

          <View style={{ width: '100%', maxWidth: 320, gap: spacing.sm, marginTop: spacing.md }}>
            <Button
              label={t('lock.unlock')}
              icon="finger-print"
              onPress={authenticate}
              loading={prompting}
              fullWidth
            />
            <Button
              label={t('lock.signOut')}
              variant="ghost"
              onPress={() => {
                setLocked(false);
                void signOut();
              }}
              fullWidth
            />
          </View>

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              marginTop: spacing.sm,
            }}
          >
            <Ionicons name="lock-closed" size={12} color={c.textTertiary} />
            <Text variant="caption" tone="tertiary">
              BONDKOIN
            </Text>
          </View>
        </BlurView>
      ) : null}
    </View>
  );
}
