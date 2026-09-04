import React, { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Badge } from '../src/components/ui/Badge';
import { Button } from '../src/components/ui/Button';
import { Chips } from '../src/components/ui/Segmented';
import { Input } from '../src/components/ui/Input';
import { Sheet } from '../src/components/ui/Sheet';
import { PulseDot } from '../src/components/ui/Pulse';
import {
  EmptyState,
  ErrorNote,
  NavBar,
  Screen,
  Skeleton,
} from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useToast } from '../src/components/ui/Toast';
import { useFeedback } from '../src/lib/feedback';
import { useAsyncData } from '../src/lib/hooks';
import { getReferralStats, type ReferralStatsResponse } from '../src/api/endpoints';
import { errorMessage, WEB_URL } from '../src/api/client';
import { countryFlag, formatDate, relativeTime } from '../src/lib/format';

type RosterFilter = 'ALL' | 'ACTIVE' | 'IDLE';

/** Tier names, matching the web app's ladder. */
const TIER_NAMES = [
  'Free Miner',
  'Bronze Scout',
  'Silver Leader',
  'Gold Master',
  'Platinum Syndicate',
  'Cyber Sovereign',
];

/** The web's share-button tints: Telegram sky, X slate, WhatsApp emerald. */
const TELEGRAM = '#38BDF8';
const WHATSAPP = '#25D366';

/**
 * The referral network.
 *
 * Invites do not pay a commission — they raise a multiplier on everything the
 * miner earns. The tier ladder is shown in full so the next rung, and what it
 * is worth, is never a mystery.
 */
export default function ReferralsScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const toast = useToast();
  const feedback = useFeedback();

  const load = useCallback(() => getReferralStats(), []);
  const toMessage = useCallback(
    (err: unknown) => errorMessage(err, t('app.offline')),
    [t],
  );
  const { data: stats, error, loading, refreshing, reload } =
    useAsyncData<ReferralStatsResponse>(load, toMessage);

  const [filter, setFilter] = useState<RosterFilter>('ALL');
  const [query, setQuery] = useState('');
  const [qrOpen, setQrOpen] = useState(false);

  const code = stats?.referralCode ?? '';
  const link = `${WEB_URL}/${locale}/login?ref=${code}&mode=register`;

  const roster = useMemo(() => {
    const list = stats?.referralsList ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((member) => {
      if (filter === 'ACTIVE' && !member.isMiningActive) return false;
      if (filter === 'IDLE' && member.isMiningActive) return false;
      if (!q) return true;
      return member.maskedEmail.toLowerCase().includes(q);
    });
  }, [stats, filter, query]);

  const share = async () => {
    if (!code) return;
    feedback.press();
    try {
      await Share.share({
        title: t('referralsScreen.shareTitle'),
        message: t('referralsScreen.shareMessage', { code, link }),
      });
    } catch {
      /* the user dismissed the share sheet */
    }
  };

  /** The same deep links the website's share buttons open. */
  const shareTo = (target: 'telegram' | 'x' | 'whatsapp') => {
    if (!code) return;
    feedback.press();
    const message = t('referralsScreen.shareMessage', { code, link });
    const url =
      target === 'telegram'
        ? `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`
        : target === 'x'
          ? `https://x.com/intent/post?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}&hashtags=BONDKOIN,BNBChain`
          : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    void Linking.openURL(url).catch(() => void share());
  };

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    feedback.success();
    toast.success(t('app.copied'));
  };

  const idleCount =
    (stats?.totalInvited ?? 0) - (stats?.activeMinersCount ?? 0);
  const hasNetwork = (stats?.totalInvited ?? 0) > 0;
  const topTierLevel = stats?.allTiers[stats.allTiers.length - 1]?.level;
  const tierName = stats ? TIER_NAMES[stats.currentTier.level - 1] ?? '' : '';

  return (
    <Screen>
      <NavBar title={t('referrals.title')} subtitle={t('referrals.subtitle')} large transparent />

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
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {error ? (
            <ErrorNote message={error} onRetry={() => void reload()} retryLabel={t('app.retry')} />
          ) : null}

          {/* ── Invite card — the web's amber-ringed hero ── */}
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow accent={alpha(c.gold, c.dark ? 0.4 : 0.6)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.sm,
                }}
              >
                <Text variant="overline" tone="tertiary" uppercase>
                  {t('referrals.code')}
                </Text>
                {stats ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 9,
                      paddingVertical: 3,
                      borderRadius: radius.pill,
                      borderWidth: 1,
                      borderColor: alpha(c.gold, 0.4),
                      backgroundColor: alpha(c.gold, 0.15),
                    }}
                  >
                    <PulseDot color={c.success} size={6} />
                    <Text variant="caption" mono weight="700" tone="gold" style={{ fontSize: 10 }}>
                      {tierName} · ×{stats.currentTier.multiplier}
                    </Text>
                  </View>
                ) : null}
              </View>

              {loading ? (
                <Skeleton height={48} style={{ marginTop: spacing.md }} />
              ) : (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.sm,
                    marginTop: spacing.md,
                    padding: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.dark ? 'rgba(255,255,255,0.04)' : c.surfaceAlt,
                  }}
                >
                  <Text variant="title3" mono tone="gold" selectable style={{ flex: 1 }} numberOfLines={1}>
                    {code || '—'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('app.copy')}
                    disabled={!code}
                    hitSlop={8}
                    onPress={() => void copy(code)}
                    style={({ pressed }) => ({
                      minHeight: 34,
                      paddingHorizontal: 12,
                      justifyContent: 'center',
                      borderRadius: radius.sm,
                      backgroundColor: alpha(c.gold, 0.2),
                      opacity: !code ? 0.4 : pressed ? 0.7 : 1,
                    })}
                  >
                    <Text variant="caption" weight="700" tone="gold">
                      {t('app.copy')}
                    </Text>
                  </Pressable>
                </View>
              )}

              <Text variant="overline" tone="tertiary" uppercase style={{ marginTop: spacing.md }}>
                {t('referrals.yourLink')}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 }}>
                <View
                  style={{
                    flex: 1,
                    minHeight: 44,
                    justifyContent: 'center',
                    paddingHorizontal: spacing.md,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    borderColor: c.border,
                    backgroundColor: c.dark ? alpha(c.bg, 0.7) : c.surfaceAlt,
                  }}
                >
                  <Text variant="caption" mono tone="secondary" numberOfLines={1} selectable>
                    {code ? link : '—'}
                  </Text>
                </View>
                <Button
                  label={t('referrals.copyLink')}
                  size="sm"
                  disabled={!code}
                  onPress={() => void copy(link)}
                />
              </View>

              <Button
                label={t('referrals.share')}
                icon="share-social-outline"
                onPress={() => void share()}
                disabled={!code}
                fullWidth
                style={{ marginTop: spacing.md }}
              />

              {/* The web's four share tiles */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }}>
                <ShareTile
                  label={t('referrals.shareTelegram')}
                  icon="paper-plane-outline"
                  tint={TELEGRAM}
                  disabled={!code}
                  onPress={() => shareTo('telegram')}
                />
                <ShareTile
                  label={t('referrals.shareTwitter')}
                  icon="logo-twitter"
                  tint={c.textPrimary}
                  neutral
                  disabled={!code}
                  onPress={() => shareTo('x')}
                />
                <ShareTile
                  label={t('referrals.shareWhatsApp')}
                  icon="logo-whatsapp"
                  tint={WHATSAPP}
                  disabled={!code}
                  onPress={() => shareTo('whatsapp')}
                />
                <ShareTile
                  label={t('referrals.qrCode')}
                  icon="qr-code-outline"
                  tint={c.textSecondary}
                  neutral
                  disabled={!code}
                  onPress={() => {
                    feedback.press();
                    setQrOpen(true);
                  }}
                />
              </View>
            </Card>
          </Animated.View>

          {/* ── Network overview — the web's four stat tiles ── */}
          <Animated.View
            entering={FadeInDown.delay(40).duration(260)}
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}
          >
            <StatTile
              emoji="👥"
              label={t('referrals.totalInvited')}
              value={stats ? String(stats.totalInvited) : '—'}
              chip={{ label: t('referrals.invitesCount'), tint: c.primary }}
            />
            <StatTile
              emoji="⚡"
              label={t('referrals.activeMiners')}
              value={stats ? String(stats.activeMinersCount) : '—'}
              tone="success"
              pulse
            />
            <StatTile
              emoji="🔥"
              label={t('referrals.multiplier')}
              value={stats ? `×${stats.currentTier.multiplier}` : '—'}
              tone="gold"
              chip={stats ? { label: `L${stats.currentTier.level}`, tint: c.gold } : undefined}
            />
            <StatTile
              emoji="👑"
              label={t('referrals.currentTier')}
              value={stats ? tierName : '—'}
              small
              chip={stats ? { label: `Tier ${stats.currentTier.level}`, tint: c.info } : undefined}
            />
          </Animated.View>

          {/* ── Tier progression ── */}
          {stats ? (
            <Animated.View entering={FadeInDown.delay(80).duration(260)}>
              <Card>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: spacing.sm,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="title3">{t('referrals.tierProgression')}</Text>
                    <Text variant="caption" tone="tertiary">
                      {t('referrals.nextTier')}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: alpha(c.gold, 0.3),
                      backgroundColor: alpha(c.gold, 0.1),
                    }}
                  >
                    <Text variant="caption" mono weight="700" tone="gold">
                      L{stats.currentTier.level} · ×{stats.currentTier.multiplier}
                    </Text>
                  </View>
                </View>

                {stats.nextTier ? (
                  <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text variant="caption" tone="tertiary" weight="700">
                        {tierName}
                      </Text>
                      <Text variant="caption" tone="gold" weight="700" mono>
                        {Math.round(Math.min(100, Math.max(0, stats.progressToNextPercent)))}%
                      </Text>
                      <Text variant="caption" tone="tertiary" weight="700">
                        {TIER_NAMES[stats.nextTier.level - 1] ?? `Tier ${stats.nextTier.level}`}
                      </Text>
                    </View>
                    <View
                      accessible
                      accessibilityRole="progressbar"
                      accessibilityLabel={t('referrals.tierProgression')}
                      accessibilityValue={{
                        min: 0,
                        max: 100,
                        now: Math.round(
                          Math.min(100, Math.max(0, stats.progressToNextPercent)),
                        ),
                      }}
                      style={{
                        height: 12,
                        padding: 2,
                        borderRadius: 6,
                        backgroundColor: c.dark ? alpha(c.bg, 0.8) : c.surfaceAlt,
                        borderWidth: 1,
                        borderColor: c.border,
                        overflow: 'hidden',
                      }}
                    >
                      <LinearGradient
                        colors={[c.gold, c.success]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{
                          height: '100%',
                          width: `${Math.max(3, stats.progressToNextPercent)}%`,
                          borderRadius: 4,
                        }}
                      />
                    </View>
                    <Text variant="footnote" tone="secondary">
                      {t('referralsScreen.nextTier', {
                        n: stats.invitesNeededForNext,
                        level: stats.nextTier.level,
                        multiplier: stats.nextTier.multiplier,
                      })}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      marginTop: spacing.md,
                      padding: spacing.md,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: alpha(c.success, 0.25),
                      backgroundColor: alpha(c.success, 0.1),
                    }}
                  >
                    <Ionicons name="trophy" size={16} color={c.success} />
                    <Text variant="footnote" tone="success" weight="600" style={{ flex: 1 }}>
                      {t('referralsScreen.maxTier')}
                    </Text>
                  </View>
                )}

                {/* The full ladder — the web's six tier cards */}
                <View style={{ marginTop: spacing.lg, gap: spacing.sm }}>
                  {stats.allTiers.map((tier, i) => {
                    const current = tier.level === stats.currentTier.level;
                    const unlocked = stats.currentTier.level >= tier.level;
                    const top = tier.level === topTierLevel;
                    const required =
                      tier.minInvites === 0
                        ? '0'
                        : top
                          ? `${tier.minInvites}+`
                          : `${tier.minInvites}–${tier.maxInvites}`;
                    return (
                      <Animated.View
                        key={tier.level}
                        entering={FadeInDown.delay(120 + i * 40).duration(260)}
                      >
                        <TierCard
                          level={tier.level}
                          name={TIER_NAMES[tier.level - 1] ?? `Tier ${tier.level}`}
                          multiplier={tier.multiplier}
                          required={`${required} ${t('referrals.invitesCount').toLowerCase()}`}
                          state={current ? 'current' : unlocked ? 'unlocked' : 'locked'}
                        />
                      </Animated.View>
                    );
                  })}
                </View>
              </Card>
            </Animated.View>
          ) : loading ? (
            <Skeleton height={220} radius={radius.xl} />
          ) : null}

          {/* ── Roster ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(260)} style={{ gap: spacing.sm }}>
            <View style={{ paddingHorizontal: spacing.xs }}>
              <Text variant="overline" tone="tertiary" uppercase>
                {t('referralsScreen.rosterTitle')}
              </Text>
            </View>
            <Input
              icon="search"
              placeholder={t('app.search')}
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
          </Animated.View>
        </View>

        <Chips
          options={[
            { value: 'ALL', label: t('referralsScreen.filterAll'), count: stats?.totalInvited },
            {
              value: 'ACTIVE',
              label: t('referralsScreen.filterActive'),
              count: stats?.activeMinersCount,
            },
            {
              value: 'IDLE',
              label: t('referralsScreen.filterIdle'),
              count: stats ? idleCount : undefined,
            },
          ]}
          value={filter}
          onChange={setFilter}
          style={{ paddingLeft: spacing.lg }}
        />

        <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md }}>
          {loading ? (
            <Skeleton height={150} radius={radius.xl} />
          ) : !hasNetwork ? (
            <Card>
              <EmptyState
                icon="person-add-outline"
                title={t('referralsScreen.rosterEmpty')}
                action={
                  <Button
                    label={t('referralsScreen.inviteCta')}
                    icon="share-social-outline"
                    onPress={() => void share()}
                    disabled={!code}
                  />
                }
              />
            </Card>
          ) : roster.length === 0 ? (
            <Card>
              <EmptyState icon="search-outline" title={t('referralsScreen.noMatches')} />
            </Card>
          ) : (
            <Card padded={false} style={{ paddingHorizontal: spacing.lg }}>
              {roster.map((member, i) => {
                const status = member.isMiningActive
                  ? t('referrals.active')
                  : t('referrals.idle');
                const detail = member.lastMineAt
                  ? t('referralsScreen.lastMined', {
                      time: relativeTime(member.lastMineAt, t, locale),
                    })
                  : formatDate(member.joinedAt, locale);
                return (
                  <Animated.View
                    key={member.id}
                    entering={FadeInDown.delay(Math.min(i, 10) * 30).duration(240)}
                    accessible
                    accessibilityLabel={`${member.maskedEmail}, ${status}, ${detail}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.md,
                      paddingVertical: spacing.md,
                      borderBottomWidth: i === roster.length - 1 ? 0 : 1,
                      borderBottomColor: c.border,
                    }}
                  >
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: radius.md,
                        backgroundColor: member.isMiningActive
                          ? alpha(c.success, 0.15)
                          : alpha(c.primary, 0.15),
                        borderWidth: 1,
                        borderColor: member.isMiningActive
                          ? alpha(c.success, 0.3)
                          : alpha(c.primary, 0.3),
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Ionicons
                        name={member.isMiningActive ? 'flash' : 'moon-outline'}
                        size={15}
                        color={member.isMiningActive ? c.success : c.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="callout" mono weight="700" numberOfLines={1}>
                        {member.maskedEmail}
                      </Text>
                      <Text variant="caption" tone="tertiary" numberOfLines={1}>
                        {member.countryCode === 'GLOBAL'
                          ? '🌐'
                          : countryFlag(member.countryCode)}{' '}
                        {detail}
                      </Text>
                    </View>
                    <Badge
                      label={status}
                      tone={member.isMiningActive ? 'success' : 'neutral'}
                      dot
                    />
                  </Animated.View>
                );
              })}
            </Card>
          )}

          {/* ── Integrity note ── */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: radius.sm,
                  backgroundColor: alpha(c.primary, 0.15),
                  borderWidth: 1,
                  borderColor: alpha(c.primary, 0.3),
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="shield-checkmark-outline" size={15} color={c.primary} />
              </View>
              <Text variant="callout" weight="700" style={{ flex: 1 }}>
                {t('referrals.integrityTitle')}
              </Text>
            </View>
            <Text variant="caption" tone="tertiary" style={{ marginTop: spacing.sm }}>
              {t('referrals.integrityBody')}
            </Text>
          </Card>
        </View>
      </ScrollView>

      <Sheet
        visible={qrOpen}
        onClose={() => setQrOpen(false)}
        title={t('referrals.qrCode')}
        subtitle={t('referrals.scanToJoin')}
        scrollable={false}
      >
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <View
            accessible
            accessibilityLabel={t('referrals.qrCode')}
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              backgroundColor: '#FFFFFF',
            }}
          >
            <QRCode value={link} size={200} backgroundColor="#FFFFFF" color="#030714" />
          </View>
          <Text variant="footnote" tone="secondary" center>
            {t('referralsScreen.qrBody')}
          </Text>
          <Text variant="caption" mono tone="tertiary" center selectable>
            {link}
          </Text>
          <Button
            label={t('referrals.copyLink')}
            icon="link-outline"
            variant="secondary"
            onPress={() => void copy(link)}
            disabled={!code}
          />
        </View>
      </Sheet>
    </Screen>
  );
}

/* ───────────────────────────── Pieces ───────────────────────────── */

/** One of the web's tinted share buttons — half width, icon + label. */
function ShareTile({
  label,
  icon,
  tint,
  neutral,
  disabled,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  /** Slate rather than tinted (X, QR). */
  neutral?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        width: '48%',
        flexGrow: 1,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: neutral ? c.borderStrong : alpha(tint, 0.35),
        backgroundColor: neutral ? c.surfaceAlt : alpha(tint, 0.12),
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Ionicons name={icon} size={15} color={neutral ? c.textPrimary : tint} />
      <Text
        variant="caption"
        weight="700"
        numberOfLines={1}
        style={{ color: neutral ? c.textPrimary : tint }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Emoji, mono figure, label — the web's network-overview tile. */
function StatTile({
  emoji,
  label,
  value,
  tone = 'primary',
  chip,
  pulse,
  small,
}: {
  emoji: string;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'gold';
  chip?: { label: string; tint: string };
  pulse?: boolean;
  /** Text rather than a number (the tier name). */
  small?: boolean;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  return (
    <Card style={{ width: '48%', flexGrow: 1 }} padded={false}>
      <View style={{ padding: spacing.md, gap: 4 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Text style={{ fontSize: 22, lineHeight: 28 }}>{emoji}</Text>
          {pulse ? (
            <PulseDot color={c.success} size={8} />
          ) : chip ? (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: radius.pill,
                backgroundColor: alpha(chip.tint, 0.12),
              }}
            >
              <Text
                variant="caption"
                mono
                weight="700"
                numberOfLines={1}
                style={{ color: chip.tint, fontSize: 10 }}
              >
                {chip.label}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          variant={small ? 'headline' : 'title1'}
          mono={!small}
          tone={tone}
          numberOfLines={1}
          style={{ marginTop: 6 }}
        >
          {value}
        </Text>
        <Text variant="caption" tone="tertiary" weight="600" numberOfLines={2}>
          {label}
        </Text>
      </View>
    </Card>
  );
}

/** One rung of the ladder: current (amber), unlocked (emerald), locked (dim). */
function TierCard({
  level,
  name,
  multiplier,
  required,
  state,
}: {
  level: number;
  name: string;
  multiplier: number;
  required: string;
  state: 'current' | 'unlocked' | 'locked';
}) {
  const { c, spacing, radius, alpha, glow } = useTheme();
  const t = useT();

  const border =
    state === 'current'
      ? c.gold
      : state === 'unlocked'
        ? alpha(c.success, 0.3)
        : c.border;

  return (
    <View
      style={{
        borderRadius: radius.lg,
        borderWidth: state === 'current' ? 2 : 1,
        borderColor: border,
        padding: spacing.md,
        overflow: 'hidden',
        backgroundColor: c.dark ? alpha(c.bg, state === 'locked' ? 0.4 : 0.7) : c.surfaceAlt,
        opacity: state === 'locked' ? 0.6 : 1,
        ...(state === 'current' && c.dark ? glow(c.gold, 1) : null),
      }}
    >
      {state === 'current' ? (
        <LinearGradient
          pointerEvents="none"
          colors={[alpha(c.gold, 0.15), 'transparent']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Text variant="caption" mono tone="tertiary" weight="700">
          Tier {level}
        </Text>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor:
              state === 'current'
                ? c.gold
                : state === 'unlocked'
                  ? alpha(c.success, 0.2)
                  : c.surfaceAlt,
          }}
        >
          <Text
            variant="overline"
            style={{
              fontSize: 9,
              lineHeight: 12,
              color:
                state === 'current'
                  ? c.onGold
                  : state === 'unlocked'
                    ? c.success
                    : c.textTertiary,
            }}
          >
            {state === 'current'
              ? t('referrals.currentTier')
              : state === 'unlocked'
                ? t('referrals.unlocked')
                : t('referrals.locked')}
          </Text>
        </View>
      </View>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginTop: 6,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text variant="headline" numberOfLines={1}>
            {name}
          </Text>
          <Text variant="caption" tone="tertiary" mono numberOfLines={1}>
            {required}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons
            name={state === 'locked' ? 'lock-closed' : 'lock-open'}
            size={13}
            color={state === 'locked' ? c.textTertiary : c.success}
          />
          <Text variant="title3" mono tone={state === 'locked' ? 'secondary' : 'gold'}>
            ×{multiplier}
          </Text>
        </View>
      </View>
    </View>
  );
}
