import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AuthShell,
  FieldLabel,
  InfoNote,
  TextLink,
} from '../../src/components/common/AuthShell';
import { OtpInput } from '../../src/components/common/OtpInput';
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

const RESEND_COOLDOWN_S = 45;

/** Password recovery: request a code, then set a new password with it. */
export default function Forgot() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();

  const passwordRef = useRef<TextInput>(null);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  // The countdown lives in a ref so it can be cleared on unmount — otherwise
  // a ticking interval keeps setting state on a screen that is gone.
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopCooldown = useCallback(() => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = null;
  }, []);
  const startResendCooldown = useCallback(() => {
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
  }, [stopCooldown]);
  useEffect(() => stopCooldown, [stopCooldown]);

  const cleanEmail = email.trim().toLowerCase();

  const requestCode = async () => {
    if (busy) return;
    setError(null);
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

  const resendCode = async () => {
    if (resending || cooldown > 0) return;
    setError(null);
    setResending(true);
    try {
      const res = await forgotPassword(cleanEmail);
      setInfo(res.message);
      startResendCooldown();
    } catch (err) {
      setCooldown(0);
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setResending(false);
    }
  };

  const submitReset = async () => {
    if (busy) return;
    setError(null);
    if (otp.length < 6 || newPassword.length < 8) {
      return setError(t('auth.passwordShort'));
    }

    setBusy(true);
    try {
      await resetPassword({ email: cleanEmail, otp, newPassword });
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

  const backToForm = () => {
    setStep('form');
    setOtp('');
    setError(null);
  };

  if (step === 'otp') {
    return (
      <AuthShell
        title={t('auth.otpTitle')}
        subtitle={t('auth.otpBody', { email: cleanEmail })}
        onBack={backToForm}
      >
        {info ? <InfoNote message={info} /> : null}

        <View>
          <FieldLabel>{t('auth.otpLabel')}</FieldLabel>
          <OtpInput
            value={otp}
            onChange={setOtp}
            onComplete={() => passwordRef.current?.focus()}
          />
        </View>

        <View>
          <FieldLabel>{t('auth.newPassword')}</FieldLabel>
          <Input
            ref={passwordRef}
            accessibilityLabel={t('auth.newPassword')}
            icon="lock-closed-outline"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="••••••••"
            hint={t('auth.passwordHint')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            maxLength={128}
            returnKeyType="done"
            onSubmitEditing={() => void submitReset()}
            trailing={
              <InputAction
                icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                accessibilityLabel={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
                onPress={() => setShowPassword((v) => !v)}
              />
            }
          />
        </View>

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.setNewPassword')}
          iconRight="arrow-forward"
          onPress={() => void submitReset()}
          loading={busy}
          disabled={otp.length < 6 || newPassword.length < 8}
          fullWidth
          size="lg"
        />

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginHorizontal: -spacing.sm,
          }}
        >
          <TextLink
            label={t('auth.editEmail')}
            icon="arrow-back"
            tone="secondary"
            onPress={backToForm}
          />
          <TextLink
            label={cooldown > 0 ? t('auth.resendIn', { n: cooldown }) : t('auth.resend')}
            disabled={cooldown > 0}
            loading={resending}
            onPress={() => void resendCode()}
          />
        </View>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotBody')}
      footer={
        <TextLink
          label={t('auth.signIn')}
          icon="arrow-back"
          tone="secondary"
          onPress={() => router.back()}
          style={{ alignSelf: 'center' }}
        />
      }
    >
      <View>
        <FieldLabel>{t('auth.email')}</FieldLabel>
        <Input
          accessibilityLabel={t('auth.email')}
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="done"
          onSubmitEditing={() => void requestCode()}
        />
      </View>

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={t('auth.sendCode')}
        iconRight="arrow-forward"
        onPress={() => void requestCode()}
        loading={busy}
        fullWidth
        size="lg"
      />
    </AuthShell>
  );
}
