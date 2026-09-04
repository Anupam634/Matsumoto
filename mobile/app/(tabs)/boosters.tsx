import React, { useCallback, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useTabContentInset } from '../../src/lib/layout';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
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
import { PulseDot } from '../../src/components/ui/Pulse';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { useAsyncData, useNow } from '../../src/lib/hooks';
import {
  createBoosterIntent,
  getBoosters,
  submitBoosterPayment,
  type BoosterOverview,
  type BoosterPlanDto,
  type BoosterPurchaseDto,
  type PurchaseStatus,
} from '../../src/api/endpoints';
import { ApiError, errorMessage } from '../../src/api/client';
import {
  ADDRESS_RE,
  TX_HASH_RE,
  countdownLabel,
  daysUntil,
  formatDate,
  formatPoints,
  formatUsd,
  shortAddress,
} from '../../src/lib/format';

/** BNB Smart Chain mainnet, for EIP-681 wallet links. */
const BSC_CHAIN_ID = 56;

/**
 * Boosters.
 *
 * Plans, the boosters currently running, and a three-step purchase: bind the
 * paying wallet, send USDT on BNB Chain, submit the hash. Verification is done
 * on-chain by the server — there is no manual approval step, so the sheet says
 * exactly that rather than implying a wait for a human.
 */
export default function BoostersScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const tabInset = useTabContentInset();
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
  // A booster's bonus is scaled by the referral tier, same as the base rate.
  const multiplier = mining?.referralTier.multiplier ?? 1;

  // Nothing came back at all: the rest of the page would be a misleading
  // "no boosters running" plus an empty catalogue, so show only the error.
  const failed = !!error && !data;

  const activeCount = data?.activeBoosters.length ?? 0;

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
          paddingBottom: tabInset,
          gap: spacing.md,
        }}
      >
        {error ? (
          <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
        ) : null}

        {failed ? null : (
          <>
            {/* Current rate — the glowing hero panel */}
            <Animated.View entering={FadeInDown.duration(260)}>
              <Card glow>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.md,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="overline" tone="tertiary" uppercase>
                      {t('boost.currentRate')}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'baseline',
                        gap: 6,
                        marginTop: 4,
                      }}
                    >
                      <Text variant="display" mono tone="gold">
                        {formatPoints(currentRate, 2, locale)}
                      </Text>
                      <Text variant="callout" tone="tertiary" weight="700">
                        BONDKOIN/h
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: spacing.sm,
                        marginTop: spacing.sm,
                      }}
                    >
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 6,
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: radius.pill,
                          backgroundColor: alpha(c.primary, 0.1),
                          borderWidth: 1,
                          borderColor: alpha(c.primary, 0.25),
                        }}
                      >
                        <Ionicons name="logo-bitcoin" size={11} color={c.gold} />
                        <Text variant="caption" tone="brand" weight="700">
                          {t('dashboard.poweredByBnb')}
                        </Text>
                      </View>
                      {activeCount > 0 ? (
                        <View
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                        >
                          <PulseDot color={c.success} size={7} />
                          <Text variant="caption" tone="success" mono weight="700">
                            ×{activeCount}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: radius.lg,
                      backgroundColor: alpha(c.primary, 0.15),
                      borderWidth: 1,
                      borderColor: alpha(c.primary, 0.3),
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Ionicons name="rocket" size={26} color={c.primary} />
                  </View>
                </View>
              </Card>
            </Animated.View>

            {/* Payments disabled notice, straight from the server */}
            {data && !data.payment.enabled ? (
              <Animated.View
                entering={FadeInDown.delay(40).duration(260)}
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.warning, 0.1),
                  borderWidth: 1,
                  borderColor: alpha(c.warning, 0.25),
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
              </Animated.View>
            ) : null}

            {/* Active boosters */}
            <SectionLabel>{t('boost.activeTitle')}</SectionLabel>
            {loading ? (
              <Skeleton height={70} radius={radius.xl} />
            ) : data && data.activeBoosters.length > 0 ? (
              <Animated.View entering={FadeInDown.delay(60).duration(260)}>
                <Card style={{ gap: spacing.sm }}>
                  {data.activeBoosters.map((booster) => {
                    const days = daysUntil(booster.expiresAt);
                    return (
                      <View
                        key={booster.id}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing.md,
                          paddingVertical: spacing.sm,
                          paddingHorizontal: spacing.md,
                          borderRadius: radius.md,
                          backgroundColor: alpha(c.success, c.dark ? 0.1 : 0.08),
                          borderWidth: 1,
                          borderColor: alpha(c.success, 0.2),
                        }}
                      >
                        <Ionicons name="flash" size={16} color={c.success} />
                        <View style={{ flex: 1 }}>
                          <Text variant="callout" tone="success" weight="700" mono>
                            {formatUsd(booster.priceUsd, locale)} · +
                            {formatPoints(booster.rateBonusPerHour, 2, locale)}/h
                          </Text>
                          <Text variant="caption" tone="tertiary">
                            {t('boosters.expires')} {formatDate(booster.expiresAt, locale)}
                          </Text>
                        </View>
                        <Badge
                          label={
                            days <= 1 ? t('boost.expiringSoon') : t('boost.expiresIn', { days })
                          }
                          tone={days <= 3 ? 'warning' : 'success'}
                        />
                      </View>
                    );
                  })}
                </Card>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.delay(60).duration(260)}>
                <Card>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radius.md,
                        backgroundColor: c.surfaceAlt,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons name="flash-off-outline" size={17} color={c.textTertiary} />
                    </View>
                    <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                      {t('boost.noneActive')}
                    </Text>
                  </View>
                </Card>
              </Animated.View>
            )}

            {/* Plans */}
            <SectionLabel>{t('boost.choosePlan')}</SectionLabel>
            {loading ? (
              <View style={{ gap: spacing.md }}>
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={200} radius={radius.xl} />
                ))}
              </View>
            ) : (
              data?.plans.map((plan, i) => (
                <Animated.View
                  key={plan.id}
                  entering={FadeInDown.delay(100 + i * 60).duration(300)}
                >
                  <PlanCard
                    plan={plan}
                    currentRate={currentRate}
                    multiplier={multiplier}
                    highlight={plan.priceUsd === 10}
                    best={i === data.plans.length - 1}
                    disabled={!data.payment.enabled}
                    onBuy={() => setCheckout(plan)}
                  />
                </Animated.View>
              ))
            )}

            {/* Purchase history */}
            {data && data.purchases.length > 0 ? (
              <>
                <SectionLabel>{t('boost.historyTitle')}</SectionLabel>
                <Animated.View entering={FadeInDown.delay(160).duration(260)}>
                  <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
                    {data.purchases.map((purchase, i) => (
                      <PurchaseRow
                        key={purchase.id}
                        purchase={purchase}
                        last={i === data.purchases.length - 1}
                      />
                    ))}
                  </Card>
                </Animated.View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Kept mounted so the close animation plays; `plan` is null while shut. */}
      <CheckoutSheet
        visible={!!checkout && !!data}
        plan={checkout}
        overview={data}
        currentRate={currentRate}
        multiplier={multiplier}
        onClose={() => setCheckout(null)}
        onDone={async () => {
          setCheckout(null);
          await Promise.all([reload({ silent: true }), refresh()]);
        }}
      />
    </Screen>
  );
}

/* ───────────────────────────── Plan card ───────────────────────────── */

/**
 * A plan, as the web's PlanCard: amber mono price with a tracked "/ 30D",
 * an emerald bonus chip, hairline rows for the resulting rate and duration,
 * and a gradient CTA. The popular plan takes the amber ring and the
 * amber → yellow corner badge.
 */
function PlanCard({
  plan,
  currentRate,
  multiplier,
  highlight,
  best,
  disabled,
  onBuy,
}: {
  plan: BoosterPlanDto;
  currentRate: number;
  multiplier: number;
  highlight?: boolean;
  best?: boolean;
  disabled?: boolean;
  onBuy: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const { locale } = useI18n();
  const scale = useSharedValue(1);

  // What the rate becomes for *this* miner, not the base-rate example: the
  // booster stacks on whatever is already running, scaled by the referral
  // tier the same way the server scales it.
  const projected = currentRate + plan.rateBonusPerHour * multiplier;

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const badgeGradient: [string, string] | null = highlight
    ? [c.goldGradient[0], c.goldGradient[c.goldGradient.length - 1]]
    : best
      ? ['#7C3AED', '#EC4899']
      : null;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatUsd(plan.priceUsd, locale)} · +${plan.rateBonusPerHour} BONDKOIN/h`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPressIn={() => {
          scale.value = withSpring(0.985, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={onBuy}
      >
        <Card
          glow={highlight}
          accent={highlight ? alpha(c.gold, 0.6) : best ? alpha(c.primary, 0.5) : undefined}
          style={{ overflow: 'hidden' }}
        >
          {/* Corner ribbon — the site's rotated badge, squared off for touch */}
          {badgeGradient ? (
            <View style={{ position: 'absolute', top: 0, right: 0 }}>
              <LinearGradient
                colors={badgeGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderBottomLeftRadius: radius.md,
                  borderTopRightRadius: radius.xl - 1,
                }}
              >
                <Text
                  variant="overline"
                  uppercase
                  style={{
                    color: highlight ? c.onGold : '#FFFFFF',
                    fontSize: 10,
                    letterSpacing: 1.6,
                  }}
                >
                  {highlight ? t('boost.mostPopular') : t('boost.bestValue')}
                </Text>
              </LinearGradient>
            </View>
          ) : null}

          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: spacing.md,
            }}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                <Text variant="title1" mono tone="gold">
                  {formatUsd(plan.priceUsd, locale)}
                </Text>
                <Text variant="overline" tone="tertiary" uppercase>
                  / {plan.durationDays}d
                </Text>
              </View>
              <View
                style={{
                  alignSelf: 'flex-start',
                  marginTop: spacing.sm,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.sm,
                  backgroundColor: alpha(c.success, 0.1),
                  borderWidth: 1,
                  borderColor: alpha(c.success, 0.3),
                }}
              >
                <Text variant="caption" tone="success" weight="800">
                  +{formatPoints(plan.rateBonusPerHour, 1, locale)} BONDKOIN/h
                </Text>
              </View>
            </View>

            <View
              style={{
                width: 40,
                height: 40,
                marginTop: badgeGradient ? spacing.lg : 0,
                borderRadius: radius.md,
                backgroundColor: c.dark ? 'rgba(255,255,255,0.04)' : c.surfaceAlt,
                borderWidth: 1,
                borderColor: c.dark ? 'rgba(255,255,255,0.08)' : c.border,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="flash" size={18} color={c.gold} />
            </View>
          </View>

          <View
            style={{
              marginTop: spacing.md,
              paddingTop: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: c.border,
            }}
          >
            <PlanRow label={t('boost.afterPurchase')}>
              <Text variant="callout" mono weight="800" tone="info">
                {formatPoints(projected, 2, locale)} /h
              </Text>
            </PlanRow>
            <PlanRow label={t('boosters.resultingRate')}>
              <Text variant="callout" mono weight="800" tone="gold">
                {formatPoints(plan.resultingRatePerHour, 2, locale)} /h
              </Text>
            </PlanRow>
            <PlanRow label={t('dashboard.duration')}>
              <Text variant="footnote" mono weight="700" tone="secondary">
                {plan.durationDays} {t('boosters.days')} · {t('boosters.stackable')}
              </Text>
            </PlanRow>
          </View>

          <Button
            label={`${t('dashboard.getStarted')} →`}
            onPress={onBuy}
            disabled={disabled}
            variant={highlight ? 'gold' : 'primary'}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </Pressable>
    </Animated.View>
  );
}

function PlanRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: 6,
      }}
    >
      <Text variant="footnote" tone="secondary" style={{ flexShrink: 1 }}>
        {label}
      </Text>
      {children}
    </View>
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
  const t = useT();
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
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text variant="callout" weight="800" mono tone="gold">
            {purchase.amount}
          </Text>
          <Text variant="caption" tone="tertiary" weight="700">
            {purchase.tokenSymbol}
          </Text>
        </View>
        <Badge
          label={t(`boost.purchaseStatus.${purchase.status}`)}
          tone={STATUS_TONE[purchase.status]}
          dot
        />
      </View>
      <Text variant="caption" tone="tertiary" mono>
        {formatDate(purchase.createdAt, locale)}
      </Text>
      {purchase.txHash ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`${t('withdrawScreen.viewOnBscScan')} ${shortAddress(purchase.txHash)}`}
          hitSlop={12}
          onPress={() =>
            void WebBrowser.openBrowserAsync(
              `https://bscscan.com/tx/${purchase.txHash}`,
            ).catch(() => {})
          }
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            minHeight: 44,
          }}
        >
          <Ionicons name="open-outline" size={13} color={c.primary} />
          <Text variant="caption" tone="brand" weight="600">
            {t('withdrawScreen.viewOnBscScan')}
          </Text>
          <Text variant="caption" tone="tertiary" mono>
            {shortAddress(purchase.txHash)}
          </Text>
        </Pressable>
      ) : null}
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
  visible,
  plan: planProp,
  overview,
  currentRate,
  multiplier,
  onClose,
  onDone,
}: {
  visible: boolean;
  plan: BoosterPlanDto | null;
  overview: BoosterOverview | null;
  currentRate: number;
  multiplier: number;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const feedback = useFeedback();
  const now = useNow();

  // The plan is cleared by the parent the moment the sheet closes; hold on to
  // the last one so the content doesn't blank out under the exit animation.
  const lastPlan = useRef<BoosterPlanDto | null>(null);
  if (planProp) lastPlan.current = planProp;
  const plan = planProp ?? lastPlan.current;

  const [purchase, setPurchase] = useState<BoosterPurchaseDto | null>(null);
  const [fromAddress, setFromAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the server rejects the hash because the quote lapsed — the local
  // clock can disagree with the server's by a little.
  const [serverExpired, setServerExpired] = useState(false);

  const addressValid = ADDRESS_RE.test(fromAddress.trim());

  const timeLeft = purchase ? countdownLabel(purchase.expiresAt, now) : null;
  const expired = !!purchase && (serverExpired || timeLeft === null);

  const reset = () => {
    setPurchase(null);
    setFromAddress('');
    setTxHash('');
    setError(null);
    setServerExpired(false);
  };

  // Back to step 1, keeping the wallet the user already typed.
  const startAgain = () => {
    setPurchase(null);
    setTxHash('');
    setError(null);
    setServerExpired(false);
  };

  const createIntent = async () => {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      setPurchase(await createBoosterIntent(plan.id, fromAddress.trim()));
      setServerExpired(false);
      feedback.success();
    } catch (err) {
      feedback.error();
      setError(errorMessage(err, t('app.offline')));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!purchase || expired) return;
    setBusy(true);
    setError(null);
    try {
      const res = await submitBoosterPayment(purchase.id, txHash.trim());
      if (res.activated) {
        feedback.win();
        const rate = currentRate + res.booster.rateBonusPerHour * multiplier;
        toast.success(t('boost.activatedBody', { rate: formatPoints(rate, 2, locale) }));
      } else {
        toast.show(t('boost.awaitingBody'));
      }
      await onDone();
    } catch (err) {
      feedback.error();
      if (err instanceof ApiError && err.status === 400 && /expire/i.test(err.message)) {
        setServerExpired(true);
      } else {
        setError(errorMessage(err, t('app.offline')));
      }
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

  // EIP-681 token transfer: `ethereum:<token>@56/transfer?address=…&uint256=…`
  // prefills a USDT transfer. A bare `ethereum:<payTo>@56` would prefill a
  // *native BNB* send, which the server can't credit — so no token contract
  // means no wallet link at all.
  const tokenAddress = overview?.payment.tokenAddress ?? null;
  const walletUri =
    purchase && tokenAddress && purchase.expectedUnits
      ? `ethereum:${tokenAddress}@${BSC_CHAIN_ID}/transfer?address=${purchase.payToAddress}&uint256=${purchase.expectedUnits}`
      : null;

  const openWallet = () => {
    if (!walletUri) return;
    void Linking.openURL(walletUri).catch(() => toast.error(t('app.unavailable')));
  };

  const step = purchase ? 2 : 1;

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      onDismiss={reset}
      title={purchase ? t('boost.step2Title') : t('boost.step1Title')}
      subtitle={
        plan
          ? `${t('boosters.step', { n: step })} · ${formatUsd(plan.priceUsd, locale)} · ${plan.durationDays} ${t('boosters.days')}`
          : undefined
      }
    >
      {!plan ? (
        <View />
      ) : (
        <>
          {/* Step rail — two glass pips, the current one lit */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {[1, 2].map((n) => (
              <View
                key={n}
                style={{
                  flex: 1,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: n <= step ? c.primary : c.surfaceAlt,
                }}
              />
            ))}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: 9,
                paddingVertical: 3,
                borderRadius: radius.pill,
                backgroundColor: alpha(c.primary, 0.1),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.25),
              }}
            >
              <Ionicons name="logo-bitcoin" size={10} color={c.gold} />
              <Text variant="caption" tone="brand" weight="700" mono>
                {t('boosters.chainName')}
              </Text>
            </View>
          </View>

          {!purchase ? (
            <Animated.View entering={FadeInDown.duration(240)} style={{ gap: spacing.md }}>
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
                iconRight="arrow-forward"
                onPress={() => void createIntent()}
                loading={busy}
                disabled={!addressValid}
                fullWidth
                size="lg"
              />
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.duration(240)} style={{ gap: spacing.md }}>
              <Text variant="footnote" tone="secondary">
                {t('boost.openWalletBody')}
              </Text>

              {/* The quote is only payable for so long. */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: expired
                    ? alpha(c.danger, 0.1)
                    : alpha(c.gold, c.dark ? 0.1 : 0.06),
                  borderWidth: 1,
                  borderColor: expired ? alpha(c.danger, 0.3) : alpha(c.gold, 0.3),
                }}
              >
                <Ionicons
                  name={expired ? 'alert-circle' : 'time-outline'}
                  size={17}
                  color={expired ? c.danger : c.gold}
                />
                <Text
                  variant="footnote"
                  tone={expired ? 'danger' : 'gold'}
                  mono={!expired}
                  weight="700"
                  style={{ flex: 1 }}
                >
                  {expired
                    ? t('boost.quoteExpired')
                    : t('boost.quoteExpires', { time: timeLeft ?? '' })}
                </Text>
              </View>

              {expired ? (
                <Button
                  label={t('app.startAgain')}
                  icon="refresh-outline"
                  onPress={startAgain}
                  fullWidth
                  size="lg"
                />
              ) : (
                <>
                  {/* 1-tap wallet pay — the amber panel at the top of the web step */}
                  {walletUri ? (
                    <>
                      <View
                        style={{
                          padding: spacing.md,
                          borderRadius: radius.lg,
                          backgroundColor: alpha(c.gold, c.dark ? 0.1 : 0.06),
                          borderWidth: 1,
                          borderColor: alpha(c.gold, 0.3),
                          gap: spacing.sm,
                        }}
                      >
                        <Button
                          label={`⚡ ${t('boost.openWallet')} · ${purchase.amount} ${purchase.tokenSymbol}`}
                          variant="gold"
                          onPress={openWallet}
                          fullWidth
                        />
                        <Text variant="caption" tone="tertiary" center>
                          {t('boost.scanNote')}
                        </Text>
                      </View>

                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
                      >
                        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                        <Text variant="overline" tone="tertiary" uppercase>
                          {t('boost.orManual')}
                        </Text>
                        <View style={{ flex: 1, height: 1, backgroundColor: c.border }} />
                      </View>
                    </>
                  ) : null}

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

                  {/* QR on a glass panel */}
                  <View
                    style={{
                      alignItems: 'center',
                      gap: spacing.sm,
                      padding: spacing.lg,
                      borderRadius: radius.lg,
                      backgroundColor: c.dark ? 'rgba(255,255,255,0.03)' : c.surfaceAlt,
                      borderWidth: 1,
                      borderColor: c.dark ? 'rgba(255,255,255,0.1)' : c.border,
                    }}
                  >
                    <View
                      accessible
                      accessibilityLabel={`${t('app.scanWithWallet')}: ${purchase.payToAddress}`}
                      style={{
                        padding: spacing.sm,
                        borderRadius: radius.md,
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      <QRCode
                        value={purchase.payToAddress}
                        size={160}
                        backgroundColor="#FFFFFF"
                        color="#030714"
                      />
                    </View>
                    <Text variant="caption" tone="tertiary" center>
                      {t('app.scanWithWallet')}
                    </Text>
                  </View>

                  {/* Paying-from + the on-chain verification note */}
                  <View
                    style={{
                      padding: spacing.md,
                      borderRadius: radius.lg,
                      backgroundColor: alpha(c.primary, 0.1),
                      borderWidth: 1,
                      borderColor: alpha(c.primary, 0.2),
                      gap: 6,
                    }}
                  >
                    <Text variant="overline" tone="tertiary" uppercase>
                      {t('boosters.payFrom')}
                    </Text>
                    <Text variant="caption" tone="secondary" mono>
                      {shortAddress(purchase.fromAddress, 10, 8)}
                    </Text>
                    <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>
                      {t('boosters.payWarning', {
                        confirmations: overview?.payment.minConfirmations ?? 0,
                      })}
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
                    icon="shield-checkmark-outline"
                    onPress={() => void verify()}
                    loading={busy}
                    disabled={expired || !TX_HASH_RE.test(txHash.trim())}
                    fullWidth
                    size="lg"
                  />
                </>
              )}
            </Animated.View>
          )}
        </>
      )}
    </Sheet>
  );
}

/** A value the miner has to reproduce exactly — tap anywhere on it to copy. */
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
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();

  return (
    <View>
      <Text variant="overline" tone="tertiary" uppercase style={{ marginBottom: 6 }}>
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
          minHeight: 48,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: emphasis
            ? alpha(c.gold, c.dark ? 0.1 : 0.06)
            : c.dark
              ? 'rgba(255,255,255,0.05)'
              : c.surfaceAlt,
          borderWidth: 1,
          borderColor: emphasis ? alpha(c.gold, 0.4) : c.dark ? 'rgba(255,255,255,0.1)' : c.border,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text
          variant={emphasis ? 'title3' : 'footnote'}
          mono={mono || emphasis}
          tone={emphasis ? 'gold' : 'primary'}
          weight={emphasis ? '900' : '500'}
          style={{ flex: 1 }}
          numberOfLines={2}
        >
          {display}
        </Text>
        <View
          style={{
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: radius.sm,
            borderWidth: 1,
            borderColor: alpha(c.primary, 0.4),
            backgroundColor: alpha(c.primary, 0.1),
          }}
        >
          <Text variant="caption" tone="brand" weight="700">
            {t('boosters.copy')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
