import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from 'react-native-reanimated';

import { Text } from '../src/components/ui/Text';
import { Card } from '../src/components/ui/Card';
import { Button, IconButton } from '../src/components/ui/Button';
import { PulseDot } from '../src/components/ui/Pulse';
import { EmptyState, NavBar, Screen } from '../src/components/ui/Chrome';
import { useTheme } from '../src/theme/ThemeProvider';
import { useI18n, useT } from '../src/i18n';
import { useNotifications, type NotificationItem } from '../src/store/notifications';
import { useSettings } from '../src/store/settings';
import { useFeedback } from '../src/lib/feedback';
import { getPermissionState, requestPermission, type PermissionState } from '../src/lib/push';
import { relativeTime } from '../src/lib/format';

const KIND_ICON: Record<NotificationItem['kind'], keyof typeof Ionicons.glyphMap> = {
  MINING_READY: 'flash',
  MINED: 'flash',
  TASK_READY: 'gift',
  BOOSTER_ACTIVE: 'rocket',
  BOOSTER_EXPIRING: 'alarm',
  WITHDRAWAL: 'arrow-up-circle',
  KYC: 'shield-checkmark',
  SUPPORT: 'chatbubbles',
  REFERRAL: 'people',
  TIER: 'ribbon',
  ANNOUNCEMENT: 'megaphone',
};

/**
 * Notification centre.
 *
 * Entries are derived on-device from what changed between refreshes (see
 * `store/notifications`), so the list works without a notifications API and
 * without asking for OS permission — permission only adds the ability to be
 * told while the app is closed, and is prompted for here, in context.
 */
export default function NotificationsScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const { locale } = useI18n();
  const router = useRouter();
  const feedback = useFeedback();

  const { items, unreadCount, markRead, markAllRead, clear, remove } =
    useNotifications();
  const { settings } = useSettings();

  const [permission, setPermission] = useState<PermissionState>('granted');

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  const open = (item: NotificationItem) => {
    markRead(item.id);
    if (item.href) router.push(item.href as never);
  };

  return (
    <Screen>
      {/* Presented as a sheet, so it closes from the trailing edge, not a back chevron. */}
      <NavBar
        title={t('notify.title')}
        subtitle={unreadCount > 0 ? t('notify.unread', { n: unreadCount }) : undefined}
        onBack={null}
        transparent
        right={
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <IconButton
              icon="options-outline"
              accessibilityLabel={t('notify.settingsTitle')}
              onPress={() => router.push('/settings/notifications')}
            />
            <IconButton
              icon="close"
              accessibilityLabel={t('app.close')}
              onPress={() => router.back()}
            />
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.md,
        }}
      >
        {/* Permission prompt — only when it would actually change something. */}
        {permission !== 'granted' && settings.notifications.enabled ? (
          <Animated.View entering={FadeInDown.duration(260)}>
            <Card glow>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <View
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: radius.md,
                    backgroundColor: alpha(c.primary, 0.15),
                    borderWidth: 1,
                    borderColor: alpha(c.primary, 0.3),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="notifications" size={21} color={c.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="headline">{t('notify.permissionTitle')}</Text>
                  <Text variant="caption" tone="secondary">
                    {permission === 'denied'
                      ? t('notify.permissionDenied')
                      : t('notify.permissionBody')}
                  </Text>
                </View>
              </View>
              <Button
                label={
                  permission === 'denied'
                    ? t('notify.openSystemSettings')
                    : t('notify.permissionCta')
                }
                onPress={async () => {
                  if (permission === 'denied') {
                    await Linking.openSettings().catch(() => {});
                    return;
                  }
                  const granted = await requestPermission();
                  setPermission(granted ? 'granted' : 'denied');
                  if (granted) feedback.success();
                }}
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </Card>
          </Animated.View>
        ) : null}

        {items.length === 0 ? (
          <Card>
            <EmptyState
              icon="notifications-off-outline"
              title={t('notify.empty')}
              body={t('notify.emptyBody')}
            />
          </Card>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: spacing.lg,
                paddingHorizontal: spacing.xs,
              }}
            >
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {unreadCount > 0 ? <PulseDot color={c.primary} size={6} /> : null}
                <Text variant="overline" tone="tertiary" uppercase>
                  {unreadCount > 0 ? t('notify.unread', { n: unreadCount }) : t('notify.title')}
                </Text>
              </View>
              {unreadCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    feedback.select();
                    markAllRead();
                  }}
                  style={{ minHeight: 32, justifyContent: 'center' }}
                >
                  <Text variant="footnote" tone="brand" weight="700">
                    {t('notify.markAllRead')}
                  </Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => {
                  feedback.select();
                  clear();
                }}
                style={{ minHeight: 32, justifyContent: 'center' }}
              >
                <Text variant="footnote" tone="danger" weight="700">
                  {t('notify.clearAll')}
                </Text>
              </Pressable>
            </View>

            {items.map((item, i) => (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(Math.min(i, 10) * 40).duration(260)}
                exiting={FadeOut.duration(160)}
                layout={LinearTransition.springify()}
              >
                <NotificationRow
                  item={item}
                  onPress={() => open(item)}
                  onDismiss={() => {
                    feedback.select();
                    remove(item.id);
                  }}
                  relative={relativeTime(item.createdAt, t, locale)}
                />
              </Animated.View>
            ))}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function NotificationRow({
  item,
  onPress,
  onDismiss,
  relative,
}: {
  item: NotificationItem;
  onPress: () => void;
  onDismiss: () => void;
  relative: string;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const t = useT();

  const tint = {
    info: c.primary,
    success: c.success,
    warning: c.gold,
    danger: c.danger,
  }[item.tone];

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={item.title}
      glow={!item.read}
      accent={item.read ? undefined : alpha(tint, c.dark ? 0.45 : 0.6)}
    >
      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <View
          style={{
            width: 38,
            height: 38,
            borderRadius: radius.md,
            backgroundColor: alpha(tint, 0.15),
            borderWidth: 1,
            borderColor: alpha(tint, 0.3),
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={KIND_ICON[item.kind]} size={18} color={tint} />
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              variant="headline"
              weight={item.read ? '600' : '800'}
              style={{ flex: 1 }}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            {!item.read ? <PulseDot color={tint} size={8} /> : null}
          </View>
          <Text variant="footnote" tone="secondary">
            {item.body}
          </Text>
          <Text variant="caption" tone="tertiary" mono style={{ marginTop: 2, fontSize: 10 }}>
            {relative}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('app.dismiss')}
          onPress={onDismiss}
          // A full 44pt target, pulled into the card's padding so the glyph
          // still sits in the corner.
          style={({ pressed }) => ({
            opacity: pressed ? 0.4 : 1,
            width: 44,
            height: 44,
            marginTop: -spacing.md,
            marginRight: -spacing.md,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Ionicons name="close" size={16} color={c.textTertiary} />
        </Pressable>
      </View>
    </Card>
  );
}
