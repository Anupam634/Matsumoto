import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { OtpInput } from '../../src/components/common/OtpInput';
import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { forgotPassword, resetPassword } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';

const RESEND_COOLDOWN_S = 45;

/**
 * Change password.
 *
 * The API has no authenticated change-password route, so this runs the same
 * email-a-code flow as recovery — but in place, on the signed-in account, and
 * without signing out: a password change is housekeeping, not an exit.
 */
export default function ChangePasswordScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();
  const { profile } = useSession();

  const email = profile?.email?.trim().toLowerCase() ?? '';

  const [step, setStep] = useState<'intro' | 'otp'>('intro');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // The ticking interval lives in a ref so it can be stopped from anywhere —
  // and is always stopped on unmount, so leaving mid-countdown leaks nothing.
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopCooldown = () => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = null;
  };
  const startCooldown = () => {
    stopCooldown();
    setCooldown(RESEND_COOLDOWN_S);
    cooldownTimer.current = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          stopCooldown();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  };
  useEffect(() => stopCooldown, []);

  const sendCode = async () => {
    if (!email) return;
    setError(null);
    setBusy(true);
    try {
      const res = await forgotPassword(email);
      setInfo(res.message);
      setStep('otp');
      startCooldown();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const resend = () => {
    if (cooldown > 0) return;
    startCooldown();
    void forgotPassword(email)
      .then((r) => setInfo(r.message))
      .catch((err) => setError(errorMessage(err, t('app.offline'))));
  };

  const submit = async () => {
    setError(null);
    if (otp.length < 6) return;
    if (newPassword.length < 8) return setError(t('auth.passwordShort'));

    setBusy(true);
    try {
      await resetPassword({ email, otp, newPassword });
      feedback.success();
      toast.success(t('auth.passwordResetDone'));
      router.back();
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
        backgroundColor: alpha(c.primary, 0.15),
        borderWidth: 1,
        borderColor: alpha(c.primary, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={step === 'intro' ? 'key-outline' : 'mail-open-outline'} size={21} color={c.primary} />
    </View>
  );

  return (
    <Screen>
      <NavBar
        title={t('auth.changePasswordTitle')}
        transparent
        onBack={
          step === 'otp'
            ? () => {
                setStep('intro');
                setOtp('');
                setError(null);
              }
            : undefined
        }
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
        {step === 'intro' ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow style={{ gap: spacing.md }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                {tile}
                <View style={{ flex: 1 }}>
                  <Text variant="overline" tone="tertiary" uppercase>
                    {t('settings.account')}
                  </Text>
                  <Text variant="headline">{t('auth.changePasswordTitle')}</Text>
                </View>
              </View>
              <Text variant="footnote" tone="secondary">
                {t('auth.changePasswordBody', { email: email || '—' })}
              </Text>

              {error ? <ErrorNote message={error} /> : null}

              <Button
                label={t('auth.sendCode')}
                icon="mail-outline"
                onPress={() => void sendCode()}
                loading={busy}
                disabled={!email}
                fullWidth
              />
            </Card>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow style={{ gap: spacing.lg }}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                {tile}
                <View style={{ flex: 1 }}>
                  <Text variant="title3">{t('auth.otpTitle')}</Text>
                  <Text variant="footnote" tone="secondary">
                    {t('auth.otpBody', { email })}
                  </Text>
                </View>
              </View>

              {info ? (
                <View
                  style={{
                    flexDirection: 'row',
                    gap: spacing.sm,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: alpha(c.info, 0.25),
                    backgroundColor: alpha(c.info, 0.08),
                  }}
                >
                  <Ionicons name="mail-open-outline" size={17} color={c.info} />
                  <Text variant="footnote" style={{ color: c.info, flex: 1 }}>
                    {info}
                  </Text>
                </View>
              ) : null}

              <OtpInput
                value={otp}
                onChange={(next) => {
                  setOtp(next);
                  if (error) setError(null);
                }}
              />

              <Input
                label={t('auth.newPassword')}
                icon="lock-closed-outline"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="••••••••"
                hint={t('auth.passwordHint')}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoComplete="new-password"
                textContentType="newPassword"
                returnKeyType="done"
                onSubmitEditing={() => void submit()}
                trailing={
                  <InputAction
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    accessibilityLabel={t('auth.newPassword')}
                    onPress={() => setShowPassword((v) => !v)}
                  />
                }
              />

              {error ? <ErrorNote message={error} /> : null}

              <Button
                label={t('auth.setNewPassword')}
                onPress={() => void submit()}
                loading={busy}
                disabled={otp.length < 6 || newPassword.length < 8}
                fullWidth
                size="lg"
              />

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: cooldown > 0 }}
                disabled={cooldown > 0}
                onPress={resend}
                style={{ alignSelf: 'center', minHeight: 44, justifyContent: 'center' }}
              >
                <Text
                  variant="callout"
                  tone={cooldown > 0 ? 'tertiary' : 'brand'}
                  weight="700"
                  mono={cooldown > 0}
                >
                  {cooldown > 0 ? t('auth.resendIn', { n: cooldown }) : t('auth.resend')}
                </Text>
              </Pressable>
            </Card>
          </Animated.View>
        )}
      </ScrollView>
    </Screen>
  );
}
