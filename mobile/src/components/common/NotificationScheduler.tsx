import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useSession } from '../../store/session';
import { useSettings } from '../../store/settings';
import { useNotifications } from '../../store/notifications';
import { useT } from '../../i18n';
import {
  cancel,
  configureChannels,
  getPermissionState,
  scheduleAt,
} from '../../lib/push';
import {
  getBoosters,
  getSupportTickets,
  getTasks,
  getWithdrawals,
  type BoosterOverview,
  type SupportTicketDto,
  type TaskDto,
  type WithdrawalDto,
} from '../../api/endpoints';

/**
 * Keeps the OS notification schedule in step with the account, and feeds the
 * in-app notification centre.
 *
 * Renders nothing. Two jobs:
 *  1. schedule "your node is ready" for the exact moment the cooldown lifts,
 *     and a nudge for the next bounty coming off cooldown;
 *  2. poll the routes the dashboard does not (withdrawals, tickets, boosters)
 *     and hand them to the notification store, which reports what changed.
 */

const IDS = {
  miningReady: 'bondkoin.mining-ready',
  tasksReady: 'bondkoin.tasks-ready',
  boosterExpiring: 'bondkoin.booster-expiring',
};

/** Secondary poll — slower than the dashboard's, since none of it ticks. */
const SLOW_POLL_MS = 90_000;

export function NotificationScheduler() {
  const t = useT();
  const router = useRouter();
  const { state, mining, profile } = useSession();
  const { settings } = useSettings();
  const { sync } = useNotifications();
  const lastScheduledClaim = useRef<string | null>(null);

  // The dashboard hands back new profile/mining objects on every poll. Holding
  // them in refs keeps the slow poll below on a fixed 90s cadence instead of
  // restarting — and re-firing four requests — every 20 seconds.
  const latest = useRef({ profile, mining });
  latest.current = { profile, mining };

  /* Android notification channels, once. */
  useEffect(() => {
    void configureChannels();
  }, []);

  /* Tapping a notification should land on the screen it is about. */
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const href = response.notification.request.content.data?.href;
        if (typeof href === 'string' && href.startsWith('/')) {
          router.push(href as never);
        }
      },
    );
    return () => sub.remove();
  }, [router]);

  /* Schedule the mining-ready reminder whenever the cooldown moves. */
  useEffect(() => {
    if (state !== 'signedIn') return;
    const prefs = settings.notifications;

    (async () => {
      if (!prefs.enabled || !prefs.miningReady) {
        await cancel(IDS.miningReady);
        lastScheduledClaim.current = null;
        return;
      }
      if ((await getPermissionState()) !== 'granted') return;

      const nextClaimAt = mining?.nextClaimAt ?? null;
      if (!nextClaimAt || mining?.canClaim) {
        await cancel(IDS.miningReady);
        lastScheduledClaim.current = null;
        return;
      }
      // Rescheduling the same instant on every poll would be wasted work.
      if (lastScheduledClaim.current === nextClaimAt) return;
      lastScheduledClaim.current = nextClaimAt;

      await scheduleAt({
        id: IDS.miningReady,
        title: t('notify.miningReadyTitle'),
        body: t('notify.miningReadyMessage'),
        at: new Date(nextClaimAt),
        channel: 'mining',
        data: { href: '/' },
        quiet: settings.quietHours,
      });
    })();
  }, [state, mining?.nextClaimAt, mining?.canClaim, settings.notifications, settings.quietHours, t]);

  /* Slow poll: the routes the dashboard does not fetch. */
  useEffect(() => {
    if (state !== 'signedIn') return;

    let alive = true;

    const run = async () => {
      // Each call is independent: a failure in one must not blank the others.
      const [withdrawals, tickets, boosters, tasks] = await Promise.all([
        getWithdrawals().catch(() => null),
        getSupportTickets().catch(() => null),
        getBoosters().catch(() => null),
        getTasks().catch(() => null),
      ]);
      if (!alive) return;

      sync({
        t,
        profile: latest.current.profile,
        mining: latest.current.mining,
        withdrawals: withdrawals as WithdrawalDto[] | null,
        tickets: tickets as SupportTicketDto[] | null,
        boosters: boosters as BoosterOverview | null,
        tasks: tasks as TaskDto[] | null,
      });

      await scheduleTaskReminder(tasks as TaskDto[] | null);
      await scheduleBoosterReminder(boosters as BoosterOverview | null);
    };

    const scheduleTaskReminder = async (tasks: TaskDto[] | null) => {
      const prefs = settings.notifications;
      if (!prefs.enabled || !prefs.tasks || !tasks) {
        await cancel(IDS.tasksReady);
        return;
      }
      // The soonest cooldown to lift is the only one worth an alert: by then
      // the screen will show every other task that came back with it.
      const upcoming = tasks
        .filter((task) => !task.canClaim && task.nextAvailableAt)
        .map((task) => new Date(task.nextAvailableAt!).getTime())
        .filter((time) => time > Date.now())
        .sort((a, b) => a - b)[0];

      if (!upcoming) {
        await cancel(IDS.tasksReady);
        return;
      }
      const readyCount = tasks.filter(
        (task) =>
          task.nextAvailableAt &&
          new Date(task.nextAvailableAt).getTime() <= upcoming + 60_000,
      ).length;

      await scheduleAt({
        id: IDS.tasksReady,
        title: t('notify.taskReadyTitle'),
        body: t('notify.taskReadyMessage', { n: Math.max(1, readyCount) }),
        at: new Date(upcoming),
        channel: 'rewards',
        data: { href: '/tasks' },
        quiet: settings.quietHours,
      });
    };

    const scheduleBoosterReminder = async (boosters: BoosterOverview | null) => {
      const prefs = settings.notifications;
      if (!prefs.enabled || !prefs.boosters || !boosters) {
        await cancel(IDS.boosterExpiring);
        return;
      }
      const soonest = boosters.activeBoosters
        .map((b) => new Date(b.expiresAt).getTime())
        .filter((time) => time > Date.now())
        .sort((a, b) => a - b)[0];

      if (!soonest) {
        await cancel(IDS.boosterExpiring);
        return;
      }
      const price =
        boosters.activeBoosters.find(
          (b) => new Date(b.expiresAt).getTime() === soonest,
        )?.priceUsd ?? 0;

      await scheduleAt({
        id: IDS.boosterExpiring,
        title: t('notify.boosterExpiringTitle'),
        body: t('notify.boosterExpiringMessage', { price }),
        // A day's warning is enough to renew before the rate drops.
        at: new Date(soonest - 86_400_000),
        channel: 'rewards',
        data: { href: '/boosters' },
        quiet: settings.quietHours,
      });
    };

    void run();
    const id = setInterval(() => void run(), SLOW_POLL_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [state, settings.notifications, settings.quietHours, sync, t]);

  return null;
}
