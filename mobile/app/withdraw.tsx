import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { InfoNote, TextLink } from '../src/components/common/AuthShell';
import { OtpInput } from '../src/components/common/OtpInput';
import { useCaptcha } from '../src/components/common/Captcha';
import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Badge, StatRow } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Input, InputAction } from '../src/components/ui/Input';
import { Sheet } from '../src/components/ui/Sheet';
import { PulseDot } from '../src/components/ui/Pulse';
import { ErrorNote, NavBar, Screen, Skeleton } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useSession } from '../src/store/session';
import { useToast } from '../src/components/ui/Toast';
import { useFeedback } from '../src/lib/feedback';
import { useAsyncData } from '../src/lib/hooks';
import {
  getWithdrawals,
  POINTS_PER_TOKEN,
  requestWithdrawal,
  sendWithdrawalOtp,
  WITHDRAWAL_COOLDOWN_DAYS,
  WITHDRAWAL_MIN_POINTS,
  type WithdrawalDto,
  type WithdrawalStatus,
} from '../src/api/endpoints';
import { errorCode, errorMessage } from '../src/api/client';
import {
  ADDRESS_RE,
  formatDate,
  formatDateTime,
  formatPoints,
  shortAddress,
} from '../src/lib/format';

const RESEND_COOLDOWN_S = 45;

/** The second factor the server asked for; null while the sheet shows the review. */
type CodeStep = 'email' | 'authenticator' | null;

/**
 * Withdrawals.
 *
 * Points convert at 3:1 into $BONDKOIN and are paid on BNB Chain after an
 * operator reviews the request. Every gate the server enforces — verification,
 * the 100-point floor, one request a week — is stated before the form, so a
 * blocked miner learns why here rather than from a rejected submit.
 *
 * A request also needs a second factor. The review sheet's confirm sends it
 * without one and the server says which it wants: the code we email
 * (`OTP_REQUIRED`), the authenticator app's (`TOTP_REQUIRED` — asked for up
 * front when the profile says 2FA is on), or 2FA to be set up first
 * (`TOTP_SETUP_REQUIRED`). The sheet then turns into the code step.
 */
export default function WithdrawScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const toast = useToast();
  const feedback = useFeedback();
  const { profile, refresh } = useSession();

  const load = useCallback(() => getWithdrawals(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: history, error, loading, refreshing, reload } = useAsyncData<
    WithdrawalDto[]
  >(load, toMessage);

  const [points, setPoints] = useState('');
  const [address, setAddress] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const captcha = useCaptcha();
  const [codeStep, setCodeStep] = useState<CodeStep>(null);
  const [code, setCode] = useState('');
  const [codeInfo, setCodeInfo] = useState<string | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // Set when the server refuses because withdrawals need 2FA turned on first.
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);

  // The resend countdown lives in a ref so leaving mid-countdown leaks nothing.
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopCooldown = useCallback(() => {
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = null;
  }, []);
  const startCooldown = useCallback(() => {
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

  const balance = profile?.pointsBalance ?? 0;

  // The cooldown gate is read off the history, so until that has loaded the
  // form can't know whether a request is allowed — treat it as blocked rather
  // than let a submit through that the server will refuse.
  const historyReady = !loading && history !== null;

  // The server allows one request per rolling week; work out when it frees up
  // so the form can say so instead of failing on submit.
  const cooldownUntil = useMemo(() => {
    const last = history?.[0];
    if (!last) return null;
    const free =
      new Date(last.requestedAt).getTime() +
      WITHDRAWAL_COOLDOWN_DAYS * 86_400_000;
    return free > Date.now() ? new Date(free) : null;
  }, [history]);

  const kycOk = profile?.kycStatus === 'APPROVED';
  const enoughBalance = balance >= WITHDRAWAL_MIN_POINTS;
  const blocked = !historyReady || !kycOk || !enoughBalance || cooldownUntil !== null;

  // Some keyboards type a decimal comma; the server wants a number either way.
  const amount = Number(points.trim().replace(',', '.'));
  const amountValid =
    Number.isFinite(amount) && amount >= WITHDRAWAL_MIN_POINTS && amount <= balance;
  const amountError = !points.trim()
    ? null
    : !Number.isFinite(amount) || amount < WITHDRAWAL_MIN_POINTS
      ? t('withdrawScreen.belowMin', { min: WITHDRAWAL_MIN_POINTS })
      : amount > balance
        ? t('withdrawScreen.insufficient')
        : null;
  const addressValid = ADDRESS_RE.test(address.trim());
  const addressError =
    address.trim() && !addressValid ? t('boosters.fromInvalid') : null;

  const twoFactorOn = !!profile?.twoFactorEnabled;

  /** Email a confirmation code to the account's own address, then ask for it. */
  const requestEmailCode = async () => {
    if (sending || cooldown > 0) return;
    setSheetError(null);
    setSending(true);
    try {
      const res = await sendWithdrawalOtp(await captcha.solve('withdrawal'));
      setCode('');
      setCodeInfo(res.message);
      setCodeStep('email');
      startCooldown();
    } catch (err) {
      feedback.error();
      setSheetError(errorMessage(err, t('app.offline')));
    } finally {
      setSending(false);
    }
  };

  const submit = async (codes: { otp?: string; totp?: string } = {}) => {
    if (busy) return;
    setBusy(true);
    setFormError(null);
    setSheetError(null);
    try {
      await requestWithdrawal(amount, address.trim(), codes);
      feedback.success();
      toast.success(t('withdraw.submitted'));
      setPoints('');
      setAddress('');
      setConfirming(false);
      setNeedsTwoFactor(false);
      await Promise.all([reload({ silent: true }), refresh()]);
    } catch (err) {
      const tag = errorCode(err);
      if (tag === 'OTP_REQUIRED') {
        // A code mailed moments ago is still good — ask for it rather than
        // spending another send.
        if (cooldown > 0) setCodeStep('email');
        else await requestEmailCode();
      } else if (tag === 'TOTP_REQUIRED') {
        setCode('');
        setCodeInfo(null);
        setCodeStep('authenticator');
      } else if (tag === 'TOTP_SETUP_REQUIRED') {
        feedback.error();
        setNeedsTwoFactor(true);
        setConfirming(false);
      } else if (codeStep) {
        // A wrong or expired code: stay on the code step so it can be retyped.
        feedback.error();
        setSheetError(errorMessage(err, t('app.offline')));
      } else {
        feedback.error();
        setFormError(errorMessage(err, t('app.offline')));
        setConfirming(false);
      }
    } finally {
      setBusy(false);
    }
  };

  /** The review sheet's confirm: straight to the app's code when 2FA is on. */
  const confirmReview = () => {
    if (twoFactorOn) {
      setSheetError(null);
      setCode('');
      setCodeInfo(null);
      setCodeStep('authenticator');
      return;
    }
    void submit();
  };

  const confirmWithCode = (value: string) => {
    if (value.length < 6) return;
    void submit(codeStep === 'authenticator' ? { totp: value } : { otp: value });
  };

  const backToReview = () => {
    setCodeStep(null);
    setCode('');
    setSheetError(null);
  };

  return (
    <Screen>
      <NavBar title={t('withdraw.title')} subtitle={t('withdraw.subtitle')} transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void reload()}
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* ── Available — the web's panel header with the chain indicator ── */}
        <Animated.View entering={FadeInDown.duration(260)}>
          <Card glow>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <Text variant="overline" tone="tertiary" uppercase>
                {t('withdraw.available')}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                  borderWidth: 1,
                  borderColor: alpha(c.gold, 0.35),
                  backgroundColor: alpha(c.gold, 0.1),
                }}
              >
                <PulseDot color={c.success} size={6} />
                <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                  BEP-20 · {t('profile.chainName')}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: spacing.sm }}>
              <Text variant="display" mono tone="gold">
                {formatPoints(balance, 2, locale)}
              </Text>
              <Text variant="callout" tone="brand" weight="800">
                {t('withdraw.pointsShort')}
              </Text>
            </View>
            <Text variant="footnote" tone="secondary" style={{ marginTop: 2 }}>
              ≈{' '}
              <Text variant="footnote" mono tone="info" weight="700">
                {formatPoints(balance / POINTS_PER_TOKEN, 4, locale)}
              </Text>{' '}
              $BONDKOIN · {t('withdraw.paidOnChain')}
            </Text>
          </Card>
        </Animated.View>

        {/* The gates depend on history; say so if it couldn't be fetched. */}
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        {/* ── Gates ── */}
        {!kycOk ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('withdraw.kycRequired')} ${t('withdraw.verifyCta')}`}
            hitSlop={12}
            onPress={() => router.push('/kyc')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              minHeight: 48,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: alpha(c.gold, 0.25),
              backgroundColor: alpha(c.gold, 0.1),
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="shield-outline" size={18} color={c.gold} />
            <Text variant="footnote" style={{ color: c.gold, flex: 1 }}>
              {t('withdraw.kycRequired')}
            </Text>
            <Text variant="footnote" weight="700" style={{ color: c.gold }}>
              {t('withdraw.verifyCta')} →
            </Text>
          </Pressable>
        ) : !enoughBalance ? (
          <NoticeRow
            icon="information-circle-outline"
            text={t('withdraw.needMore', { min: WITHDRAWAL_MIN_POINTS })}
          />
        ) : cooldownUntil ? (
          <NoticeRow
            icon="time-outline"
            text={t('withdraw.cooldown', {
              date: formatDate(cooldownUntil.toISOString(), locale),
            })}
          />
        ) : null}

        {needsTwoFactor && !twoFactorOn ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t('twoFactor.setupRequired')} ${t('twoFactor.setupCta')}`}
            hitSlop={12}
            onPress={() => router.push('/settings/two-factor')}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              minHeight: 48,
              borderRadius: radius.lg,
              borderWidth: 1,
              borderColor: alpha(c.gold, 0.25),
              backgroundColor: alpha(c.gold, 0.1),
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Ionicons name="shield-checkmark-outline" size={18} color={c.gold} />
            <Text variant="footnote" style={{ color: c.gold, flex: 1 }}>
              {t('twoFactor.setupRequired')}
            </Text>
            <Text variant="footnote" weight="700" style={{ color: c.gold }}>
              {t('twoFactor.setupCta')} →
            </Text>
          </Pressable>
        ) : null}

        {/* ── Form ── */}
        {loading ? (
          <Skeleton height={300} radius={radius.xl} />
        ) : (
          <Animated.View entering={FadeInDown.delay(40).duration(260)}>
            <Card>
              <Input
                label={`${t('withdraw.amount')} (${t('withdraw.pointsShort')})`}
                icon="cash-outline"
                value={points}
                onChangeText={setPoints}
                editable={!blocked}
                keyboardType="decimal-pad"
                placeholder={String(WITHDRAWAL_MIN_POINTS)}
                hint={amountError ? undefined : t('withdraw.minNote', { min: WITHDRAWAL_MIN_POINTS })}
                error={amountError}
                mono
                trailing={
                  // Amber, like the web's "Use max" link.
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('withdraw.useMax')}
                    accessibilityState={{ disabled: blocked }}
                    disabled={blocked}
                    hitSlop={10}
                    onPress={() => setPoints(String(Math.floor(balance * 100) / 100))}
                    style={({ pressed }) => ({
                      opacity: blocked ? 0.4 : pressed ? 0.6 : 1,
                      minHeight: 32,
                      paddingHorizontal: 10,
                      justifyContent: 'center',
                      borderRadius: radius.sm,
                      backgroundColor: alpha(c.gold, 0.15),
                    })}
                  >
                    <Text variant="caption" tone="gold" weight="700">
                      {t('withdraw.useMax')}
                    </Text>
                  </Pressable>
                }
              />

              <Input
                label={t('withdraw.toAddress')}
                icon="wallet-outline"
                value={address}
                onChangeText={setAddress}
                editable={!blocked}
                placeholder="0x…"
                autoCapitalize="none"
                autoCorrect={false}
                mono
                containerStyle={{ marginTop: spacing.lg }}
                hint={addressError ? undefined : t('withdraw.addressNote')}
                error={addressError}
                trailing={
                  <InputAction
                    label={t('withdrawScreen.pasteAddress')}
                    disabled={blocked}
                    onPress={async () => {
                      const text = await Clipboard.getStringAsync();
                      if (text) setAddress(text.trim());
                    }}
                  />
                }
              />

              {amountValid ? (
                <View
                  style={{
                    marginTop: spacing.lg,
                    padding: spacing.md,
                    borderRadius: radius.lg,
                    borderWidth: 1,
                    borderColor: alpha(c.primary, 0.25),
                    backgroundColor: alpha(c.primary, 0.1),
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: spacing.sm,
                    }}
                  >
                    <Text variant="footnote" tone="secondary">
                      {t('withdraw.youReceive')}
                    </Text>
                    <Text variant="headline" mono tone="info" numberOfLines={1}>
                      {formatPoints(amount / POINTS_PER_TOKEN, 4, locale)}{' '}
                      <Text variant="caption" tone="tertiary" weight="700">
                        $BONDKOIN
                      </Text>
                    </Text>
                  </View>
                  <Text variant="caption" tone="tertiary" style={{ marginTop: 4 }}>
                    {t('withdraw.conversionNote')}
                  </Text>
                </View>
              ) : null}

              {formError ? (
                <View style={{ marginTop: spacing.md }}>
                  <ErrorNote message={formError} />
                </View>
              ) : null}

              <Button
                label={t('withdraw.submit')}
                icon="arrow-up-circle-outline"
                onPress={() => setConfirming(true)}
                disabled={blocked || !amountValid || !addressValid}
                fullWidth
                size="lg"
                style={{ marginTop: spacing.lg }}
              />

              <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
                {t('withdraw.reviewNote')}
              </Text>
            </Card>
          </Animated.View>
        )}

        {/* ── The rules, stated plainly ── */}
        <Animated.View entering={FadeInDown.delay(80).duration(260)}>
          <Card>
            <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: spacing.sm }}>
              {t('withdrawScreen.rulesTitle')}
            </Text>
            {[
              t('withdrawScreen.rule1', { min: WITHDRAWAL_MIN_POINTS }),
              t('withdrawScreen.rule2', { days: WITHDRAWAL_COOLDOWN_DAYS }),
              t('withdrawScreen.rule3'),
              t('withdrawScreen.rule4'),
            ].map((rule, i, all) => (
              <View
                key={rule}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  paddingVertical: 9,
                  borderBottomWidth: i === all.length - 1 ? 0 : 1,
                  borderBottomColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 12,
                    backgroundColor: alpha(c.success, 0.15),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="checkmark" size={14} color={c.success} />
                </View>
                <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {rule}
                </Text>
              </View>
            ))}
          </Card>
        </Animated.View>

        {/* ── History ── */}
        {loading ? (
          <Skeleton height={120} radius={radius.xl} />
        ) : history && history.length > 0 ? (
          <Animated.View entering={FadeInDown.delay(120).duration(260)}>
            <Card>
              <Text variant="overline" tone="tertiary" uppercase>
                {t('withdraw.historyTitle')}
              </Text>
              <View style={{ marginTop: spacing.xs }}>
                {history.map((row, i) => (
                  <Animated.View
                    key={row.id}
                    entering={FadeInDown.delay(140 + Math.min(i, 8) * 40).duration(240)}
                  >
                    <WithdrawalRow row={row} last={i === history.length - 1} />
                  </Animated.View>
                ))}
              </View>
            </Card>
          </Animated.View>
        ) : null}
      </ScrollView>

      {/* Final confirmation — the address is the one thing that cannot be undone —
          then the second factor the server asks for. */}
      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        onDismiss={() => {
          setCodeStep(null);
          setCode('');
          setCodeInfo(null);
          setSheetError(null);
        }}
        title={codeStep ? t('withdrawScreen.codeTitle') : t('withdrawScreen.reviewTitle')}
        subtitle={
          codeStep === 'authenticator'
            ? t('twoFactor.signInBody')
            : codeStep === 'email'
              ? t('auth.otpBody', { email: profile?.email ?? '' })
              : t('withdrawScreen.reviewBody')
        }
        scrollable={false}
      >
        {codeStep ? (
          <>
            {codeInfo ? <InfoNote message={codeInfo} /> : null}

            <Card elevation={0}>
              <StatRow
                label={t('withdraw.amount')}
                value={`${formatPoints(amount || 0, 2, locale)} ${t('withdraw.pointsShort')}`}
                mono
                tone="gold"
                strong
              />
              <StatRow
                label={t('withdrawScreen.sending')}
                value={shortAddress(address.trim(), 10, 8)}
                mono
              />
            </Card>

            <OtpInput
              value={code}
              onChange={(next) => {
                setCode(next);
                if (sheetError) setSheetError(null);
              }}
              onComplete={confirmWithCode}
            />

            {sheetError ? <ErrorNote message={sheetError} /> : null}

            <Button
              label={t('withdrawScreen.confirmCta')}
              onPress={() => confirmWithCode(code)}
              loading={busy}
              disabled={code.length < 6}
              fullWidth
              size="lg"
            />

            {codeStep === 'authenticator' ? (
              <Text variant="caption" tone="tertiary" center>
                {t('twoFactor.lostDevice')}
              </Text>
            ) : null}

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: codeStep === 'email' ? 'space-between' : 'center',
                marginHorizontal: -spacing.sm,
              }}
            >
              <TextLink
                label={t('app.back')}
                icon="arrow-back"
                tone="secondary"
                onPress={backToReview}
              />
              {codeStep === 'email' ? (
                <TextLink
                  label={cooldown > 0 ? t('auth.resendIn', { n: cooldown }) : t('auth.resend')}
                  disabled={cooldown > 0}
                  loading={sending}
                  onPress={() => void requestEmailCode()}
                />
              ) : null}
            </View>
          </>
        ) : (
          <>
            <Card elevation={0}>
              <StatRow
                label={t('withdraw.amount')}
                value={`${formatPoints(amount || 0, 2, locale)} ${t('withdraw.pointsShort')}`}
                mono
                tone="gold"
                strong
              />
              <StatRow
                label={t('withdraw.youReceive')}
                value={`${formatPoints((amount || 0) / POINTS_PER_TOKEN, 4, locale)} $BONDKOIN`}
                mono
                tone="brand"
              />
            </Card>

            <View>
              <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: 6 }}>
                {t('withdrawScreen.sending')}
              </Text>
              <View
                style={{
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: c.dark ? alpha(c.bg, 0.7) : c.surfaceAlt,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <Text variant="footnote" mono selectable>
                  {address.trim()}
                </Text>
              </View>
            </View>

            {sheetError ? <ErrorNote message={sheetError} /> : null}

            <Button
              label={t('withdrawScreen.confirmCta')}
              onPress={confirmReview}
              loading={busy || sending}
              fullWidth
              size="lg"
            />
            <Button
              label={t('app.cancel')}
              variant="ghost"
              onPress={() => setConfirming(false)}
              fullWidth
            />
          </>
        )}
        {/* Inside the sheet so it can present over it — iOS shows one modal
            at a time unless the second is nested in the first. */}
        {captcha.sheet}
      </Sheet>
    </Screen>
  );
}

function NoticeRow({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { c, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: c.border,
        backgroundColor: c.dark ? 'rgba(255,255,255,0.03)' : c.surfaceAlt,
      }}
    >
      <Ionicons name={icon} size={17} color={c.textSecondary} />
      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

/** The web's chips: PENDING amber, APPROVED sky, PAID emerald, REJECTED red. */
const STATUS_TONE: Record<WithdrawalStatus, 'success' | 'info' | 'gold' | 'danger'> = {
  PAID: 'success',
  APPROVED: 'info',
  PENDING: 'gold',
  REJECTED: 'danger',
};

function WithdrawalRow({ row, last }: { row: WithdrawalDto; last?: boolean }) {
  const { c, spacing } = useTheme();
  const t = useT();
  const { locale } = useI18n();

  return (
    <View
      style={{
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        gap: 3,
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="headline" mono>
            {formatPoints(row.points, 2, locale)}{' '}
            <Text variant="caption" tone="tertiary" weight="700">
              {t('withdraw.pointsShort')}
            </Text>
          </Text>
          <Text variant="caption" tone="secondary">
            →{' '}
            <Text variant="caption" mono tone="info" weight="700">
              {formatPoints(Number(row.tokenAmount), 4, locale)}
            </Text>{' '}
            $BONDKOIN
          </Text>
        </View>
        <Badge label={t(`withdraw.status.${row.status}`)} tone={STATUS_TONE[row.status]} dot />
      </View>

      <Text variant="caption" tone="tertiary" mono style={{ marginTop: 4 }}>
        {shortAddress(row.toAddress, 10, 8)}
      </Text>
      <Text variant="caption" tone="tertiary">
        {formatDateTime(row.requestedAt, locale)}
      </Text>

      {row.status === 'REJECTED' && row.adminNote ? (
        <Text variant="caption" tone="danger" style={{ marginTop: 4 }}>
          {t('withdraw.rejectedReason')}: {row.adminNote}
        </Text>
      ) : null}
    </View>
  );
}
