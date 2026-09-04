import React, { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '../../src/components/ui/Text';
import { Card, SectionLabel } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { ListGroup, ListRow } from '../../src/components/ui/ListRow';
import { Sheet } from '../../src/components/ui/Sheet';
import { PulseDot } from '../../src/components/ui/Pulse';
import { NavBar, Screen } from '../../src/components/ui/Chrome';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useT } from '../../src/i18n';
import { formatMinute, useSettings } from '../../src/store/settings';
import { useToast } from '../../src/components/ui/Toast';
import { useFeedback } from '../../src/lib/feedback';
import {
  cancelAll,
  getPermissionState,
  presentNow,
  requestPermission,
  type PermissionState,
} from '../../src/lib/push';

/**
 * Notification preferences.
 *
 * Every category can be turned off individually, and the master switch cancels
 * everything already scheduled rather than merely stopping new ones — a switch
 * that leaves yesterday's alarms armed is not off.
 */
export default function NotificationSettingsScreen() {
  const { c, spacing, radius, alpha } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const toast = useToast();
  const feedback = useFeedback();
  const { settings, updateNotifications, updateQuietHours } = useSettings();

  const [permission, setPermission] = useState<PermissionState>('undetermined');
  const [editingQuiet, setEditingQuiet] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    void getPermissionState().then(setPermission);
  }, []);

  const prefs = settings.notifications;
  const master = prefs.enabled;

  const toggleMaster = async (enabled: boolean) => {
    updateNotifications({ enabled });
    if (!enabled) {
      await cancelAll();
      return;
    }
    if (permission !== 'granted') {
      const granted = await requestPermission();
      setPermission(granted ? 'granted' : 'denied');
    }
  };

  let order = 0;
  const enter = () => FadeInDown.delay(order++ * 40).duration(260);

  return (
    <Screen>
      <NavBar title={t('notify.settingsTitle')} transparent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: insets.bottom + spacing.xxxl,
          gap: spacing.lg,
        }}
      >
        {/* System permission state — amber, like the site's warning panels */}
        {permission !== 'granted' ? (
          <Animated.View entering={enter()}>
            <Card accent={alpha(c.gold, c.dark ? 0.35 : 0.5)}>
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: radius.md,
                    backgroundColor: alpha(c.gold, 0.15),
                    borderWidth: 1,
                    borderColor: alpha(c.gold, 0.3),
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name="notifications-off" size={20} color={c.gold} />
                </View>
                <Text variant="footnote" tone="secondary" style={{ flex: 1 }}>
                  {permission === 'denied'
                    ? t('notify.permissionDenied')
                    : t('notify.permissionBody')}
                </Text>
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

        <Animated.View entering={enter()}>
          <ListGroup>
            <ListRow
              icon="notifications-outline"
              tone="brand"
              title={t('notify.master')}
              subtitle={t('notify.masterBody')}
              toggle={{ value: master, onChange: (v) => void toggleMaster(v) }}
            />
          </ListGroup>
          {master && permission === 'granted' ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginTop: spacing.sm,
                paddingHorizontal: spacing.xs,
              }}
            >
              <PulseDot color={c.success} size={6} />
              <Text variant="caption" mono tone="success" style={{ fontSize: 10 }}>
                {t('app.enabled').toUpperCase()}
              </Text>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={enter()}>
          <SectionLabel>{t('notify.title')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="flash-outline"
              tone="warning"
              title={t('notify.miningReady')}
              subtitle={t('notify.miningReadyBody')}
              disabled={!master}
              toggle={{
                value: prefs.miningReady,
                disabled: !master,
                onChange: (miningReady) => updateNotifications({ miningReady }),
              }}
            />
            <ListRow
              icon="gift-outline"
              title={t('notify.tasks')}
              subtitle={t('notify.tasksBody')}
              disabled={!master}
              toggle={{
                value: prefs.tasks,
                disabled: !master,
                onChange: (tasks) => updateNotifications({ tasks }),
              }}
            />
            <ListRow
              icon="rocket-outline"
              tone="brand"
              title={t('notify.boosters')}
              subtitle={t('notify.boostersBody')}
              disabled={!master}
              toggle={{
                value: prefs.boosters,
                disabled: !master,
                onChange: (boosters) => updateNotifications({ boosters }),
              }}
            />
            <ListRow
              icon="arrow-up-circle-outline"
              tone="success"
              title={t('notify.withdrawals')}
              subtitle={t('notify.withdrawalsBody')}
              disabled={!master}
              toggle={{
                value: prefs.withdrawals,
                disabled: !master,
                onChange: (withdrawals) => updateNotifications({ withdrawals }),
              }}
            />
            <ListRow
              icon="chatbubbles-outline"
              title={t('notify.support')}
              subtitle={t('notify.supportBody')}
              disabled={!master}
              toggle={{
                value: prefs.support,
                disabled: !master,
                onChange: (support) => updateNotifications({ support }),
              }}
            />
            <ListRow
              icon="people-outline"
              title={t('notify.referrals')}
              subtitle={t('notify.referralsBody')}
              disabled={!master}
              toggle={{
                value: prefs.referrals,
                disabled: !master,
                onChange: (referrals) => updateNotifications({ referrals }),
              }}
            />
            <ListRow
              icon="megaphone-outline"
              title={t('notify.announcements')}
              subtitle={t('notify.announcementsBody')}
              disabled={!master}
              toggle={{
                value: prefs.announcements,
                disabled: !master,
                onChange: (announcements) => updateNotifications({ announcements }),
              }}
            />
          </ListGroup>
        </Animated.View>

        {/* Quiet hours */}
        <Animated.View entering={enter()}>
          <SectionLabel>{t('notify.quietHours')}</SectionLabel>
          <ListGroup>
            <ListRow
              icon="moon-outline"
              title={t('notify.quietHours')}
              subtitle={t('notify.quietHoursBody')}
              disabled={!master}
              toggle={{
                value: settings.quietHours.enabled,
                disabled: !master,
                onChange: (enabled) => updateQuietHours({ enabled }),
              }}
            />
            <ListRow
              title={t('notify.quietFrom')}
              value={formatMinute(settings.quietHours.startMinute)}
              disabled={!master || !settings.quietHours.enabled}
              onPress={() => setEditingQuiet('start')}
            />
            <ListRow
              title={t('notify.quietTo')}
              value={formatMinute(settings.quietHours.endMinute)}
              disabled={!master || !settings.quietHours.enabled}
              onPress={() => setEditingQuiet('end')}
            />
          </ListGroup>
        </Animated.View>

        <Animated.View entering={enter()}>
          <Button
            label={t('notify.test')}
            variant="secondary"
            icon="send-outline"
            disabled={!master || permission !== 'granted'}
            onPress={async () => {
              await presentNow(t('notify.miningReadyTitle'), t('notify.miningReadyMessage'), {
                href: '/',
              });
              toast.success(t('notify.testSent'));
            }}
            fullWidth
          />
        </Animated.View>
      </ScrollView>

      <HourPicker
        visible={editingQuiet !== null}
        title={editingQuiet === 'start' ? t('notify.quietFrom') : t('notify.quietTo')}
        value={
          editingQuiet === 'start'
            ? settings.quietHours.startMinute
            : settings.quietHours.endMinute
        }
        onClose={() => setEditingQuiet(null)}
        onSelect={(minute) => {
          if (editingQuiet === 'start') updateQuietHours({ startMinute: minute });
          else updateQuietHours({ endMinute: minute });
          setEditingQuiet(null);
        }}
      />
    </Screen>
  );
}

/**
 * Hour-of-day picker.
 *
 * Half-hour granularity in a plain grid: a full time picker is more precision
 * than "don't wake me at night" needs, and this works identically on both
 * platforms.
 */
function HourPicker({
  visible,
  title,
  value,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  value: number;
  onClose: () => void;
  onSelect: (minute: number) => void;
}) {
  const { c, spacing, radius, alpha } = useTheme();
  const feedback = useFeedback();

  const slots = Array.from({ length: 48 }, (_, i) => i * 30);

  return (
    <Sheet visible={visible} onClose={onClose} title={title} maxHeight={0.7}>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: spacing.sm,
          justifyContent: 'center',
        }}
      >
        {slots.map((minute) => {
          const active = minute === value;
          return (
            <Pressable
              key={minute}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => {
                feedback.select();
                onSelect(minute);
              }}
              style={({ pressed }) => ({
                width: 72,
                minHeight: 44,
                paddingVertical: 10,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: active ? c.primary : c.border,
                backgroundColor: active ? alpha(c.primary, 0.15) : c.surfaceAlt,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text
                variant="footnote"
                mono
                weight={active ? '700' : '500'}
                style={{ color: active ? c.primary : c.textSecondary }}
              >
                {formatMinute(minute)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}
