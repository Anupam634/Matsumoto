import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { OtpInput } from '../../src/components/common/OtpInput';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
  type TwoFactorSetup,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';

type Mode = 'status' | 'setup' | 'disable';

/** The setup key in groups of four — easier to read out and to type. */
function groupKey(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Two-factor authentication with an authenticator app (Google Authenticator,
 * Authy, …). Once on, signing in and withdrawing both need the app's
 * 6-digit code.
 *
 * Setup is two steps, matching the server: `setupTwoFactor` hands out a key —
 * opened straight in the authenticator on this phone, or scanned / typed on
 * another device — and nothing is enforced until a code from the app proves
 * it has the key. Turning it on or off also needs the password, and signs
 * every other device out; the API layer swaps in the fresh token for this one.
 */
export default function TwoFactorScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const feedback = useFeedback();
  const { profile, refresh, patch } = useSession();

  const enabled = !!profile?.twoFactorEnabled;

  const [mode, setMode] = useState<Mode>('status');
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = (next: Mode) => {
    setMode(next);
    setCode('');
    setPassword('');
    setShowPassword(false);
    setError(null);
  };

  const startSetup = async () => {
    setError(null);
    setBusy(true);
    try {
      setSetup(await setupTwoFactor());
      reset('setup');
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const openAuthenticator = async () => {
    if (!setup) return;
    try {
      await Linking.openURL(setup.otpauthUrl);
    } catch {
      toast.error(t('twoFactor.noApp'));
    }
  };

  const copyKey = async () => {
    if (!setup) return;
    await Clipboard.setStringAsync(setup.secret);
    feedback.success();
    toast.success(t('app.copied'));
  };

  /** Turn it on or off; both answer with the new state and a fresh token. */
  const change = async (action: 'enable' | 'disable') => {
    if (busy || code.length < 6 || !password) return;
    setError(null);
    setBusy(true);
    try {
      const res =
        action === 'enable'
          ? await enableTwoFactor(code, password)
          : await disableTwoFactor(code, password);
      // Show the new state at once; the poll confirms it.
      patch({ profile: { twoFactorEnabled: res.enabled } });
      void refresh();
      feedback.success();
      toast.success(res.enabled ? t('twoFactor.enabledToast') : t('twoFactor.disabledToast'));
      setSetup(null);
      reset('status');
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const tile = (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: radius.md,
        backgroundColor: alpha(enabled ? c.success : c.primary, 0.15),
        borderWidth: 1,
        borderColor: alpha(enabled ? c.success : c.primary, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={enabled ? 'shield-checkmark' : 'shield-outline'}
        size={21}
        color={enabled ? c.success : c.primary}
      />
    </View>
  );

  /** Code + password + submit — the same pair confirms turning it on and off. */
  const confirmFields = (action: 'enable' | 'disable') => (
    <>
      <View style={{ gap: 6 }}>
        <Text variant="overline" tone="tertiary" uppercase>
          {t('twoFactor.codeLabel')}
        </Text>
        <OtpInput
          value={code}
          onChange={(next) => {
            setCode(next);
            if (error) setError(null);
          }}
          // Setup starts in the authenticator app; don't throw the keyboard
          // over the key and QR code before the user has been there.
          autoFocus={action === 'disable'}
        />
      </View>

      <Input
        label={t('auth.password')}
        icon="lock-closed-outline"
        value={password}
        onChangeText={(next) => {
          setPassword(next);
          if (error) setError(null);
        }}
        placeholder="••••••••"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        maxLength={128}
        returnKeyType="done"
        onSubmitEditing={() => void change(action)}
        trailing={
          <InputAction
            icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            accessibilityLabel={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
            onPress={() => setShowPassword((v) => !v)}
          />
        }
      />

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={action === 'enable' ? t('twoFactor.turnOn') : t('twoFactor.turnOff')}
        variant={action === 'enable' ? 'primary' : 'danger'}
        icon={action === 'enable' ? 'shield-checkmark-outline' : undefined}
        onPress={() => void change(action)}
        loading={busy}
        disabled={code.length < 6 || !password}
        fullWidth
        size="lg"
      />
      <Button label={t('app.cancel')} variant="ghost" onPress={() => reset('status')} fullWidth />
    </>
  );

  return (
    <Screen>
      <NavBar
        title={t('twoFactor.title')}
        transparent
        onBack={mode === 'status' ? undefined : () => reset('status')}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        {mode === 'status' ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow style={{ gap: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {tile}
                <View style={{ flex: 1 }}>
                  <Text variant="overline" tone="tertiary" uppercase>
                    {t('settings.account')}
                  </Text>
                  <Text variant="headline">{t('twoFactor.title')}</Text>
                </View>
                <Badge
                  label={enabled ? t('app.enabled') : t('app.disabled')}
                  tone={enabled ? 'success' : 'neutral'}
                  dot
                />
              </View>

              <Text variant="footnote" tone="secondary">
                {enabled ? t('twoFactor.onBody') : t('twoFactor.offBody')}
              </Text>

              {error ? <ErrorNote message={error} /> : null}

              {enabled ? (
                <>
                  <Text variant="caption" tone="tertiary">
                    {t('twoFactor.lostDevice')}
                  </Text>
                  <Button
                    label={t('twoFactor.turnOff')}
                    variant="secondary"
                    onPress={() => reset('disable')}
                    fullWidth
                  />
                </>
              ) : (
                <Button
                  label={t('twoFactor.setUp')}
                  icon="shield-checkmark-outline"
                  onPress={() => void startSetup()}
                  loading={busy}
                  fullWidth
                />
              )}
            </Card>
          </Animated.View>
        ) : mode === 'setup' && setup ? (
          <>
            {/* 1 — get the key into the authenticator */}
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card glow style={{ gap: spacing.md }}>
                <StepHeading index={1} title={t('twoFactor.step1Title')} />
                <Text variant="footnote" tone="secondary">
                  {t('twoFactor.step1Body')}
                </Text>

                <Button
                  label={t('twoFactor.openApp')}
                  icon="open-outline"
                  onPress={() => void openAuthenticator()}
                  fullWidth
                />

                <View>
                  <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: 6 }}>
                    {t('twoFactor.keyLabel')}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.md,
                      borderRadius: radius.lg,
                      backgroundColor: c.dark ? alpha(c.bg, 0.7) : c.surfaceAlt,
                      borderWidth: 1,
                      borderColor: c.border,
                    }}
                  >
                    <Text variant="footnote" mono selectable style={{ flex: 1 }}>
                      {groupKey(setup.secret)}
                    </Text>
                    <InputAction label={t('app.copy')} onPress={() => void copyKey()} />
                  </View>
                </View>

                <View style={{ alignItems: 'center', gap: spacing.sm }}>
                  <View
                    accessible
                    accessibilityLabel={t('twoFactor.qrHint')}
                    style={{
                      padding: spacing.sm,
                      borderRadius: radius.md,
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <QRCode
                      value={setup.otpauthUrl}
                      size={168}
                      backgroundColor="#FFFFFF"
                      color="#030714"
                    />
                  </View>
                  <Text variant="caption" tone="tertiary" center>
                    {t('twoFactor.qrHint')}
                  </Text>
                </View>
              </Card>
            </Animated.View>

            {/* 2 — prove it, with the password */}
            <Animated.View entering={FadeInDown.delay(60).duration(260)}>
              <Card style={{ gap: spacing.lg }}>
                <View style={{ gap: spacing.sm }}>
                  <StepHeading index={2} title={t('twoFactor.step2Title')} />
                  <Text variant="footnote" tone="secondary">
                    {t('twoFactor.step2Body')}
                  </Text>
                </View>
                {confirmFields('enable')}
              </Card>
            </Animated.View>
          </>
        ) : mode === 'disable' ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow style={{ gap: spacing.lg }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                {tile}
                <View style={{ flex: 1 }}>
                  <Text variant="title3">{t('twoFactor.disableTitle')}</Text>
                </View>
              </View>
              <Text variant="footnote" tone="secondary">
                {t('twoFactor.disableBody')}
              </Text>
              {confirmFields('disable')}
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function StepHeading({ index, title }: { index: number; title: string }) {
  const { c, alpha } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: 13,
          backgroundColor: alpha(c.primary, 0.15),
          borderWidth: 1,
          borderColor: alpha(c.primary, 0.3),
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text variant="caption" tone="brand" weight="800">
          {String(index)}
        </Text>
      </View>
      <Text variant="headline" style={{ flex: 1 }}>
        {title}
      </Text>
    </View>
  );
}
