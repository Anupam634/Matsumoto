import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Chips } from '../../src/components/ui/Segmented';
import { Sheet } from '../../src/components/ui/Sheet';
import { EmptyState, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import { PRODUCTS, type Product, type ProductCategory } from '../../src/data/products';
import { POINTS_PER_TOKEN } from '../../src/api/endpoints';
import { formatPoints, formatUsd } from '../../src/lib/format';

type Filter = ProductCategory | 'all';

/** The ecosystem pillars, as stated in the marketplace announcement. */
const PILLARS: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}[] = [
  {
    key: 'regional',
    icon: 'navigate-outline',
    title: 'Regional commerce',
    body: 'Local verified merchants fulfilling within your region first.',
  },
  {
    key: 'payment',
    icon: 'card-outline',
    title: '$BONDKOIN payment',
    body: 'Checkout settles in BEP-20 $BONDKOIN on BNB Smart Chain.',
  },
  {
    key: 'merchant',
    icon: 'storefront-outline',
    title: 'Verified merchants',
    body: 'Quality review, escrow settlement and dispute cover.',
  },
  {
    key: 'logistics',
    icon: 'earth-outline',
    title: 'Global logistics',
    body: 'Scaling from regional clusters to worldwide delivery.',
  },
];

/**
 * Marketplace.
 *
 * Browsing and checkout are real UI over a static catalogue: the merchant API
 * does not exist yet, so an order is explicitly simulated and the screen says
 * so up front rather than taking a balance the server would never debit.
 */
export default function MarketScreen() {
  const { c, spacing, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const { profile } = useSession();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [merchantOpen, setMerchantOpen] = useState(false);

  const tokenBalance = (profile?.pointsBalance ?? 0) / POINTS_PER_TOKEN;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((p) => {
      if (filter !== 'all' && p.category !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.merchant.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const categories: { value: Filter; label: string; count?: number }[] = [
    { value: 'all', label: t('marketScreen.allItems'), count: PRODUCTS.length },
    { value: 'hardware', label: 'Hardware' },
    { value: 'merch', label: 'Merch' },
    { value: 'digital', label: 'Digital' },
    { value: 'regional', label: 'Regional' },
    { value: 'vouchers', label: 'Vouchers' },
  ];

  return (
    <Screen sunken>
      <NavBar
        title={t('marketScreen.title')}
        subtitle={t('marketScreen.subtitle')}
        onBack={null}
        large
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 110,
          gap: spacing.md,
        }}
      >
        {/* Balance + preview notice */}
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            <LinearGradient
              colors={[c.primaryMuted, c.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: spacing.lg }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View>
                  <Text variant="overline" tone="tertiary" uppercase>
                    {t('marketScreen.yourBalance')}
                  </Text>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}
                  >
                    <Text variant="title1" mono>
                      {formatPoints(tokenBalance, 2, locale)}
                    </Text>
                    <Text variant="callout" tone="brand" weight="700">
                      $BONDKOIN
                    </Text>
                  </View>
                </View>
                <Badge label={t('marketScreen.preview')} tone="warning" icon="construct" />
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: spacing.sm,
                  marginTop: spacing.md,
                  padding: spacing.md,
                  borderRadius: radius.md,
                  backgroundColor: c.warningMuted,
                }}
              >
                <Ionicons name="information-circle" size={17} color={c.warning} />
                <Text variant="caption" style={{ color: c.warning, flex: 1 }}>
                  {t('marketScreen.previewBody')}
                </Text>
              </View>
            </LinearGradient>
          </Card>

          {/* The four pillars the ecosystem letter sets out. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {PILLARS.map((pillar) => (
              <View
                key={pillar.key}
                style={{
                  width: '47%',
                  flexGrow: 1,
                  gap: 6,
                  padding: spacing.md,
                  borderRadius: radius.lg,
                  backgroundColor: c.surface,
                  borderWidth: 1,
                  borderColor: c.border,
                }}
              >
                <View
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: radius.sm,
                    backgroundColor: c.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={pillar.icon} size={16} color={c.primary} />
                </View>
                <Text variant="footnote" weight="700">
                  {pillar.title}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {pillar.body}
                </Text>
              </View>
            ))}
          </View>

          <Input
            icon="search"
            placeholder={t('app.search')}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Chips
          options={categories}
          value={filter}
          onChange={setFilter}
          style={{ paddingLeft: spacing.lg }}
        />

        {/* Grid */}
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: spacing.md,
            paddingHorizontal: spacing.lg,
          }}
        >
          {filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onPress={() => router.push(`/product/${product.id}`)}
            />
          ))}
        </View>

        {filtered.length === 0 ? (
          <EmptyState icon="search-outline" title={t('marketScreen.empty')} />
        ) : null}

        {/* Merchant programme */}
        <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
          <Card>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: radius.md,
                  backgroundColor: c.goldMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="storefront" size={22} color={c.gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">{t('marketScreen.merchantTitle')}</Text>
                <Text variant="caption" tone="secondary">
                  {t('marketScreen.merchantBody')}
                </Text>
              </View>
            </View>
            <Button
              label={t('marketScreen.merchantApply')}
              variant="secondary"
              onPress={() => setMerchantOpen(true)}
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </Card>
        </View>
      </ScrollView>

      <MerchantSheet visible={merchantOpen} onClose={() => setMerchantOpen(false)} />
    </Screen>
  );
}

function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const { c, spacing, radius } = useTheme();
  const { locale } = useI18n();
  const feedback = useFeedback();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={product.name}
      onPress={() => {
        feedback.select();
        onPress();
      }}
      style={({ pressed }) => ({
        width: '48%',
        flexGrow: 1,
        borderRadius: radius.xl,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        overflow: 'hidden',
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <View style={{ aspectRatio: 16 / 11, backgroundColor: c.surfaceAlt }}>
        <Image
          source={product.image}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={220}
        />
        {product.badge ? (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: radius.pill,
              backgroundColor: 'rgba(0,0,0,0.65)',
            }}
          >
            <Text variant="caption" weight="700" style={{ color: '#FFFFFF', fontSize: 10 }}>
              {product.badge}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.md, gap: 4 }}>
        <Text variant="caption" tone="brand" weight="600" numberOfLines={1}>
          {product.merchantVerified ? '✓ ' : ''}
          {product.merchant}
        </Text>
        <Text variant="callout" weight="700" numberOfLines={2} style={{ minHeight: 40 }}>
          {product.name}
        </Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 4,
            marginTop: 2,
          }}
        >
          <Text variant="headline" mono tone="gold">
            {product.bondkoinPrice}
          </Text>
          <Text variant="caption" tone="tertiary">
            $BONDKOIN
          </Text>
        </View>
        <Text variant="caption" tone="tertiary">
          ≈ {formatUsd(product.usdEquivalent, locale)}
        </Text>
      </View>
    </Pressable>
  );
}

function MerchantSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { spacing } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const [store, setStore] = useState('');
  const [region, setRegion] = useState('');
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);

  const valid = store.trim() && region.trim() && contact.trim();

  return (
    <Sheet
      visible={visible}
      onClose={() => {
        setSent(false);
        onClose();
      }}
      title={sent ? t('marketScreen.merchantDoneTitle') : t('marketScreen.merchantTitle')}
      subtitle={sent ? undefined : t('marketScreen.merchantBody')}
    >
      {sent ? (
        <View style={{ gap: spacing.lg }}>
          <Text variant="footnote" tone="secondary">
            {t('marketScreen.merchantDoneBody')}
          </Text>
          <Button
            label={t('app.done')}
            onPress={() => {
              setSent(false);
              onClose();
            }}
            fullWidth
          />
        </View>
      ) : (
        <>
          <Input
            label={t('marketScreen.merchantStore')}
            value={store}
            onChangeText={setStore}
            placeholder="Apex Hardware Store"
          />
          <Input
            label={t('marketScreen.merchantRegion')}
            value={region}
            onChangeText={setRegion}
            placeholder="Singapore"
          />
          <Input
            label={t('marketScreen.merchantContact')}
            value={contact}
            onChangeText={setContact}
            placeholder="merchant@store.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Button
            label={t('marketScreen.merchantSubmit')}
            disabled={!valid}
            onPress={() => {
              feedback.success();
              setSent(true);
            }}
            fullWidth
            size="lg"
          />
        </>
      )}
    </Sheet>
  );
}
