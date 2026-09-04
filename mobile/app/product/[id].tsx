import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge, StatRow } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Sheet } from '../../src/components/ui/Sheet';
import { EmptyState, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import { findProduct } from '../../src/data/products';
import { POINTS_PER_TOKEN } from '../../src/api/endpoints';
import { formatPoints, formatUsd } from '../../src/lib/format';

/** Product detail and the simulated checkout. */
export default function ProductScreen() {
  const { c, spacing, radius } = useTheme();
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

  return (
    <Screen sunken>
      <NavBar title={t('marketScreen.title')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
        }}
      >
        <Image
          source={product.image}
          style={{ width: '100%', aspectRatio: 16 / 10 }}
          contentFit="cover"
          transition={200}
        />

        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <View style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
              <Badge label={product.categoryLabel} tone="brand" />
              {product.badge ? <Badge label={product.badge} tone="gold" icon="star" /> : null}
            </View>
            <Text variant="title2">{product.name}</Text>
            <Text variant="body" tone="secondary">
              {product.description}
            </Text>
          </View>

          <Card>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'baseline',
                gap: 6,
                marginBottom: spacing.sm,
              }}
            >
              <Text variant="display" mono tone="gold">
                {product.bondkoinPrice}
              </Text>
              <Text variant="callout" tone="secondary" weight="700">
                $BONDKOIN
              </Text>
            </View>
            <Text variant="footnote" tone="tertiary">
              ≈ {formatUsd(product.usdEquivalent, locale)}
            </Text>

            <View
              style={{
                marginTop: spacing.md,
                paddingTop: spacing.md,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <StatRow
                label={t('marketScreen.merchant')}
                value={`${product.merchantVerified ? '✓ ' : ''}${product.merchant}`}
              />
              <StatRow label={t('marketScreen.delivery')} value={product.deliveryDays} />
              <StatRow
                label={t('marketScreen.inStock', { n: product.inStock })}
                value={product.region}
              />
              <StatRow
                label={t('marketScreen.yourBalance')}
                value={`${formatPoints(tokenBalance, 2, locale)} $BONDKOIN`}
                mono
                tone={shortfall > 0 ? 'danger' : 'success'}
              />
            </View>
          </Card>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: c.warningMuted,
            }}
          >
            <Ionicons name="construct-outline" size={17} color={c.warning} />
            <Text variant="caption" style={{ color: c.warning, flex: 1 }}>
              {t('marketScreen.previewBody')}
            </Text>
          </View>
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
          backgroundColor: c.surface,
          borderTopWidth: 1,
          borderTopColor: c.border,
        }}
      >
        {shortfall > 0 ? (
          <Text
            variant="caption"
            tone="danger"
            center
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
          disabled={product.inStock === 0}
          fullWidth
          size="lg"
        />
      </View>

      <Sheet
        visible={checkout}
        onClose={() => {
          setCheckout(false);
          setOrderRef(null);
        }}
        title={orderRef ? t('marketScreen.orderPlacedTitle') : t('marketScreen.checkoutTitle')}
        subtitle={orderRef ? undefined : product.name}
      >
        {orderRef ? (
          <View style={{ gap: spacing.lg }}>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: radius.lg,
                  backgroundColor: c.successMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="checkmark-circle" size={30} color={c.success} />
              </View>
              <Text variant="footnote" tone="secondary" center>
                {t('marketScreen.orderPlacedBody', { ref: orderRef })}
              </Text>
            </View>
            <Button
              label={t('app.done')}
              onPress={() => {
                setCheckout(false);
                setOrderRef(null);
              }}
              fullWidth
            />
          </View>
        ) : (
          <>
            <Card elevation={0} style={{ backgroundColor: c.surfaceAlt }}>
              <StatRow
                label={product.name}
                value={`${product.bondkoinPrice} $BONDKOIN`}
                mono
                strong
              />
              <StatRow label={t('marketScreen.delivery')} value={t('marketScreen.shippingFree')} tone="success" />
            </Card>

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

            <Button
              label={t('marketScreen.placeOrder')}
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
