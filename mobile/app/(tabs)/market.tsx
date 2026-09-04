import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';
import { useTabContentInset } from '../../src/lib/layout';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Chips } from '../../src/components/ui/Segmented';
import { Sheet } from '../../src/components/ui/Sheet';
import { PulseDot } from '../../src/components/ui/Pulse';
import { EmptyState, NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useI18n, useT } from '../../src/i18n';
import { useSession } from '../../src/store/session';
import { useFeedback } from '../../src/lib/feedback';
import {
  CATEGORY_IDS,
  MARKET_LETTER,
  MERCHANT_CATEGORIES,
  PRODUCTS,
  type MerchantCategory,
  type Product,
  type ProductCategory,
} from '../../src/data/products';
import { POINTS_PER_TOKEN } from '../../src/api/endpoints';
import { formatPoints, formatUsd } from '../../src/lib/format';

type Filter = ProductCategory | 'all';

const LETTER_SECTION_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  'cart-outline',
  'cash-outline',
  'construct-outline',
];

/** The site's `.marketplace-img-container` ground — near-black in every theme. */
const IMAGE_GROUND = { dark: '#05070F', red: '#0B0C10' } as const;

/** Localised storefront category names, shared by the chips and the cards. */
function useCategoryLabels(): Record<ProductCategory, string> {
  const t = useT();
  return {
    hardware: t('marketScreen.cat.hardware'),
    merch: t('marketScreen.cat.merch'),
    digital: t('marketScreen.cat.digital'),
    regional: t('marketScreen.cat.regional'),
    vouchers: t('marketScreen.cat.vouchers'),
  };
}

/** The blue-tinted icon tile the site puts in front of every section title. */
function IconTile({
  icon,
  size = 36,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  size?: number;
  color?: string;
}) {
  const { c, radius, alpha } = useTheme();
  const tint = color ?? c.primary;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size >= 44 ? radius.lg : radius.md,
        backgroundColor: alpha(tint, 0.15),
        borderWidth: 1,
        borderColor: alpha(tint, 0.3),
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={Math.round(size * 0.5)} color={tint} />
    </View>
  );
}

/**
 * Marketplace.
 *
 * Browsing and checkout are real UI over a static catalogue: the merchant API
 * does not exist yet, so an order is explicitly simulated and the screen says
 * so up front rather than taking a balance the server would never debit.
 */
export default function MarketScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const { width } = useWindowDimensions();
  const tabInset = useTabContentInset();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const { profile } = useSession();
  const categoryLabels = useCategoryLabels();

  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [letterOpen, setLetterOpen] = useState(false);

  const points = profile?.pointsBalance ?? 0;
  const tokenBalance = points / POINTS_PER_TOKEN;

  // Two columns with the standard gutters; a fixed width (rather than flex)
  // keeps an odd last card at half width instead of stretching across.
  const cardWidth = Math.floor((width - spacing.lg * 2 - spacing.md) / 2);

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

  const counts = useMemo(() => {
    const out: Partial<Record<ProductCategory, number>> = {};
    for (const p of PRODUCTS) out[p.category] = (out[p.category] ?? 0) + 1;
    return out;
  }, []);

  const categories: { value: Filter; label: string; count?: number }[] = [
    { value: 'all', label: t('marketScreen.allItems'), count: PRODUCTS.length },
    ...CATEGORY_IDS.map((id) => ({
      value: id,
      label: categoryLabels[id],
      count: counts[id] ?? 0,
    })),
  ];

  /** The four pillars the ecosystem letter sets out — same wording as web. */
  const pillars: {
    key: string;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    body: string;
  }[] = [
    {
      key: 'regional',
      icon: 'cart-outline',
      title: t('marketScreen.pillar.regionalTitle'),
      body: t('marketScreen.pillar.regionalBody'),
    },
    {
      key: 'payment',
      icon: 'cash-outline',
      title: t('marketScreen.pillar.paymentTitle'),
      body: t('marketScreen.pillar.paymentBody'),
    },
    {
      key: 'merchant',
      icon: 'storefront-outline',
      title: t('marketScreen.pillar.merchantTitle'),
      body: t('marketScreen.pillar.merchantBody'),
    },
    {
      key: 'logistics',
      icon: 'earth-outline',
      title: t('marketScreen.pillar.logisticsTitle'),
      body: t('marketScreen.pillar.logisticsBody'),
    },
  ];

  const clearFilters = () => {
    setQuery('');
    setFilter('all');
  };

  const header = (
    <View style={{ gap: spacing.md }}>
      <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
        {/* ─── Hero — ecosystem chip, title, balance, testnet notice ─── */}
        <Animated.View entering={FadeInDown.duration(280)}>
          <Card glow>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
                flexWrap: 'wrap',
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: radius.pill,
                  backgroundColor: alpha(c.primary, 0.1),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                }}
              >
                <Ionicons name="cart" size={12} color={c.primary} />
                <Text
                  variant="overline"
                  tone="brand"
                  uppercase
                  style={{ fontSize: 10, letterSpacing: 1.4 }}
                >
                  {t('marketScreen.ecosystemUtility')}
                </Text>
              </View>
              <Text variant="caption" tone="gold" mono weight="700" uppercase>
                {t('marketScreen.preview')}
              </Text>
            </View>

            <Text variant="title2" style={{ marginTop: spacing.md }}>
              {t('marketScreen.title')}
            </Text>
            <Text variant="footnote" tone="secondary" style={{ marginTop: 4 }}>
              {t('marketScreen.subtitle')}
            </Text>

            {/* Balance strip */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.md,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: c.dark ? 'rgba(2,6,23,0.7)' : c.surfaceAlt,
                borderWidth: 1,
                borderColor: c.dark ? 'rgba(255,255,255,0.1)' : c.border,
              }}
            >
              <Text variant="caption" tone="tertiary">
                {t('marketScreen.yourBalance')}
              </Text>
              <Text variant="callout" tone="info" mono weight="800">
                ≈ {formatPoints(tokenBalance, 2, locale)} $BONDKOIN
              </Text>
              <Text variant="caption" tone="tertiary" mono style={{ marginLeft: 'auto' }}>
                ({formatPoints(points, 1, locale)} {t('dashboard.pointsShort').toUpperCase()})
              </Text>
            </View>

            {/* Development status */}
            <View
              style={{
                flexDirection: 'row',
                gap: spacing.sm,
                marginTop: spacing.md,
                padding: spacing.md,
                borderRadius: radius.lg,
                backgroundColor: alpha(c.warning, 0.1),
                borderWidth: 1,
                borderColor: alpha(c.warning, 0.3),
              }}
            >
              <Ionicons name="construct" size={16} color={c.warning} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text variant="caption" weight="800" style={{ color: c.warning }}>
                  {t('marketScreen.preview')}
                </Text>
                <Text variant="caption" style={{ color: c.warning, opacity: 0.9 }}>
                  {t('marketScreen.previewBody')}
                </Text>
              </View>
            </View>

            {/* Action bar */}
            <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
              <Button
                label={t('marketScreen.merchantApply')}
                icon="storefront-outline"
                onPress={() => setMerchantOpen(true)}
                style={{ flex: 1 }}
              />
              <Button
                label={t('marketScreen.letterOpen')}
                variant="secondary"
                icon="newspaper-outline"
                onPress={() => setLetterOpen(true)}
                style={{ flex: 1 }}
              />
            </View>
          </Card>
        </Animated.View>

        {/* ─── The four pillars ─── */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {pillars.map((pillar, i) => (
            <Animated.View
              key={pillar.key}
              entering={FadeInDown.delay(80 + i * 50).duration(260)}
              style={{ width: '47%', flexGrow: 1 }}
            >
              <Card elevation={0} style={{ gap: 6, padding: spacing.md, minHeight: 130 }}>
                <IconTile icon={pillar.icon} size={34} />
                <Text
                  variant="caption"
                  weight="800"
                  uppercase
                  style={{ letterSpacing: 1, marginTop: 4 }}
                >
                  {pillar.title}
                </Text>
                <Text variant="caption" tone="tertiary">
                  {pillar.body}
                </Text>
              </Card>
            </Animated.View>
          ))}
        </View>

        {/* ─── Storefront header ─── */}
        <Animated.View
          entering={FadeInDown.delay(280).duration(260)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            paddingTop: spacing.sm,
            paddingBottom: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: c.border,
          }}
        >
          <IconTile icon="bag-handle-outline" size={34} />
          <View style={{ flex: 1 }}>
            <Text variant="headline">{t('marketScreen.allItems')}</Text>
            <Text variant="caption" tone="tertiary">
              {t('marketScreen.subtitle')}
            </Text>
          </View>
          <View
            style={{
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: radius.pill,
              backgroundColor: alpha(c.primary, 0.15),
              borderWidth: 1,
              borderColor: alpha(c.primary, 0.3),
            }}
          >
            <Text variant="caption" tone="info" mono weight="700">
              {t('marketScreen.listings', { n: filtered.length })}
            </Text>
          </View>
        </Animated.View>

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
    </View>
  );

  const footer = (
    <View style={{ paddingHorizontal: spacing.lg, marginTop: spacing.sm }}>
      <Animated.View entering={FadeInDown.delay(120).duration(260)}>
        <Card glow>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <IconTile icon="storefront" size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="headline">{t('marketScreen.merchantTitle')}</Text>
              <Text variant="caption" tone="secondary">
                {t('marketScreen.merchantBody')}
              </Text>
            </View>
          </View>
          <Button
            label={t('marketScreen.merchantApply')}
            icon="arrow-forward"
            onPress={() => setMerchantOpen(true)}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </Card>
      </Animated.View>
    </View>
  );

  return (
    <Screen sunken>
      <NavBar
        title={t('marketScreen.title')}
        subtitle={t('marketScreen.subtitle')}
        onBack={null}
        large
      />

      <FlatList
        data={filtered}
        // Re-key on the filter so the grid's stagger replays when it changes.
        key={filter}
        keyExtractor={(product) => product.id}
        numColumns={2}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInDown.delay(Math.min(index, 8) * 60).duration(300)}
            style={{ width: cardWidth }}
          >
            <ProductCard
              product={item}
              onPress={() => router.push(`/product/${item.id}`)}
            />
          </Animated.View>
        )}
        columnWrapperStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg }}
        contentContainerStyle={{ paddingBottom: tabInset, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState
            icon="search-outline"
            title={t('marketScreen.empty')}
            body={t('marketScreen.emptyBody')}
            action={
              <Button
                label={t('app.clearFilters')}
                variant="ghost"
                onPress={clearFilters}
              />
            }
          />
        }
        ListFooterComponent={footer}
      />

      <LetterSheet visible={letterOpen} onClose={() => setLetterOpen(false)} />
      <MerchantSheet visible={merchantOpen} onClose={() => setMerchantOpen(false)} />
    </Screen>
  );
}

/**
 * A product tile, as the site's: the render on a near-black ground with the
 * pulsing badge and mono category tag, cyan merchant line, amber mono price
 * with "≈ $usd" beneath, emerald stock count and a gradient Buy button.
 */
function ProductCard({
  product,
  onPress,
}: {
  product: Product;
  onPress: () => void;
}) {
  const { c, name, spacing, radius, alpha } = useTheme();
  const { locale } = useI18n();
  const t = useT();
  const feedback = useFeedback();
  const categoryLabels = useCategoryLabels();
  const scale = useSharedValue(1);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const stock =
    product.inStock > 0
      ? t('marketScreen.inStock', { n: product.inStock })
      : t('marketScreen.soldOut');

  const ground = name === 'red' ? IMAGE_GROUND.red : IMAGE_GROUND.dark;

  return (
    <Animated.View style={pressStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${product.name}, ${product.bondkoinPrice} $BONDKOIN, ${product.merchant}`}
        onPressIn={() => {
          scale.value = withSpring(0.975, { damping: 20, stiffness: 320 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        }}
        onPress={() => {
          feedback.select();
          onPress();
        }}
      >
        <Card padded={false} style={{ padding: spacing.sm + 2, overflow: 'hidden' }}>
          {/* Render box */}
          <View
            style={{
              aspectRatio: 16 / 10,
              borderRadius: radius.md,
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
              transition={220}
            />
            {product.badge ? (
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  maxWidth: '85%',
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 5,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: radius.pill,
                  backgroundColor: 'rgba(0,0,0,0.8)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                }}
              >
                <PulseDot color="#FBBF24" size={5} />
                <Text
                  variant="overline"
                  numberOfLines={1}
                  uppercase
                  style={{ color: '#FCD34D', fontSize: 8, letterSpacing: 1, flexShrink: 1 }}
                >
                  {product.badge}
                </Text>
              </View>
            ) : null}
            <View
              style={{
                position: 'absolute',
                bottom: 6,
                right: 6,
                paddingHorizontal: 6,
                paddingVertical: 2,
                borderRadius: radius.sm,
                backgroundColor: 'rgba(0,0,0,0.8)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Text
                variant="caption"
                mono
                weight="700"
                numberOfLines={1}
                style={{ color: '#67E8F9', fontSize: 9 }}
              >
                {categoryLabels[product.category]}
              </Text>
            </View>
          </View>

          <View style={{ paddingTop: spacing.sm + 2, gap: 3 }}>
            {/* Merchant · region */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {product.merchantVerified ? (
                <Ionicons
                  name="checkmark-circle"
                  size={11}
                  color={c.success}
                  accessibilityLabel={t('marketScreen.verified')}
                />
              ) : null}
              <Text
                variant="caption"
                tone="info"
                weight="700"
                numberOfLines={1}
                style={{ flexShrink: 1, fontSize: 10 }}
              >
                {product.merchant}
              </Text>
            </View>
            <Text
              variant="callout"
              weight="700"
              numberOfLines={2}
              style={{ minHeight: 40, marginTop: 2 }}
            >
              {product.name}
            </Text>
            <Text
              variant="caption"
              tone="tertiary"
              numberOfLines={2}
              style={{ fontSize: 11, lineHeight: 15, minHeight: 30 }}
            >
              {product.description}
            </Text>

            {/* Price block */}
            <View
              style={{
                marginTop: spacing.sm,
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: c.border,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <Text variant="headline" mono tone="gold" weight="900">
                  {product.bondkoinPrice}
                </Text>
                <Text variant="caption" tone="info" weight="700" style={{ fontSize: 10 }}>
                  $BONDKOIN
                </Text>
              </View>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 4,
                }}
              >
                <Text variant="caption" tone="tertiary" mono style={{ fontSize: 10 }}>
                  ≈ {formatUsd(product.usdEquivalent, locale)}
                </Text>
                <Text
                  variant="caption"
                  tone={product.inStock > 0 ? 'success' : 'danger'}
                  mono
                  weight="700"
                  numberOfLines={1}
                  style={{ fontSize: 10, flexShrink: 1 }}
                >
                  {stock}
                </Text>
              </View>
              <Text variant="caption" tone="tertiary" mono numberOfLines={1} style={{ fontSize: 10 }}>
                {product.region}
              </Text>
            </View>

            <Button
              label={t('boosters.buy')}
              iconRight="arrow-forward"
              size="sm"
              onPress={onPress}
              fullWidth
              style={{ marginTop: spacing.sm }}
            />
          </View>
        </Card>
      </Pressable>
    </Animated.View>
  );
}

/** The official community announcement, section by section. */
function LetterSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { c, spacing } = useTheme();
  const t = useT();

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('marketScreen.letterTitle')}
      subtitle={t('marketScreen.letterSubtitle')}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: c.border,
        }}
      >
        <Text variant="overline" tone="brand" mono uppercase style={{ flex: 1 }}>
          {t('marketScreen.letterTitle')}
        </Text>
      </View>

      <Text variant="headline">{MARKET_LETTER.greeting}</Text>
      <Text variant="footnote" tone="secondary">
        {MARKET_LETTER.intro}
      </Text>

      {MARKET_LETTER.sections.map((section, index) => (
        <Animated.View
          key={section.title}
          entering={FadeInDown.delay(60 + index * 60).duration(260)}
          style={{ gap: spacing.sm }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <IconTile icon={LETTER_SECTION_ICONS[index] ?? 'document-text-outline'} size={30} />
            <Text
              variant="caption"
              weight="800"
              tone="brand"
              uppercase
              style={{ flex: 1, letterSpacing: 1 }}
            >
              {section.title}
            </Text>
          </View>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 32)} variant="footnote" tone="secondary">
              {paragraph}
            </Text>
          ))}
        </Animated.View>
      ))}

      <Text variant="footnote" weight="700">
        {MARKET_LETTER.closing}
      </Text>
      <Button label={t('app.done')} variant="secondary" onPress={onClose} fullWidth />
    </Sheet>
  );
}

function MerchantSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();
  const feedback = useFeedback();

  const [store, setStore] = useState('');
  const [region, setRegion] = useState('');
  const [category, setCategory] = useState<MerchantCategory | null>(null);
  const [contact, setContact] = useState('');
  const [sent, setSent] = useState(false);

  const categoryLabels: Record<MerchantCategory, string> = {
    electronics: t('marketScreen.merchantCat.electronics'),
    apparel: t('marketScreen.merchantCat.apparel'),
    digital: t('marketScreen.merchantCat.digital'),
    regional: t('marketScreen.merchantCat.regional'),
    giftcards: t('marketScreen.merchantCat.giftcards'),
  };

  const valid = !!(store.trim() && region.trim() && category && contact.trim());

  const reset = () => {
    setStore('');
    setRegion('');
    setCategory(null);
    setContact('');
    setSent(false);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      // Reset once the sheet is off screen, so the form never flashes back
      // into view behind the confirmation during the exit animation.
      onDismiss={() => {
        if (sent) reset();
      }}
      title={sent ? t('marketScreen.merchantDoneTitle') : t('marketScreen.merchantTitle')}
      subtitle={sent ? undefined : t('marketScreen.merchantBody')}
    >
      {sent ? (
        <View style={{ gap: spacing.lg, alignItems: 'center' }}>
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
            {t('marketScreen.merchantDoneBody')}
          </Text>
          <Button label={t('app.done')} onPress={onClose} fullWidth />
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

          {/* Product category — a short radio list, all options visible. */}
          <View>
            <Text
              variant="overline"
              tone="tertiary"
              uppercase
              style={{ marginBottom: 6 }}
            >
              {t('marketScreen.merchantCategory')}
            </Text>
            <View
              accessibilityRole="radiogroup"
              style={{
                borderWidth: 1,
                borderColor: c.border,
                borderRadius: radius.md,
                backgroundColor: c.dark ? 'rgba(2,6,23,0.6)' : c.surface,
                overflow: 'hidden',
              }}
            >
              {MERCHANT_CATEGORIES.map((id, index) => {
                const active = category === id;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: active }}
                    onPress={() => {
                      if (active) return;
                      feedback.select();
                      setCategory(id);
                    }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      minHeight: 44,
                      paddingHorizontal: spacing.md,
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: c.border,
                      backgroundColor: active
                        ? alpha(c.primary, 0.15)
                        : pressed
                          ? c.surfaceAlt
                          : 'transparent',
                    })}
                  >
                    <Ionicons
                      name={active ? 'radio-button-on' : 'radio-button-off'}
                      size={18}
                      color={active ? c.primary : c.textTertiary}
                    />
                    <Text
                      variant="callout"
                      weight={active ? '700' : '500'}
                      tone={active ? 'primary' : 'secondary'}
                    >
                      {categoryLabels[id]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

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
