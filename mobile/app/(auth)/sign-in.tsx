import React, { useRef, useState } from 'react';
import { View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { AuthShell, FieldLabel, TextLink } from '../../src/components/common/AuthShell';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { ErrorNote } from '../../src/components/ui/Chrome';
import { useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { login } from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import { EMAIL_RE } from '../../src/lib/format';

/**
 * Sign in: email and password, nothing else. The server never asks for a
 * code on login, so there is no second step here — the root layout moves a
 * signed-in session out of the auth group on its own.
 */
export default function SignIn() {
  const t = useT();
  const router = useRouter();
  const { signIn } = useSession();
  const feedback = useFeedback();

  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy) return;
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError(t('auth.emailRequired'));
    if (!EMAIL_RE.test(cleanEmail)) return setError(t('auth.invalidEmail'));
    if (!password) return setError(t('auth.passwordRequired'));

    setBusy(true);
    try {
      await login({ email: cleanEmail, password });
      feedback.success();
      await signIn();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

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
    </AuthShell>
  );
}
