import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { QuietHours } from '../store/settings';
import { isQuietAt } from '../store/settings';
import type { Translate } from '../i18n';

/**
 * The OS notification layer: permissions, Android channels, and scheduling.
 *
 * Everything here is best-effort. Expo Go on Android cannot obtain a remote
 * push token (that needs a development or production build), and a user can
 * revoke permission at any moment — so every call resolves to a boolean or
 * null instead of throwing, and the app stays fully usable either way.
 */

export const CHANNELS = {
  mining: 'mining',
  rewards: 'rewards',
  account: 'account',
} as const;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Android notification channels.
 *
 * Idempotent, and takes the translator rather than fixed copy: the names show
 * up in the system settings app, so they have to follow the language the user
 * chose — call again whenever the locale changes.
 */
export async function configureChannels(t: Translate): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNELS.mining, {
    name: t('notify.channelMining'),
    description: t('notify.channelMiningBody'),
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 120, 80, 120],
    lightColor: '#2563EB',
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.rewards, {
    name: t('notify.channelBounties'),
    description: t('notify.channelBountiesBody'),
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#F59E0B',
  });
  await Notifications.setNotificationChannelAsync(CHANNELS.account, {
    name: t('notify.channelAccount'),
    description: t('notify.channelAccountBody'),
    importance: Notifications.AndroidImportance.HIGH,
    lightColor: '#10B981',
  });
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'granted';
    return canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'denied';
  }
}

/** Asks once. Returns whether we may post notifications afterwards. */
export async function requestPermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    if (!current.canAskAgain) return false;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Expo push token, when the runtime can mint one.
 *
 * Kept for the day the backend grows a device-registration route: nothing is
 * sent anywhere yet, and a null result is entirely normal (simulator, Expo Go
 * on Android, missing EAS project id).
 */
export async function getPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;
  try {
    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)
        ?.eas?.projectId;
    if (!projectId || projectId.startsWith('00000000')) return null;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data ?? null;
  } catch {
    return null;
  }
}

/**
 * Push a delivery time out of the quiet window.
 *
 * A mining reminder that fires at 03:00 gets muted by the user, not thanked —
 * so it waits until the window closes instead of being dropped.
 */
export function respectQuietHours(when: Date, quiet: QuietHours): Date {
  if (!isQuietAt(quiet, when)) return when;
  const out = new Date(when);
  out.setHours(Math.floor(quiet.endMinute / 60), quiet.endMinute % 60, 0, 0);
  // The window wrapped past midnight, so the end time is tomorrow.
  if (out.getTime() <= when.getTime()) out.setDate(out.getDate() + 1);
  return out;
}

interface ScheduleArgs {
  id: string;
  title: string;
  body: string;
  /** When to deliver. Anything in the past is skipped. */
  at: Date;
  channel?: (typeof CHANNELS)[keyof typeof CHANNELS];
  data?: Record<string, unknown>;
  quiet?: QuietHours;
}

/**
 * Schedule (or reschedule) one notification under a stable id, so calling this
 * on every refresh never stacks duplicates.
 */
export async function scheduleAt({
  id,
  title,
  body,
  at,
  channel = CHANNELS.mining,
  data,
  quiet,
}: ScheduleArgs): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
    const when = quiet ? respectQuietHours(at, quiet) : at;
    if (when.getTime() - Date.now() <= 5_000) return false;
    await Notifications.scheduleNotificationAsync({
      identifier: id,
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      // A date trigger, not an interval: an interval counts from *now*, so a
      // reschedule a minute later would drift the delivery by that minute.
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: when,
        channelId: channel,
      },
    });
    return true;
  } catch {
    return false;
  }
}

/** Post something right now (used for the settings screen's test button). */
export async function presentNow(
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data ?? {},
        sound: true,
      },
      // The channel rides on the trigger, not the content: Android ignores
      // it in `content` and would post to the default channel.
      trigger:
        Platform.OS === 'android' ? { channelId: CHANNELS.account } : null,
    });
  } catch {
    /* permission revoked between the tap and the call */
  }
}

export async function cancel(id: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});
}

export async function setBadge(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count).catch(() => {});
}
