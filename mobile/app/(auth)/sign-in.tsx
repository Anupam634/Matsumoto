import React, { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthShell } from '../../src/components/common/AuthShell';
import { OtpInput } from '../../src/components/common/OtpInput';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { login, sendOtp } from '../../src/api/endpoints';
import { ApiError, errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

/**
 * Sign in.
 *
 * The API may answer a password login with "OTP required" (the server decides,
 * based on the device and the account), so this screen carries the same
 * two-step shape as sign-up: credentials, then a code if one is asked for.
 */
export default function SignIn() {
  const { c, spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const { signIn } = useSession();
  const feedback = useFeedback();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
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

  const submit = async (code?: string) => {
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError(t('auth.emailRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.invalidEmail'));
    if (!password) return setError(t('auth.passwordRequired'));

    setBusy(true);
    try {
      await login({ email: cleanEmail, password, otp: code });
      feedback.success();
      await signIn();
      router.replace('/(tabs)');
    } catch (err) {
      // The server asks for a code by rejecting the attempt and saying so.
      const message = errorMessage(err, t('app.offline'));
      const needsOtp =
        err instanceof ApiError && /otp|code|verification/i.test(message);
      if (needsOtp && step === 'form') {
        setStep('otp');
        setInfo(message);
        startResendCooldown();
        void sendOtp(cleanEmail, 'login').catch(() => {});
      } else {
        feedback.error();
        setError(message);
      }
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
              padding: spacing.md,
              borderRadius: 14,
              backgroundColor: c.infoMuted,
            }}
          >
            <Text variant="footnote" style={{ color: c.info }}>
              {info}
            </Text>
          </View>
        ) : null}

        <OtpInput value={otp} onChange={setOtp} onComplete={(code) => void submit(code)} />

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.verifyAndSignIn')}
          onPress={() => void submit(otp)}
          loading={busy}
          disabled={otp.length < 6}
          fullWidth
          size="lg"
        />

        <Pressable
          accessibilityRole="button"
          disabled={cooldown > 0}
          onPress={() => {
            startResendCooldown();
            void sendOtp(email.trim().toLowerCase(), 'login')
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
    <AuthShell
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInBody')}
      onBack={null}
      footer={
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Text variant="footnote" tone="secondary">
            {t('auth.noAccount')}
          </Text>
          <Button
            label={t('auth.createAccount')}
            variant="secondary"
            onPress={() => router.replace('/(auth)/sign-up')}
            fullWidth
          />
        </View>
      }
    >
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
        returnKeyType="next"
      />

      <View>
        <Input
          label={t('auth.password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          trailing={
            <InputAction
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
        />
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.push('/(auth)/forgot')}
          style={{ alignSelf: 'flex-end', marginTop: spacing.sm }}
        >
          <Text variant="footnote" tone="brand" weight="600">
            {t('auth.forgotLink')}
          </Text>
        </Pressable>
      </View>

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={t('auth.signIn')}
        onPress={() => void submit()}
        loading={busy}
        fullWidth
        size="lg"
      />
    </AuthShell>
  );
}
