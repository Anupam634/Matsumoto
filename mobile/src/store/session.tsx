import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  clearToken,
  errorMessage,
  getToken,
  onUnauthorized,
} from '../api/client';
import {
  getMiningHistory,
  getMiningStatus,
  getProfile,
  type MiningHistory,
  type MiningStatus,
  type Profile,
} from '../api/endpoints';
import { useT } from '../i18n';

/**
 * Session state and the shared dashboard poll.
 *
 * Profile, mining status and the ledger are fetched here rather than in each
 * screen: three tabs need the balance, and polling the same three routes from
 * three places would triple the traffic and let the tabs disagree about the
 * balance.
 */

/** Background refresh cadence — the server stays the source of truth. */
const REFRESH_MS = 20_000;

export type AuthState = 'loading' | 'signedIn' | 'signedOut';

interface SessionContextValue {
  state: AuthState;
  profile: Profile | null;
  mining: MiningStatus | null;
  history: MiningHistory | null;
  /** Last load error, already translated for display. */
  error: string | null;
  /** True while a refresh triggered by pull-to-refresh is in flight. */
  refreshing: boolean;
  /** Call after a successful login/register. */
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  /** Re-fetch profile + mining + history. */
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
  /** Apply a local change immediately, before the next poll confirms it. */
  patch: (patch: {
    profile?: Partial<Profile>;
    mining?: Partial<MiningStatus>;
  }) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [state, setState] = useState<AuthState>('loading');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [mining, setMining] = useState<MiningStatus | null>(null);
  const [history, setHistory] = useState<MiningHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const signOut = useCallback(async () => {
    await clearToken();
    setProfile(null);
    setMining(null);
    setHistory(null);
    setError(null);
    setState('signedOut');
  }, []);

  const refresh = useCallback<SessionContextValue['refresh']>(
    async ({ silent = true } = {}) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!silent) setRefreshing(true);
      try {
        const [p, m, h] = await Promise.all([
          getProfile(),
          getMiningStatus(),
          getMiningHistory(),
        ]);
        setProfile(p);
        setMining(m);
        setHistory(h);
        setError(null);
        setState('signedIn');
      } catch (err) {
        setError(errorMessage(err, t('app.offline')));
      } finally {
        inFlight.current = false;
        setRefreshing(false);
      }
    },
    [t],
  );

  const signIn = useCallback(async () => {
    // Never drop back to 'loading' after boot: the root navigator unmounts the
    // whole Stack on that state, which tears down the sign-in screen mid-await.
    await refresh({ silent: true });
    setState('signedIn');
  }, [refresh]);

  /* Restore the session on cold start. */
  useEffect(() => {
    let alive = true;
    (async () => {
      const token = await getToken();
      if (!alive) return;
      if (!token) {
        setState('signedOut');
        return;
      }
      await refresh({ silent: true });
      if (alive) setState((s) => (s === 'loading' ? 'signedIn' : s));
    })();
    return () => {
      alive = false;
    };
    // Deliberately once: this is the cold-start restore, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* A 401/403 anywhere in the app means the session is gone or blocked. */
  useEffect(() => onUnauthorized(() => void signOut()), [signOut]);

  /* Poll while signed in and in the foreground. */
  useEffect(() => {
    if (state !== 'signedIn') return;
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [state, refresh]);

  /* And refresh the moment the app comes back to the foreground. */
  useEffect(() => {
    if (state !== 'signedIn') return;
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') void refresh();
    });
    return () => sub.remove();
  }, [state, refresh]);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      profile,
      mining,
      history,
      error,
      refreshing,
      signIn,
      signOut,
      refresh,
      patch: ({ profile: profilePatch, mining: miningPatch }) => {
        if (profilePatch) {
          setProfile((prev) => (prev ? { ...prev, ...profilePatch } : prev));
        }
        if (miningPatch) {
          setMining((prev) => (prev ? { ...prev, ...miningPatch } : prev));
        }
      },
    }),
    [state, profile, mining, history, error, refreshing, signIn, signOut, refresh],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
