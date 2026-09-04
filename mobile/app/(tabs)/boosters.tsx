import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';

import { Text } from '../../src/components/ui/Text';
import { Card, CardHeader, SectionLabel } from '../../src/components/ui/Card';
import { Badge, StatRow } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input, InputAction } from '../../src/components/ui/Input';
import { Sheet } from '../../src/components/ui/Sheet';
import {
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../../src/components/ui/Chrome';
import { IconButton } from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData } from '../../src/lib/hooks';
import {
  createBoosterIntent,
  getBoosters,
  submitBoosterPayment,
  type BoosterOverview,
  type BoosterPlanDto,
  type BoosterPurchaseDto,
  type PurchaseStatus,
} from '../../src/api/endpoints';
import { errorMessage } from '../../src/api/client';
import {
  ADDRESS_RE,
  TX_HASH_RE,
  daysUntil,
  formatDate,
  formatPoints,
  formatUsd,
  shortAddress,
} from '../../src/lib/format';

/**
 * Boosters.
 *
 * Plans, the boosters currently running, and a three-step purchase: bind the
 * paying wallet, send USDT on BNB Chain, submit the hash. Verification is done
 * on-chain by the server — there is no manual approval step, so the sheet says
 * exactly that rather than implying a wait for a human.
 */
export default function BoostersScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const { mining, refresh } = useSession();
  const router = useRouter();

  const load = useCallback(() => getBoosters(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data, error, loading, refreshing, reload } = useAsyncData<BoosterOverview>(
    load,
    toMessage,
  );

  const [checkout, setCheckout] = useState<BoosterPlanDto | null>(null);

  const currentRate = mining?.ratePerHour ?? 0;

  return (
    <Screen sunken>
      <NavBar
        title={t('boost.title')}
        subtitle={t('boost.subtitle')}
        onBack={null}
        large
        right={
          <IconButton
            icon="calculator-outline"
            accessibilityLabel={t('landing.calculator.title')}
            onPress={() => router.push('/calculator')}
          />
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
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
          paddingBottom: insets.bottom + 110,
          gap: spacing.md,
        }}
      >
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        {/* Current rate */}
        <Card>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text variant="overline" tone="tertiary" uppercase>
                {t('boost.currentRate')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text variant="display" mono>
                  {formatPoints(currentRate, 2, locale)}
                </Text>
                <Text variant="callout" tone="secondary">
                  /h
                </Text>
              </View>
            </View>
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: radius.lg,
                backgroundColor: c.goldMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="rocket" size={26} color={c.gold} />
            </View>
          </View>
        </Card>

        {/* Payments disabled notice, straight from the server */}
        {data && !data.payment.enabled ? (
          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.warningMuted,
            }}
          >
            <Ionicons name="information-circle" size={18} color={c.warning} />
            <View style={{ flex: 1 }}>
              <Text variant="footnote" style={{ color: c.warning }}>
                {t('boosters.paymentsDisabled')}
              </Text>
              {data.payment.disabledReason ? (
                <Text variant="caption" tone="tertiary" mono style={{ marginTop: 4 }}>
                  {data.payment.disabledReason}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Active boosters */}
        <SectionLabel>{t('boost.activeTitle')}</SectionLabel>
        {loading ? (
          <Skeleton height={70} radius={radius.xl} />
        ) : data && data.activeBoosters.length > 0 ? (
          <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
            {data.activeBoosters.map((booster, i) => {
              const days = daysUntil(booster.expiresAt);
              return (
                <View
                  key={booster.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.md,
                    paddingVertical: spacing.md,
                    borderBottomWidth: i === data.activeBoosters.length - 1 ? 0 : 1,
                    borderBottomColor: c.border,
                  }}
                >
                  <View
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: radius.md,
                      backgroundColor: c.successMuted,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="flash" size={18} color={c.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="callout" weight="700">
                      +{formatPoints(booster.rateBonusPerHour, 2, locale)} /h
                    </Text>
                    <Text variant="caption" tone="tertiary">
                      {formatUsd(booster.priceUsd, locale)} ·{' '}
                      {formatDate(booster.expiresAt, locale)}
                    </Text>
                  </View>
                  <Badge
                    label={days <= 1 ? t('boost.expiringSoon') : t('boost.expiresIn', { days })}
                    tone={days <= 3 ? 'warning' : 'success'}
                  />
                </View>
              );
            })}
          </Card>
        ) : (
          <Card>
            <Text variant="footnote" tone="secondary">
              {t('boost.noneActive')}
            </Text>
          </Card>
        )}

        {/* Plans */}
        <SectionLabel>{t('boost.choosePlan')}</SectionLabel>
        {loading ? (
          <View style={{ gap: spacing.md }}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={120} radius={radius.xl} />
            ))}
          </View>
        ) : (
          data?.plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentRate={currentRate}
              highlight={i === 1}
              best={i === (data.plans.length - 1)}
              disabled={!data.payment.enabled}
              onBuy={() => setCheckout(plan)}
            />
          ))
        )}

        {/* Purchase history */}
        {data && data.purchases.length > 0 ? (
          <>
            <SectionLabel>{t('boost.historyTitle')}</SectionLabel>
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {data.purchases.map((purchase, i) => (
                <PurchaseRow
                  key={purchase.id}
                  purchase={purchase}
                  last={i === data.purchases.length - 1}
                />
              ))}
            </Card>
          </>
        ) : null}
      </ScrollView>

      {checkout && data ? (
        <CheckoutSheet
          plan={checkout}
          overview={data}
          onClose={() => setCheckout(null)}
          onDone={async () => {
            setCheckout(null);
            await Promise.all([reload({ silent: true }), refresh()]);
          }}
        />
      ) : null}
    </Screen>
  );
}

/* ───────────────────────────── Plan card ───────────────────────────── */

function PlanCard({
  plan,
  currentRate,
  highlight,
  best,
  disabled,
  onBuy,
}: {
  plan: BoosterPlanDto;
  currentRate: number;
  highlight?: boolean;
  best?: boolean;
  disabled?: boolean;
  onBuy: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const { locale } = useI18n();

  // What the rate becomes for *this* miner, not the base-rate example: the
  // booster stacks on whatever is already running.
  const projected = currentRate + plan.rateBonusPerHour;

  return (
    <Card
      style={
        highlight || best
          ? { borderColor: highlight ? c.gold : c.primary, borderWidth: 1.5 }
          : undefined
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: spacing.md,
        }}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
            <Text variant="title1" mono>
              {formatUsd(plan.priceUsd, locale)}
            </Text>
            <Text variant="caption" tone="tertiary">
              {t('boost.perMonth')}
            </Text>
          </View>
          <Badge
            label={`+${formatPoints(plan.rateBonusPerHour, 1, locale)} /h`}
            tone="success"
            icon="add-circle"
            style={{ marginTop: 6 }}
          />
        </View>

        {highlight ? (
          <Badge label={t('boost.mostPopular')} tone="gold" icon="star" />
        ) : best ? (
          <Badge label={t('boost.bestValue')} tone="brand" icon="diamond" />
        ) : null}
      </View>

      <View
        style={{
          padding: spacing.md,
          borderRadius: radius.md,
          backgroundColor: c.surfaceAlt,
        }}
      >
        <StatRow
          label={t('boost.afterPurchase')}
          value={`${formatPoints(projected, 2, locale)} /h`}
          mono
          tone="brand"
          strong
        />
        <StatRow
          label={t('dashboard.duration')}
          value={`${plan.durationDays} ${t('boosters.days')} · ${t('boosters.stackable')}`}
        />
      </View>

      <Button
        label={t('boosters.buy')}
        onPress={onBuy}
        disabled={disabled}
        variant={highlight ? 'gold' : 'primary'}
        fullWidth
        style={{ marginTop: spacing.md }}
      />
    </Card>
  );
}

/* ──────────────────────────── Purchase row ─────────────────────────── */

const STATUS_TONE: Record<PurchaseStatus, 'success' | 'warning' | 'danger' | 'neutral'> = {
  CONFIRMED: 'success',
  AWAITING_PAYMENT: 'warning',
  FAILED: 'danger',
  EXPIRED: 'neutral',
};

function PurchaseRow({
  purchase,
  last,
}: {
  purchase: BoosterPurchaseDto;
  last?: boolean;
}) {
  const { c, spacing } = useTheme();
  const { locale } = useI18n();

  return (
    <View
      style={{
        paddingVertical: spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: c.border,
        gap: 4,
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
        <Text variant="callout" weight="600" mono>
          {purchase.amount} {purchase.tokenSymbol}
        </Text>
        <Badge
          label={purchase.status.replace('_', ' ')}
          tone={STATUS_TONE[purchase.status]}
        />
      </View>
      <Text variant="caption" tone="tertiary">
        {formatDate(purchase.createdAt, locale)}
        {purchase.txHash ? ` · ${shortAddress(purchase.txHash)}` : ''}
      </Text>
      {purchase.failureReason ? (
        <Text variant="caption" tone="danger">
          {purchase.failureReason}
        </Text>
      ) : null}
    </View>
  );
}

/* ───────────────────────────── Checkout ────────────────────────────── */

function CheckoutSheet({
  plan,
  overview,
  onClose,
  onDone,
}: {
  plan: BoosterPlanDto;
  overview: BoosterOverview;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const feedback = useFeedback();

  const [purchase, setPurchase] = useState<BoosterPurchaseDto | null>(null);
  const [fromAddress, setFromAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addressValid = ADDRESS_RE.test(fromAddress.trim());

  const createIntent = async () => {
    setBusy(true);
    setError(null);
    try {
      setPurchase(await createBoosterIntent(plan.id, fromAddress.trim()));
      feedback.success();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!purchase) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitBoosterPayment(purchase.id, txHash.trim());
      if (res.activated) {
        feedback.win();
        toast.success(t('boost.activatedTitle'));
      } else {
        toast.show(t('boost.awaitingBody'));
      }
      await onDone();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const paste = async (setter: (value: string) => void) => {
    const text = await Clipboard.getStringAsync();
    if (text) setter(text.trim());
  };

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    feedback.success();
    toast.success(t('app.copied'));
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={purchase ? t('boost.step2Title') : t('boost.step1Title')}
      subtitle={`${formatUsd(plan.priceUsd, locale)} · ${plan.durationDays} ${t('boosters.days')} · ${t('boosters.step', { n: purchase ? 2 : 1 })}`}
    >
      {!purchase ? (
        <>
          <Text variant="footnote" tone="secondary">
            {t('boosters.fromBody')}
          </Text>

          <Input
            label={t('boosters.fromLabel')}
            icon="wallet-outline"
            value={fromAddress}
            onChangeText={setFromAddress}
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect={false}
            mono
            error={
              fromAddress.trim() && !addressValid ? t('boosters.fromInvalid') : null
            }
            trailing={
              <InputAction
                label={t('boost.pasteFromClipboard')}
                onPress={() => void paste(setFromAddress)}
              />
            }
          />

          {error ? <ErrorNote message={error} /> : null}

          <Button
            label={t('boosters.continue')}
            onPress={() => void createIntent()}
            loading={busy}
            disabled={!addressValid}
            fullWidth
            size="lg"
          />
        </>
      ) : (
        <>
          <Text variant="footnote" tone="secondary">
            {t('boost.openWalletBody')}
          </Text>

          {/* Amount and destination — the two things that must be exact. */}
          <CopyField
            label={t('boosters.amount')}
            value={purchase.amount}
            display={`${purchase.amount} ${purchase.tokenSymbol}`}
            onCopy={copy}
            emphasis
          />
          <CopyField
            label={t('boosters.payTo')}
            value={purchase.payToAddress}
            display={purchase.payToAddress}
            onCopy={copy}
            mono
          />

          <View
            style={{
              alignItems: 'center',
              gap: spacing.sm,
              padding: spacing.lg,
              borderRadius: radius.lg,
              backgroundColor: c.surfaceAlt,
            }}
          >
            <QrPlaceholder />
            <Text variant="caption" tone="tertiary" center>
              {t('boost.scanNote')}
            </Text>
            <Button
              label={t('boost.openWallet')}
              variant="secondary"
              size="sm"
              icon="open-outline"
              onPress={() => {
                // A BIP-681-style URI: any BNB Chain wallet registered for
                // ethereum: links picks this up with the address pre-filled.
                void Linking.openURL(`ethereum:${purchase.payToAddress}@56`).catch(
                  () => toast.error(t('app.unavailable')),
                );
              }}
            />
          </View>

          <View
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.infoMuted,
              gap: 4,
            }}
          >
            <Text variant="caption" style={{ color: c.info }}>
              {t('boosters.payWarning', {
                confirmations: overview.payment.minConfirmations,
              })}
            </Text>
            <Text variant="caption" tone="tertiary" mono>
              {t('boosters.payFrom')}: {shortAddress(purchase.fromAddress, 8, 6)}
            </Text>
          </View>

          <Input
            label={t('boosters.txHash')}
            icon="receipt-outline"
            value={txHash}
            onChangeText={setTxHash}
            placeholder="0x…"
            autoCapitalize="none"
            autoCorrect={false}
            mono
            trailing={
              <InputAction
                label={t('boost.pasteFromClipboard')}
                onPress={() => void paste(setTxHash)}
              />
            }
          />

          {error ? <ErrorNote message={error} /> : null}

          <Button
            label={busy ? t('boosters.verifying') : t('boosters.verify')}
            onPress={() => void verify()}
            loading={busy}
            disabled={!TX_HASH_RE.test(txHash.trim())}
            fullWidth
            size="lg"
          />
        </>
      )}
    </Sheet>
  );
}

function CopyField({
  label,
  value,
  display,
  onCopy,
  mono,
  emphasis,
}: {
  label: string;
  value: string;
  display: string;
  onCopy: (value: string) => Promise<void>;
  mono?: boolean;
  emphasis?: boolean;
}) {
  const { c, spacing, radius } = useTheme();
  const t = useT();

  return (
    <View>
      <Text
        variant="footnote"
        tone="secondary"
        weight="600"
        style={{ marginBottom: 6 }}
      >
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t('app.copy')} ${label}`}
        onPress={() => void onCopy(value)}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: emphasis ? c.primaryMuted : c.surfaceAlt,
          borderWidth: 1,
          borderColor: emphasis ? c.primary : c.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          variant={emphasis ? 'headline' : 'footnote'}
          mono={mono}
          weight={emphasis ? '700' : '500'}
          style={{ flex: 1 }}
          numberOfLines={2}
        >
          {display}
        </Text>
        <Ionicons name="copy-outline" size={17} color={c.primary} />
      </Pressable>
    </View>
  );
}

/**
 * A decorative QR frame.
 *
 * The web app fetches a real QR from a third-party image host; doing that here
 * would send the payout address to a server nobody vetted, so the address is
 * offered as copy-to-clipboard and a wallet deep link instead.
 */
function QrPlaceholder() {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: 108,
        height: 108,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={108} height={108} viewBox="0 0 108 108">
        <Rect x="0" y="0" width="108" height="108" rx="14" fill={c.surface} />
        {[
          [14, 14],
          [66, 14],
          [14, 66],
        ].map(([x, y]) => (
          <React.Fragment key={`${x}-${y}`}>
            <Rect
              x={x}
              y={y}
              width="28"
              height="28"
              rx="7"
              fill="none"
              stroke={c.textPrimary}
              strokeWidth="5"
            />
            <Rect x={x + 10} y={y + 10} width="8" height="8" rx="2" fill={c.textPrimary} />
          </React.Fragment>
        ))}
        <Path
          d="M56 56h6v6h-6zM68 56h6v6h-6zM80 62h6v6h-6zM56 68h6v6h-6zM68 74h6v6h-6zM80 80h6v6h-6zM62 86h6v6h-6z"
          fill={c.textPrimary}
        />
      </Svg>
    </View>
  );
}
