import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, View, type TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import {
  AuthShell,
  FieldLabel,
  InfoNote,
  TextLink,
} from '../../src/components/common/AuthShell';
import { OtpInput } from '../../src/components/common/OtpInput';
import { CountryPicker } from '../../src/components/common/CountryPicker';
import { Text } from '../../src/components/ui/Text';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote } from '../../src/components/ui/Chrome';
import { Badge } from '../../src/components/ui/Badge';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { register, sendOtp } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

const RESEND_COOLDOWN_S = 45;

/**
 * Sign up.
 *
 * Two steps, matching the server: the form requests an email OTP, then
 * `register` is called with the code. A `?ref=` deep link (bondkoin://sign-up
 * or a shared invite URL) pre-fills the referral code and says so.
 */
export default function SignUp() {
  const { spacing } = useTheme();
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const { signIn } = useSession();
  const feedback = useFeedback();

  const passwordRef = useRef<TextInput>(null);
  const referralRef = useRef<TextInput>(null);

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [referralCode, setReferralCode] = useState(params.ref ?? '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (params.ref) setReferralCode(params.ref);
  }, [params.ref]);

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

  // The invite badge only holds while the field still says what the link said.
  const linkRef = params.ref?.trim().toUpperCase() ?? '';
  const referralFromLink =
    !!linkRef && referralCode.trim().toUpperCase() === linkRef;

  const requestCode = async () => {
    if (busy) return;
    setError(null);

    if (!cleanEmail) return setError(t('auth.emailRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.invalidEmail'));
    if (password.length < 8) return setError(t('auth.passwordShort'));
    if (!countryCode) return setError(t('auth.countryRequired'));

    setBusy(true);
    try {
      const res = await sendOtp(cleanEmail, 'signup');
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
      const res = await sendOtp(cleanEmail, 'signup');
      setInfo(res.message);
      startResendCooldown();
    } catch (err) {
      setCooldown(0);
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setResending(false);
    }
  };

  const createAccount = async (code: string) => {
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const res = await register({
        email: cleanEmail,
        password,
        countryCode,
        referralCode: referralCode.trim() || undefined,
        otp: code,
      });
      feedback.success();
      // The referral is silently dropped when the inviter shares this device
      // or network — say so in a way that outlives the screen change.
      if (res.referralRejected) {
        Alert.alert(t('auth.referralRejectedTitle'), t('auth.referralRejected'));
      }
      await signIn();
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
            onComplete={(code) => void createAccount(code)}
          />
        </View>

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.verifyAndCreate')}
          iconRight="arrow-forward"
          onPress={() => void createAccount(otp)}
          loading={busy}
          disabled={otp.length < 6}
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
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpBody')}
      onBack={null}
      mode="signup"
      footer={
        <Text variant="caption" tone="tertiary" center style={{ paddingHorizontal: spacing.md }}>
          {t('auth.terms')}{' '}
          <Text
            variant="caption"
            tone="gold"
            weight="700"
            accessibilityRole="link"
            onPress={() => router.push('/legal/terms')}
          >
            {t('auth.viewTerms')}
          </Text>
          {' · '}
          <Text
            variant="caption"
            tone="gold"
            weight="700"
            accessibilityRole="link"
            onPress={() => router.push('/legal/privacy')}
          >
            {t('auth.viewPrivacy')}
          </Text>
        </Text>
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
          hint={t('auth.passwordHint')}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          maxLength={128}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => referralRef.current?.focus()}
          trailing={
            <InputAction
              icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
              accessibilityLabel={t(showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
              onPress={() => setShowPassword((v) => !v)}
            />
          }
        />
      </View>

      <CountryPicker
        value={countryCode}
        onChange={setCountryCode}
        label={t('auth.country')}
        placeholder={t('auth.countryPlaceholder')}
        labelVariant="overline"
      />

      <View>
        <FieldLabel optional>{t('auth.referralCode')}</FieldLabel>
        <Input
          ref={referralRef}
          accessibilityLabel={t('auth.referralCode')}
          icon="ticket-outline"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder="BK-XXXXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={64}
          returnKeyType="done"
          onSubmitEditing={() => void requestCode()}
        />
        {referralFromLink ? (
          <Badge
            label={t('auth.referralApplied', { code: linkRef })}
            tone="success"
            icon="checkmark-circle"
            style={{ marginTop: spacing.sm }}
          />
        ) : null}
      </View>

      {error ? <ErrorNote message={error} /> : null}

      <Button
        label={t('auth.continueLabel')}
        onPress={() => void requestCode()}
        loading={busy}
        fullWidth
        size="lg"
        iconRight="arrow-forward"
      />
    </AuthShell>
  );
}
