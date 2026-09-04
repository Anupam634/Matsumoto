import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../src/components/ui/Text';
import { Card, SectionLabel } from '../src/components/ui/Card';
import { Badge, StatRow } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Input, InputAction } from '../src/components/ui/Input';
import { Sheet } from '../src/components/ui/Sheet';
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
  WITHDRAWAL_COOLDOWN_DAYS,
  WITHDRAWAL_MIN_POINTS,
  type WithdrawalDto,
  type WithdrawalStatus,
} from '../src/api/endpoints';
import { errorMessage } from '../src/api/client';
import {
  ADDRESS_RE,
  formatDate,
  formatDateTime,
  formatPoints,
  shortAddress,
} from '../src/lib/format';

/**
 * Withdrawals.
 *
 * Points convert at 3:1 into $BONDKOIN and are paid on BNB Chain after an
 * operator reviews the request. Every gate the server enforces — verification,
 * the 100-point floor, one request a week — is stated before the form, so a
 * blocked miner learns why here rather than from a rejected submit.
 */
export default function WithdrawScreen() {
  const { c, spacing, radius } = useTheme();
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

  const balance = profile?.pointsBalance ?? 0;

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
  const blocked = !kycOk || !enoughBalance || cooldownUntil !== null;

  const amount = Number(points);
  const amountValid =
    Number.isFinite(amount) && amount >= WITHDRAWAL_MIN_POINTS && amount <= balance;
  const addressValid = ADDRESS_RE.test(address.trim());

  const submit = async () => {
    setBusy(true);
    setFormError(null);
    try {
      await requestWithdrawal(amount, address.trim());
      feedback.success();
      toast.success(t('withdraw.submitted'));
      setPoints('');
      setAddress('');
      setConfirming(false);
      await Promise.all([reload({ silent: true }), refresh()]);
    } catch (err) {
      feedback.error();
      setFormError(errorMessage(err, t('app.offline')));
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen sunken>
      <NavBar title={t('withdraw.title')} subtitle={t('withdraw.subtitle')} />

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
        {/* Available */}
        <Card>
          <Text variant="overline" tone="tertiary" uppercase>
            {t('withdraw.available')}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginTop: 4,
            }}
          >
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                <Text variant="display" mono>
                  {formatPoints(balance, 2, locale)}
                </Text>
                <Text variant="callout" tone="gold" weight="700">
                  PTS
                </Text>
              </View>
              <Text variant="footnote" tone="secondary">
                ≈{' '}
                <Text variant="footnote" mono tone="brand" weight="700">
                  {formatPoints(balance / POINTS_PER_TOKEN, 4, locale)}
                </Text>{' '}
                $BONDKOIN
              </Text>
            </View>
            <Badge label="BEP-20" tone="gold" icon="link-outline" />
          </View>
        </Card>

        {/* Gates */}
        {!kycOk ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/kyc')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.warningMuted,
            }}
          >
            <Ionicons name="shield-outline" size={18} color={c.warning} />
            <Text variant="footnote" style={{ color: c.warning, flex: 1 }}>
              {t('withdraw.kycRequired')}
            </Text>
            <Text variant="footnote" weight="700" style={{ color: c.warning }}>
              {t('withdraw.verifyCta')}
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

        {/* Form */}
        <Card>
          <Input
            label={`${t('withdraw.amount')} (${t('withdraw.pointsShort')})`}
            icon="cash-outline"
            value={points}
            onChangeText={setPoints}
            editable={!blocked}
            keyboardType="decimal-pad"
            placeholder={String(WITHDRAWAL_MIN_POINTS)}
            hint={t('withdraw.minNote', { min: WITHDRAWAL_MIN_POINTS })}
            mono
            trailing={
              <InputAction
                label={t('withdraw.useMax')}
                onPress={() => setPoints(String(Math.floor(balance * 100) / 100))}
              />
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
            hint={t('withdraw.addressNote')}
            trailing={
              <InputAction
                label={t('withdrawScreen.pasteAddress')}
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
                backgroundColor: c.primaryMuted,
              }}
            >
              <StatRow
                label={t('withdraw.youReceive')}
                value={`${formatPoints(amount / POINTS_PER_TOKEN, 4, locale)} $BONDKOIN`}
                mono
                tone="brand"
                strong
              />
              <Text variant="caption" tone="tertiary">
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

        {/* The rules, stated plainly */}
        <Card>
          <Text variant="headline" style={{ marginBottom: spacing.sm }}>
            {t('withdrawScreen.rulesTitle')}
          </Text>
          {[
            t('withdrawScreen.rule1', { min: WITHDRAWAL_MIN_POINTS }),
            t('withdrawScreen.rule2', { days: WITHDRAWAL_COOLDOWN_DAYS }),
            t('withdrawScreen.rule3'),
            t('withdrawScreen.rule4'),
          ].map((rule) => (
            <View
              key={rule}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                paddingVertical: 6,
              }}
            >
              <Ionicons name="checkmark-circle" size={16} color={c.success} />
              <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                {rule}
              </Text>
            </View>
          ))}
        </Card>

        {/* History */}
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        {loading ? (
          <Skeleton height={120} radius={radius.xl} />
        ) : history && history.length > 0 ? (
          <>
            <SectionLabel>{t('withdraw.historyTitle')}</SectionLabel>
            {history.map((row) => (
              <WithdrawalRow key={row.id} row={row} />
            ))}
          </>
        ) : null}
      </ScrollView>

      {/* Final confirmation — the address is the one thing that cannot be undone. */}
      <Sheet
        visible={confirming}
        onClose={() => setConfirming(false)}
        title={t('withdrawScreen.reviewTitle')}
        subtitle={t('withdrawScreen.reviewBody')}
        scrollable={false}
      >
        <Card elevation={0} style={{ backgroundColor: c.surfaceAlt }}>
          <StatRow
            label={t('withdraw.amount')}
            value={`${formatPoints(amount || 0, 2, locale)} PTS`}
            mono
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
          <Text variant="caption" tone="tertiary" style={{ marginBottom: 4 }}>
            {t('withdrawScreen.sending')}
          </Text>
          <View
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.dangerMuted,
            }}
          >
            <Text variant="footnote" mono style={{ color: c.danger }}>
              {address.trim()}
            </Text>
          </View>
        </View>

        <Button
          label={t('withdrawScreen.confirmCta')}
          onPress={() => void submit()}
          loading={busy}
          fullWidth
          size="lg"
        />
        <Button
          label={t('app.cancel')}
          variant="ghost"
          onPress={() => setConfirming(false)}
          fullWidth
        />
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
        backgroundColor: c.surfaceAlt,
      }}
    >
      <Ionicons name={icon} size={17} color={c.textSecondary} />
      <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

const STATUS_TONE: Record<WithdrawalStatus, 'success' | 'brand' | 'warning' | 'danger'> = {
  PAID: 'success',
  APPROVED: 'brand',
  PENDING: 'warning',
  REJECTED: 'danger',
};

function WithdrawalRow({ row }: { row: WithdrawalDto }) {
  const { c, spacing } = useTheme();
  const t = useT();
  const { locale } = useI18n();

  return (
    <Card>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <View>
          <Text variant="headline" mono>
            {formatPoints(row.points, 2, locale)} PTS
          </Text>
          <Text variant="caption" tone="secondary">
            → {row.tokenAmount} $BONDKOIN
          </Text>
        </View>
        <Badge label={t(`withdraw.status.${row.status}`)} tone={STATUS_TONE[row.status]} />
      </View>

      <View
        style={{
          marginTop: spacing.md,
          paddingTop: spacing.md,
          borderTopWidth: 1,
          borderTopColor: c.border,
          gap: 3,
        }}
      >
        <Text variant="caption" tone="tertiary" mono>
          {shortAddress(row.toAddress, 10, 8)}
        </Text>
        <Text variant="caption" tone="tertiary">
          {formatDateTime(row.requestedAt, locale)}
        </Text>

        {row.txHash ? (
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              void WebBrowser.openBrowserAsync(
                `https://bscscan.com/tx/${row.txHash}`,
              ).catch(() => {})
            }
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}
          >
            <Ionicons name="open-outline" size={13} color={c.primary} />
            <Text variant="caption" tone="brand" weight="600">
              {t('withdrawScreen.viewOnBscScan')}
            </Text>
          </Pressable>
        ) : null}

        {row.status === 'REJECTED' && row.adminNote ? (
          <Text variant="caption" tone="danger" style={{ marginTop: 4 }}>
            {t('withdraw.rejectedReason')}: {row.adminNote}
          </Text>
        ) : null}
      </View>
    </Card>
  );
}
