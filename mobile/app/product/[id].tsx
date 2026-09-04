import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Sheet } from '../../src/components/ui/Sheet';
import { PulseDot } from '../../src/components/ui/Pulse';
import { EmptyState, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { findProduct } from '../../src/data/products';
import { POINTS_PER_TOKEN } from '../../src/api/endpoints';
import { formatPoints, formatUsd } from '../../src/lib/format';

/** The site's `.marketplace-img-container` ground — near-black in every theme. */
const IMAGE_GROUND = { dark: '#05070F', red: '#0B0C10' } as const;

/** Product detail and the simulated checkout. */
export default function ProductScreen() {
  const { c, name, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useSession();
  const feedback = useFeedback();

  const [checkout, setCheckout] = useState(false);
  const [address, setAddress] = useState('');
  const [contact, setContact] = useState('');
  const [orderRef, setOrderRef] = useState<string | null>(null);

  const product = findProduct(id ?? '');

  if (!product) {
    return (
      <Screen>
        <NavBar title={t('marketScreen.title')} />
        <EmptyState icon="bag-outline" title={t('marketScreen.empty')} />
      </Screen>
    );
  }

  const tokenBalance = (profile?.pointsBalance ?? 0) / POINTS_PER_TOKEN;
  const shortfall = product.bondkoinPrice - tokenBalance;
  const inStock = product.inStock > 0;
  const ground = name === 'red' ? IMAGE_GROUND.red : IMAGE_GROUND.dark;

  return (
    <Screen sunken>
      <NavBar title={t('marketScreen.title')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
        }}
      >
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          {/* Render box — the site's near-black image container */}
          <Animated.View
            entering={FadeInDown.duration(280)}
            style={{
              aspectRatio: 16 / 10,
              borderRadius: radius.xl,
              overflow: 'hidden',
              backgroundColor: ground,
              borderWidth: 1,
              borderColor: name === 'red' ? alpha(c.primary, 0.25) : 'rgba(51,65,85,0.5)',
            }}
          >
            <Image
              source={product.image}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={200}
            />
            {product.badge ? (
              <View
                style={{
                  position: 'absolute',
                  top: 10,
                  left: 10,
                  maxWidth: '80%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <PulseDot color="#FBBF24" size={6} />
                <Text
                  variant="overline"
                  numberOfLines={1}
                  uppercase
                  style={{ color: '#FCD34D', fontSize: 9, letterSpacing: 1.2, flexShrink: 1 }}
                >
                  {product.badge}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                position: 'absolute',
                bottom: 10,
                right: 10,
                paddingHorizontal: 8,
                paddingVertical: 3,
                borderRadius: radius.sm,
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Text variant="caption" mono weight="700" style={{ color: '#67E8F9', fontSize: 10 }}>
                {product.categoryLabel}
              </Text>
            </View>
          </Animated.View>

          {/* Title block */}
          <Animated.View entering={FadeInDown.delay(60).duration(260)} style={{ gap: 6 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                {product.merchantVerified ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={13}
                    color={c.success}
                    accessibilityLabel={t('marketScreen.verified')}
                  />
                ) : null}
                <Text variant="caption" tone="info" weight="700" numberOfLines={1}>
                  {product.merchant}
                </Text>
              </View>
              <Text variant="caption" tone="tertiary" mono>
                {product.region}
              </Text>
            </View>
            <Text variant="title2">{product.name}</Text>
            <Text variant="body" tone="secondary">
              {product.description}
            </Text>
          </Animated.View>

          {/* Price panel */}
          <Animated.View entering={FadeInDown.delay(120).duration(260)}>
            <Card glow>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                }}
              >
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
                    <Text variant="display" mono tone="gold">
                      {product.bondkoinPrice}
                    </Text>
                    <Text variant="callout" tone="info" weight="800">
                      $BONDKOIN
                    </Text>
                  </View>
                  <Text variant="footnote" tone="tertiary" mono>
                    ≈ {formatUsd(product.usdEquivalent, locale)} USD
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text variant="caption" tone="tertiary" mono>
                    {t('marketScreen.stock')}
                  </Text>
                  <Text
                    variant="headline"
                    mono
                    weight="900"
                    tone={inStock ? 'success' : 'danger'}
                  >
                    {inStock ? product.inStock : t('marketScreen.soldOut')}
                  </Text>
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
                <DetailRow label={t('marketScreen.merchant')}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {product.merchantVerified ? (
                      <Ionicons name="checkmark-circle" size={13} color={c.success} />
                    ) : null}
                    <Text variant="callout" weight="600">
                      {product.merchant}
                    </Text>
                  </View>
                </DetailRow>
                <DetailRow label={t('marketScreen.delivery')}>
                  <Text variant="callout" weight="600" mono>
                    {product.deliveryDays}
                  </Text>
                </DetailRow>
                <DetailRow label={t('marketScreen.region')}>
                  <Text variant="callout" weight="600" mono>
                    {product.region}
                  </Text>
                </DetailRow>
                <DetailRow label={t('marketScreen.yourBalance')}>
                  <Text
                    variant="callout"
                    weight="800"
                    mono
                    tone={shortfall > 0 ? 'danger' : 'info'}
                  >
                    {formatPoints(tokenBalance, 2, locale)} $BONDKOIN
                  </Text>
                </DetailRow>
              </View>
            </Card>
          </Animated.View>

          {/* Testnet notice */}
          <Animated.View
            entering={FadeInDown.delay(180).duration(260)}
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: alpha(c.warning, 0.1),
              borderWidth: 1,
              borderColor: alpha(c.warning, 0.3),
            }}
          >
            <Ionicons name="construct-outline" size={17} color={c.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="caption" weight="800" style={{ color: c.warning }}>
                {t('marketScreen.preview')}
              </Text>
              <Text variant="caption" style={{ color: c.warning, opacity: 0.9 }}>
                {t('marketScreen.previewBody')}
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>

      {/* Sticky buy bar */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          backgroundColor: c.chrome,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        {shortfall > 0 ? (
          <Text
            variant="caption"
            tone="danger"
            center
            mono
            style={{ marginBottom: spacing.sm }}
          >
            {t('marketScreen.notEnough', {
              n: formatPoints(shortfall, 2, locale),
            })}
          </Text>
        ) : null}
        <Button
          label={t('marketScreen.buyCta')}
          icon="bag-check-outline"
          onPress={() => setCheckout(true)}
          disabled={!inStock || shortfall > 0}
          fullWidth
          size="lg"
        />
      </View>

      <Sheet
        visible={checkout}
        onClose={() => setCheckout(false)}
        // Clear the receipt only once the sheet is off screen, so the form
        // does not flash back in during the exit animation.
        onDismiss={() => {
          if (orderRef) {
            setOrderRef(null);
            setAddress('');
            setContact('');
          }
        }}
        title={orderRef ? t('marketScreen.orderPlacedTitle') : t('marketScreen.checkoutTitle')}
        subtitle={orderRef ? undefined : product.name}
      >
        {orderRef ? (
          <Animated.View entering={ZoomIn.duration(300)} style={{ gap: spacing.lg }}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.lg,
                  backgroundColor: alpha(c.success, 0.2),
                  borderWidth: 1,
                  borderColor: alpha(c.success, 0.3),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark-circle" size={32} color={c.success} />
              </View>
              <Text variant="footnote" tone="secondary" center>
                {t('marketScreen.orderPlacedBody', { ref: orderRef })}
              </Text>
            </View>

            {/* Receipt — the site's mono ledger lines */}
            <View
              style={{
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: c.dark ? 'rgba(15,23,42,0.6)' : c.surfaceAlt,
                borderWidth: 1,
                borderColor: c.border,
                gap: 6,
              }}
            >
              <ReceiptLine label="ID" value={orderRef} tone="primary" />
              <ReceiptLine label={t('marketScreen.orderItem')} value={product.name} tone="info" />
              <ReceiptLine label={t('marketScreen.merchant')} value={product.merchant} tone="secondary" />
              <ReceiptLine
                label={t('marketScreen.orderAmount')}
                value={`${product.bondkoinPrice} $BONDKOIN`}
                tone="gold"
              />
            </View>

            <Button label={t('app.done')} onPress={() => setCheckout(false)} fullWidth />
          </Animated.View>
        ) : (
          <>
            {/* Item strip */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.md,
                paddingBottom: spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: c.border,
              }}
            >
              <View
                style={{
                  width: 64,
                  height: 48,
                  borderRadius: radius.md,
                  overflow: 'hidden',
                  backgroundColor: ground,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <Image
                  source={product.image}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="callout" weight="700" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text variant="caption" tone="info">
                  {product.merchant}
                </Text>
              </View>
            </View>

            <CheckoutLine label={t('marketScreen.orderAmount')}>
              <Text variant="callout" mono weight="800" tone="gold">
                {product.bondkoinPrice} $BONDKOIN
              </Text>
            </CheckoutLine>
            <CheckoutLine label={t('marketScreen.delivery')}>
              <Text variant="callout" mono weight="800" tone="success">
                {t('marketScreen.shippingFree')}
              </Text>
            </CheckoutLine>

            <Input
              label={t('marketScreen.shippingLabel')}
              icon="location-outline"
              value={address}
              onChangeText={setAddress}
              placeholder="100 Web3 Blvd, Suite 400"
              multiline
            />
            <Input
              label={t('marketScreen.contactLabel')}
              icon="at-outline"
              value={contact}
              onChangeText={setContact}
              placeholder="you@example.com"
              autoCapitalize="none"
            />

            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: alpha(c.primary, 0.1),
                borderWidth: 1,
                borderColor: alpha(c.primary, 0.2),
              }}
            >
              <Ionicons name="information-circle-outline" size={16} color={c.primary} />
              <Text variant="caption" tone="secondary" style={{ flex: 1 }}>
                {t('marketScreen.previewBody')}
              </Text>
            </View>

            <Button
              label={t('marketScreen.placeOrder')}
              icon="bag-check-outline"
              disabled={!address.trim() || !contact.trim()}
              onPress={() => {
                feedback.success();
                setOrderRef(
                  `BND-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                );
              }}
              fullWidth
              size="lg"
            />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

/** Key/value line in the price panel. */
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  const { spacing } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        paddingVertical: 7,
      }}
    >
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      <View style={{ flexShrink: 1, alignItems: 'flex-end' }}>{children}</View>
    </View>
  );
}

/** A glass row in the checkout sheet: label left, mono figure right. */
function CheckoutLine({ label, children }: { label: string; children: React.ReactNode }) {
  const { c, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        padding: spacing.md,
        borderRadius: radius.lg,
        backgroundColor: c.dark ? 'rgba(15,23,42,0.6)' : c.surfaceAlt,
        borderWidth: 1,
        borderColor: c.border,
      }}
    >
      <Text variant="footnote" tone="secondary">
        {label}
      </Text>
      {children}
    </View>
  );
}

function ReceiptLine({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'primary' | 'secondary' | 'info' | 'gold';
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <Text variant="caption" tone="tertiary" mono>
        {label}:
      </Text>
      <Text variant="caption" tone={tone} mono weight="700" style={{ flex: 1 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}
