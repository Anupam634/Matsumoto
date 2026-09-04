import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthShell } from '../../src/components/common/AuthShell';
import { OtpInput } from '../../src/components/common/OtpInput';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { forgotPassword, resetPassword } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

/** Password recovery: request a code, then set a new password with it. */
export default function Forgot() {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const startResendCooldown = useCallback(() => {
    setCooldown(45);
    const id = setInterval(() => {
      setCooldown((n) => {
        if (n <= 1) {
          clearInterval(id);
          return 0;
        }
        return n - 1;
      });
    }, 1000);
  }, []);

  const requestCode = async () => {
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError(t('auth.emailRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.invalidEmail'));

    setBusy(true);
    try {
      const res = await forgotPassword(cleanEmail);
      setInfo(res.message);
      setStep('otp');
      startResendCooldown();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async () => {
    setError(null);
    if (newPassword.length < 8) return setError(t('auth.passwordShort'));

    setBusy(true);
    try {
      await resetPassword({
        email: email.trim().toLowerCase(),
        otp,
        newPassword,
      });
      feedback.success();
      toast.success(t('auth.passwordResetDone'));
      router.replace('/(auth)/sign-in');
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  if (step === 'otp') {
    return (
      <AuthShell
        title={t('auth.otpTitle')}
        subtitle={t('auth.otpBody', { email: email.trim().toLowerCase() })}
        onBack={() => {
          setStep('form');
          setOtp('');
          setError(null);
        }}
      >
        {info ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.infoMuted,
            }}
          >
            <Ionicons name="mail-open-outline" size={17} color={c.info} />
            <Text variant="footnote" style={{ color: c.info, flex: 1 }}>
              {info}
            </Text>
          </View>
        ) : null}

        <OtpInput value={otp} onChange={setOtp} />

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
          trailing={
            <InputAction
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
        />

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.setNewPassword')}
          onPress={() => void submitReset()}
          loading={busy}
          disabled={otp.length < 6 || newPassword.length < 8}
          fullWidth
          size="lg"
        />

        <Pressable
          accessibilityRole="button"
          disabled={cooldown > 0}
          onPress={() => {
            startResendCooldown();
            void forgotPassword(email.trim().toLowerCase())
              .then((r) => setInfo(r.message))
              .catch((err) => setError(errorMessage(err, t('app.offline'))));
          }}
          style={{ alignSelf: 'center' }}
        >
          <Text
            variant="callout"
            tone={cooldown > 0 ? 'tertiary' : 'brand'}
            weight="600"
          >
            {cooldown > 0 ? t('auth.resendIn', { n: cooldown }) : t('auth.resend')}
          </Text>
        </Pressable>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.forgotTitle')} subtitle={t('auth.forgotBody')}>
      <Input
        label={t('auth.email')}
        icon="mail-outline"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
      />

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={t('auth.continueLabel')}
        onPress={() => void requestCode()}
        loading={busy}
        fullWidth
        size="lg"
      />
    </AuthShell>
  );
}
