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
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { login, sendOtp } from '../../src/api/endpoints';
import { useCaptcha } from '../../src/components/common/Captcha';
import { errorCode, errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

const RESEND_COOLDOWN_S = 45;

/** Which second factor the server asked for after the password checked out. */
type Step = 'form' | 'email' | 'authenticator';

/**
 * Sign in: email and password, then a second factor — the server asks for
 * it on every platform. An account with an authenticator app on is asked for
 * that app's code (`TOTP_REQUIRED`); any other is emailed a code
 * (`OTP_REQUIRED`). Either way the second call repeats the password with the
 * code, and the root layout moves the signed-in session out of the auth group
 * on its own.
 */
export default function SignIn() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const { signIn } = useSession();
  const feedback = useFeedback();

  const passwordRef = useRef<TextInput>(null);

  const captcha = useCaptcha();
  const [step, setStep] = useState<Step>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState('');
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

  const submit = async () => {
    if (busy) return;
    setError(null);

    if (!cleanEmail) return setError(t('auth.emailRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.invalidEmail'));
    if (!password) return setError(t('auth.passwordRequired'));

    setBusy(true);
    try {
      await login({
        email: cleanEmail,
        password,
        captchaToken: await captcha.solve('login'),
      });
      feedback.success();
      await signIn();
    } catch (err) {
      // Not failures: the password was right and the server wants the code.
      const tag = errorCode(err);
      if (tag === 'OTP_REQUIRED') {
        setCode('');
        setInfo(errorMessage(err, t('app.offline')));
        setStep('email');
        startResendCooldown();
      } else if (tag === 'TOTP_REQUIRED') {
        setCode('');
        setInfo(null);
        setStep('authenticator');
      } else {
        feedback.error();
        setError(errorMessage(err, t('app.offline')));
      }
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    if (busy || value.length < 6) return;
    setError(null);
    setBusy(true);
    try {
      await login({
        email: cleanEmail,
        password,
        ...(step === 'authenticator' ? { totp: value } : { otp: value }),
      });
      feedback.success();
      await signIn();
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
      const res = await sendOtp(cleanEmail, 'login', await captcha.solve('login'));
      setInfo(res.message);
      startResendCooldown();
    } catch (err) {
      setCooldown(0);
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setResending(false);
    }
  };

  const backToForm = () => {
    stopCooldown();
    setCooldown(0);
    setStep('form');
    setCode('');
    setInfo(null);
    setError(null);
  };

  if (step !== 'form') {
    const byApp = step === 'authenticator';
    return (
      <AuthShell
        title={byApp ? t('twoFactor.signInTitle') : t('auth.otpTitle')}
        subtitle={byApp ? t('twoFactor.signInBody') : t('auth.otpBody', { email: cleanEmail })}
        onBack={backToForm}
      >
        {info ? <InfoNote message={info} /> : null}

        <View>
          <FieldLabel>{byApp ? t('twoFactor.codeLabel') : t('auth.otpLabel')}</FieldLabel>
          <OtpInput
            value={code}
            onChange={(next) => {
              setCode(next);
              if (error) setError(null);
            }}
            onComplete={(value) => void verify(value)}
          />
        </View>

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.verifyAndSignIn')}
          iconRight="arrow-forward"
          onPress={() => void verify(code)}
          loading={busy}
          disabled={code.length < 6}
          fullWidth
          size="lg"
        />

        {byApp ? (
          <Text variant="caption" tone="tertiary" center>
            {t('twoFactor.lostDevice')}
          </Text>
        ) : null}

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: byApp ? 'center' : 'space-between',
            marginHorizontal: -spacing.sm,
          }}
        >
          <TextLink
            label={t('app.back')}
            icon="arrow-back"
            tone="secondary"
            onPress={backToForm}
          />
          {byApp ? null : (
            <TextLink
              label={cooldown > 0 ? t('auth.resendIn', { n: cooldown }) : t('auth.resend')}
              disabled={cooldown > 0}
              loading={resending}
              onPress={() => void resendCode()}
            />
          )}
        </View>
        {captcha.sheet}
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInBody')}
      onBack={null}
      mode="signin"
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
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
      </View>

      <View>
        <FieldLabel>{t('auth.password')}</FieldLabel>
        <Input
          ref={passwordRef}
          accessibilityLabel={t('auth.password')}
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          maxLength={128}
          returnKeyType="done"
          onSubmitEditing={() => void submit()}
          trailing={
            <InputAction
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              accessibilityLabel={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
        />
        <TextLink
          label={t('auth.forgotLink')}
          onPress={() => router.push('/(auth)/forgot')}
          style={{ alignSelf: 'flex-end', marginTop: 2, marginRight: -8, marginBottom: -8 }}
        />
      </View>

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={t('auth.signIn')}
        iconRight="arrow-forward"
        onPress={() => void submit()}
        loading={busy}
        fullWidth
        size="lg"
      />
      {captcha.sheet}
    </AuthShell>
  );
}
