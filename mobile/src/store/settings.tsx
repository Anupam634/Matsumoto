import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '../i18n';

/**
 * Everything the Settings tab can change, persisted locally.
 *
 * Preferences are device-scoped on purpose: the API has no per-user settings
 * endpoint, and a notification schedule or an app lock only means anything on
 * the handset it was set on.
 */

/** The site's four themes, plus 'system' which picks dark or light from the OS. */
export type ThemeMode = 'system' | 'light' | 'dark' | 'cyber' | 'red';
export type LocalePref = 'system' | Locale;

export interface NotificationPrefs {
  /** Master switch. Off means nothing is ever scheduled or shown. */
  enabled: boolean;
  /** "Your node is ready" when the 24h cooldown lifts. */
  miningReady: boolean;
  /** A daily nudge when bounty tasks come off cooldown. */
  tasks: boolean;
  /** Withdrawal approved / paid / rejected. */
  withdrawals: boolean;
  /** A support operator replied to your ticket. */
  support: boolean;
  /** Someone joined with your referral code, or your tier changed. */
  referrals: boolean;
  /** Booster activated or about to expire. */
  boosters: boolean;
  /** Product news from BONDKOIN Labs. */
  announcements: boolean;
}

export interface QuietHours {
  enabled: boolean;
  /** Minutes since midnight, local time. */
  startMinute: number;
  endMinute: number;
}

export interface Settings {
  themeMode: ThemeMode;
  locale: LocalePref;
  haptics: boolean;
  sounds: boolean;
  /** Require Face ID / fingerprint when the app returns to the foreground. */
  appLock: boolean;
  /** Blur the balance on the dashboard until tapped. */
  privateBalance: boolean;
  /** Skip the confirm sheet when tapping Mine. */
  quickMine: boolean;
  notifications: NotificationPrefs;
  quietHours: QuietHours;
  /** Set once the intro carousel has been dismissed. */
  onboarded: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  // Midnight Sapphire is the site's default; the app matches it.
  themeMode: 'dark',
  locale: 'system',
  haptics: true,
  sounds: true,
  appLock: false,
  privateBalance: false,
  quickMine: true,
  notifications: {
    enabled: true,
    miningReady: true,
    tasks: true,
    withdrawals: true,
    support: true,
    referrals: true,
    boosters: true,
    announcements: false,
  },
  quietHours: {
    enabled: false,
    startMinute: 22 * 60,
    endMinute: 8 * 60,
  },
  onboarded: false,
};

const STORAGE_KEY = 'bondkoin_settings_v1';

interface SettingsContextValue {
  settings: Settings;
  /** True until the stored settings have been read back from disk. */
  hydrated: boolean;
  update: (patch: Partial<Settings>) => void;
  updateNotifications: (patch: Partial<NotificationPrefs>) => void;
  updateQuietHours: (patch: Partial<QuietHours>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!alive) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<Settings>;
            // Merge rather than replace: a build that adds a preference must
            // not wipe the ones already stored.
            setSettings({
              ...DEFAULT_SETTINGS,
              ...parsed,
              notifications: {
                ...DEFAULT_SETTINGS.notifications,
                ...(parsed.notifications ?? {}),
              },
              quietHours: {
                ...DEFAULT_SETTINGS.quietHours,
                ...(parsed.quietHours ?? {}),
              },
            });
          } catch {
            /* corrupt blob — fall back to defaults */
          }
        }
      })
      .finally(() => alive && setHydrated(true));
    return () => {
      alive = false;
    };
  }, []);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const value = useMemo<SettingsContextValue>(
    () => ({
      settings,
      hydrated,
      update: (patch) => persist({ ...settings, ...patch }),
      updateNotifications: (patch) =>
        persist({
          ...settings,
          notifications: { ...settings.notifications, ...patch },
        }),
      updateQuietHours: (patch) =>
        persist({
          ...settings,
          quietHours: { ...settings.quietHours, ...patch },
        }),
      // Onboarding is a fact about this install, not a preference: a reset
      // must not send the user back through the intro carousel.
      reset: () => persist({ ...DEFAULT_SETTINGS, onboarded: settings.onboarded }),
    }),
    [settings, hydrated, persist],
  );

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

/** Whether `date` falls inside the configured quiet window. */
export function isQuietAt(quiet: QuietHours, date = new Date()): boolean {
  if (!quiet.enabled) return false;
  const minute = date.getHours() * 60 + date.getMinutes();
  const { startMinute: start, endMinute: end } = quiet;
  // A window that ends before it starts wraps around midnight.
  return start <= end
    ? minute >= start && minute < end
    : minute >= start || minute < end;
}

export function formatMinute(minute: number): string {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
