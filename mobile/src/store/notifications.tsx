import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  BoosterOverview,
  KycStatus,
  MiningStatus,
  Profile,
  SupportTicketDto,
  TaskDto,
  WithdrawalDto,
} from '../api/endpoints';
import { useSettings } from './settings';
import { cancelAll, setBadge } from '../lib/push';
import type { Translate } from '../i18n';

/**
 * The in-app notification centre.
 *
 * The API has no notifications endpoint, so entries are derived on the device:
 * every refresh compares the freshly-fetched state against the last snapshot
 * and records what changed — a withdrawal that got paid, a KYC decision, a
 * support reply, a new referral, a booster that activated. Time-based nudges
 * (your node is ready, bounties are back) are OS-scheduled separately in
 * `lib/push`, so they arrive even with the app closed.
 */

export type NotificationKind =
  | 'MINING_READY'
  | 'MINED'
  | 'TASK_READY'
  | 'BOOSTER_ACTIVE'
  | 'BOOSTER_EXPIRING'
  | 'WITHDRAWAL'
  | 'KYC'
  | 'SUPPORT'
  | 'REFERRAL'
  | 'TIER'
  | 'ANNOUNCEMENT';

export type NotificationTone = 'info' | 'success' | 'warning' | 'danger';

export interface NotificationItem {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  tone: NotificationTone;
  /** Route to open when the row is tapped. */
  href?: string;
}

/** What the last sync saw, so the next one can spot the difference. */
interface Snapshot {
  withdrawalStatuses: Record<string, string>;
  kycStatus: KycStatus | null;
  ticketUpdatedAt: Record<string, string>;
  ticketAdminMessages: Record<string, number>;
  referralCount: number | null;
  tierLevel: number | null;
  activeBoosterIds: string[];
  boosterExpiryNotified: string[];
  announcedMiningReadyAt: string | null;
}

const EMPTY_SNAPSHOT: Snapshot = {
  withdrawalStatuses: {},
  kycStatus: null,
  ticketUpdatedAt: {},
  ticketAdminMessages: {},
  referralCount: null,
  tierLevel: null,
  activeBoosterIds: [],
  boosterExpiryNotified: [],
  announcedMiningReadyAt: null,
};

const ITEMS_KEY = 'bondkoin_notifications_v1';
const SNAPSHOT_KEY = 'bondkoin_notify_snapshot_v1';
const MAX_ITEMS = 120;

export interface SyncInput {
  t: Translate;
  profile?: Profile | null;
  mining?: MiningStatus | null;
  tasks?: TaskDto[] | null;
  boosters?: BoosterOverview | null;
  withdrawals?: WithdrawalDto[] | null;
  tickets?: SupportTicketDto[] | null;
}

interface NotificationsContextValue {
  items: NotificationItem[];
  unreadCount: number;
  hydrated: boolean;
  add: (item: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clear: () => void;
  /** Diff fresh server state against the last snapshot and record changes. */
  sync: (input: SyncInput) => void;
  /** Wipe the derived state — used on sign-out, so the next user starts clean. */
  resetForNewSession: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const snapshot = useRef<Snapshot>(EMPTY_SNAPSHOT);
  const snapshotLoaded = useRef(false);

  useEffect(() => {
    let alive = true;
    Promise.all([
      AsyncStorage.getItem(ITEMS_KEY),
      AsyncStorage.getItem(SNAPSHOT_KEY),
    ])
      .then(([rawItems, rawSnapshot]) => {
        if (!alive) return;
        if (rawItems) {
          try {
            setItems(JSON.parse(rawItems) as NotificationItem[]);
          } catch {
            /* corrupt blob — start empty */
          }
        }
        if (rawSnapshot) {
          try {
            snapshot.current = {
              ...EMPTY_SNAPSHOT,
              ...(JSON.parse(rawSnapshot) as Partial<Snapshot>),
            };
          } catch {
            /* keep the empty snapshot */
          }
        }
        snapshotLoaded.current = true;
      })
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  const persistItems = useCallback((next: NotificationItem[]) => {
    const capped = next.slice(0, MAX_ITEMS);
    setItems(capped);
    void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(capped));
    void setBadge(capped.filter((i) => !i.read).length);
  }, []);

  const persistSnapshot = useCallback((next: Snapshot) => {
    snapshot.current = next;
    void AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
  }, []);

  const add = useCallback<NotificationsContextValue['add']>(
    (item) => {
      setItems((prev) => {
        const next = [
          { ...item, id: makeId(), createdAt: new Date().toISOString(), read: false },
          ...prev,
        ].slice(0, MAX_ITEMS);
        void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(next));
        void setBadge(next.filter((i) => !i.read).length);
        return next;
      });
    },
    [],
  );

  const sync = useCallback<NotificationsContextValue['sync']>(
    ({ t, profile, mining, boosters, withdrawals, tickets }) => {
      // Never emit before the previous snapshot is on hand: a cold start would
      // otherwise report every existing withdrawal as "just changed".
      if (!snapshotLoaded.current) return;
      if (!settings.notifications.enabled) return;

      const prev = snapshot.current;
      const next: Snapshot = { ...prev };
      const fresh: Omit<NotificationItem, 'id' | 'createdAt' | 'read'>[] = [];
      const prefs = settings.notifications;
      const firstRun = prev.kycStatus === null && prev.referralCount === null;

      /* ── Withdrawals: PENDING → APPROVED / PAID / REJECTED ── */
      if (withdrawals) {
        const statuses: Record<string, string> = {};
        for (const w of withdrawals) {
          statuses[w.id] = w.status;
          const before = prev.withdrawalStatuses[w.id];
          if (prefs.withdrawals && before && before !== w.status) {
            if (w.status === 'PAID') {
              fresh.push({
                kind: 'WITHDRAWAL',
                tone: 'success',
                title: t('notify.withdrawalTitle', { status: t('withdraw.status.PAID') }),
                body: t('notify.withdrawalPaid', { amount: w.tokenAmount }),
                href: '/withdraw',
              });
            } else if (w.status === 'APPROVED') {
              fresh.push({
                kind: 'WITHDRAWAL',
                tone: 'info',
                title: t('notify.withdrawalTitle', {
                  status: t('withdraw.status.APPROVED'),
                }),
                body: t('notify.withdrawalApproved'),
                href: '/withdraw',
              });
            } else if (w.status === 'REJECTED') {
              fresh.push({
                kind: 'WITHDRAWAL',
                tone: 'danger',
                title: t('notify.withdrawalTitle', {
                  status: t('withdraw.status.REJECTED'),
                }),
                body: w.adminNote ?? t('notify.withdrawalRejected'),
                href: '/withdraw',
              });
            }
          }
        }
        next.withdrawalStatuses = statuses;
      }

      /* ── KYC decisions ── */
      if (profile) {
        if (
          prefs.withdrawals &&
          prev.kycStatus &&
          prev.kycStatus !== profile.kycStatus &&
          (profile.kycStatus === 'APPROVED' || profile.kycStatus === 'REJECTED')
        ) {
          const approved = profile.kycStatus === 'APPROVED';
          fresh.push({
            kind: 'KYC',
            tone: approved ? 'success' : 'danger',
            title: t('notify.kycTitle', {
              status: t(`kyc.status.${profile.kycStatus}`),
            }),
            body: approved ? t('notify.kycApproved') : t('notify.kycRejected'),
            href: '/kyc',
          });
        }
        next.kycStatus = profile.kycStatus;

        /* ── Referrals: new joins and tier upgrades ── */
        if (
          prefs.referrals &&
          prev.referralCount !== null &&
          profile.referralCount > prev.referralCount
        ) {
          fresh.push({
            kind: 'REFERRAL',
            tone: 'success',
            title: t('notify.referralTitle'),
            body: t('notify.referralMessage', { n: profile.referralCount }),
            href: '/referrals',
          });
        }
        if (
          prefs.referrals &&
          prev.tierLevel !== null &&
          profile.referralTier.level > prev.tierLevel
        ) {
          fresh.push({
            kind: 'TIER',
            tone: 'success',
            title: t('notify.tierTitle'),
            body: t('notify.tierMessage', {
              level: profile.referralTier.level,
              multiplier: profile.referralTier.multiplier,
            }),
            href: '/referrals',
          });
        }
        next.referralCount = profile.referralCount;
        next.tierLevel = profile.referralTier.level;
      }

      /* ── Support: an operator added a message ── */
      if (tickets) {
        const updated: Record<string, string> = {};
        const adminCounts: Record<string, number> = {};
        for (const ticket of tickets) {
          updated[ticket.id] = ticket.updatedAt;
          const adminMessages = ticket.messages.filter((m) => m.fromAdmin).length;
          adminCounts[ticket.id] = adminMessages;
          const before = prev.ticketAdminMessages[ticket.id];
          if (prefs.support && before !== undefined && adminMessages > before) {
            fresh.push({
              kind: 'SUPPORT',
              tone: 'info',
              title: t('notify.supportTitle'),
              body: t('notify.supportMessage', { subject: ticket.subject }),
              href: `/support/${ticket.id}`,
            });
          }
        }
        next.ticketUpdatedAt = updated;
        next.ticketAdminMessages = adminCounts;
      }

      /* ── Boosters: activation, and a heads-up 24h before expiry ── */
      if (boosters) {
        const activeIds = boosters.activeBoosters.map((b) => b.id);
        for (const booster of boosters.activeBoosters) {
          if (
            prefs.boosters &&
            prev.activeBoosterIds.length > 0 &&
            !prev.activeBoosterIds.includes(booster.id)
          ) {
            fresh.push({
              kind: 'BOOSTER_ACTIVE',
              tone: 'success',
              title: t('boost.activatedTitle'),
              body: t('boost.activatedBody', {
                rate: (
                  (mining?.ratePerHour ?? 0) || booster.rateBonusPerHour
                ).toFixed(2),
              }),
              href: '/boosters',
            });
          }
          const msLeft = new Date(booster.expiresAt).getTime() - Date.now();
          if (
            prefs.boosters &&
            msLeft > 0 &&
            msLeft < 86_400_000 &&
            !prev.boosterExpiryNotified.includes(booster.id)
          ) {
            fresh.push({
              kind: 'BOOSTER_EXPIRING',
              tone: 'warning',
              title: t('notify.boosterExpiringTitle'),
              body: t('notify.boosterExpiringMessage', { price: booster.priceUsd }),
              href: '/boosters',
            });
            next.boosterExpiryNotified = [
              ...next.boosterExpiryNotified,
              booster.id,
            ];
          }
        }
        // Forget expired boosters so the list cannot grow without bound.
        next.boosterExpiryNotified = next.boosterExpiryNotified.filter((id) =>
          activeIds.includes(id),
        );
        next.activeBoosterIds = activeIds;
      }

      persistSnapshot(next);

      // The very first sync only records the baseline. Announcing history the
      // user has already seen would be noise, not news.
      if (firstRun || fresh.length === 0) return;

      setItems((prevItems) => {
        const merged = [
          ...fresh.map((item) => ({
            ...item,
            id: makeId(),
            createdAt: new Date().toISOString(),
            read: false,
          })),
          ...prevItems,
        ].slice(0, MAX_ITEMS);
        void AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(merged));
        void setBadge(merged.filter((i) => !i.read).length);
        return merged;
      });
    },
    [settings.notifications, persistSnapshot],
  );

  const value = useMemo<NotificationsContextValue>(
    () => ({
      items,
      hydrated,
      unreadCount: items.filter((i) => !i.read).length,
      add,
      sync,
      markRead: (id) =>
        persistItems(items.map((i) => (i.id === id ? { ...i, read: true } : i))),
      markAllRead: () => persistItems(items.map((i) => ({ ...i, read: true }))),
      remove: (id) => persistItems(items.filter((i) => i.id !== id)),
      clear: () => persistItems([]),
      resetForNewSession: async () => {
        snapshot.current = EMPTY_SNAPSHOT;
        await AsyncStorage.multiRemove([ITEMS_KEY, SNAPSHOT_KEY]);
        setItems([]);
        // Anything still armed in the OS belongs to the account that is
        // leaving — a "your node is ready" for someone else's node is a leak.
        await cancelAll();
        await setBadge(0);
      },
    }),
    [items, hydrated, add, sync, persistItems],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside <NotificationsProvider>');
  }
  return ctx;
}
