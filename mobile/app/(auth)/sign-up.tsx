import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { AuthShell } from '../../src/components/common/AuthShell';
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
import { useToast } from '../../src/components/ui/Toast';
import { register, sendOtp } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

/**
 * Sign up.
 *
 * Two steps, matching the server: the form requests an email OTP, then
 * `register` is called with the code. A `?ref=` deep link (bondkoin://sign-up
 * or a shared invite URL) pre-fills the referral code and says so.
 */
export default function SignUp() {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const router = useRouter();
  const params = useLocalSearchParams<{ ref?: string }>();
  const { signIn } = useSession();
  const feedback = useFeedback();
  const toast = useToast();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [referralCode, setReferralCode] = useState(params.ref ?? '');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (params.ref) setReferralCode(params.ref);
  }, [params.ref]);

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

  const createAccount = async (code: string) => {
    setError(null);
    setBusy(true);
    try {
      const res = await register({
        email: email.trim().toLowerCase(),
        password,
        countryCode,
        referralCode: referralCode.trim() || undefined,
        otp: code,
      });
      feedback.success();
      // The referral is silently dropped when the inviter shares this device
      // or network — say so rather than letting the miner wonder.
      if (res.referralRejected) toast.show(t('auth.referralRejectedTitle'));
      await signIn();
      router.replace('/(tabs)');
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

        <OtpInput
          value={otp}
          onChange={setOtp}
          onComplete={(code) => void createAccount(code)}
        />

        {error ? <ErrorNote message={error} /> : null}

        <Button
          label={t('auth.verifyAndCreate')}
          onPress={() => void createAccount(otp)}
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
            void sendOtp(email.trim().toLowerCase(), 'signup')
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
      title={t('auth.signUpTitle')}
      subtitle={t('auth.signUpBody')}
      onBack={null}
      footer={
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <Text variant="caption" tone="tertiary" center>
            {t('auth.terms')}
          </Text>
          <Button
            label={t('auth.haveAccount')}
            variant="secondary"
            onPress={() => router.replace('/(auth)/sign-in')}
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
      />

      <Input
        label={t('auth.password')}
        icon="lock-closed-outline"
        value={password}
        onChangeText={setPassword}
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

      <CountryPicker
        value={countryCode}
        onChange={setCountryCode}
        label={t('auth.country')}
        placeholder={t('auth.countryPlaceholder')}
      />

      <View>
        <Input
          label={t('auth.referralCode')}
          icon="ticket-outline"
          value={referralCode}
          onChangeText={setReferralCode}
          placeholder="BK-XXXXXX"
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {params.ref ? (
          <Badge
            label={t('auth.referralApplied', { code: params.ref })}
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
