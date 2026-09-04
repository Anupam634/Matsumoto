import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * Thin client for the BONDKOIN API — the native twin of the web app's
 * `lib/api.ts`.
 *
 * Two differences from the browser version:
 *  - the JWT lives in the OS keychain (SecureStore), not localStorage;
 *  - the device fingerprint is a real installation id where the platform
 *    offers one, so clearing app data does not silently mint a new device.
 */

export const API_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  'https://api.bondkoinlabs.com/api';

export const WEB_URL: string =
  (Constants.expoConfig?.extra as { webUrl?: string } | undefined)?.webUrl ??
  'https://bondkoinlabs.com';

const TOKEN_KEY = 'bondkoin_token';
const DEVICE_KEY = 'bondkoin_device';

/** Requests that hang forever look like a frozen app; fail them instead. */
const TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Thrown when the request never reached the server (airplane mode, DNS, …). */
export class NetworkError extends Error {
  constructor(message = 'offline') {
    super(message);
    this.name = 'NetworkError';
  }
}

/* ────────────────────────────── Session ────────────────────────────── */

let tokenCache: string | null = null;

export async function getToken(): Promise<string | null> {
  if (tokenCache !== null) return tokenCache;
  try {
    tokenCache = await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    // SecureStore can fail on a device with no keychain (rooted emulators);
    // fall back so the app is usable rather than permanently signed out.
    tokenCache = await AsyncStorage.getItem(TOKEN_KEY);
  }
  return tokenCache;
}

export async function setToken(token: string): Promise<void> {
  tokenCache = token;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  tokenCache = null;
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    /* nothing stored there */
  }
  await AsyncStorage.removeItem(TOKEN_KEY);
}

/* ─────────────────────────── Device identity ────────────────────────── */

let deviceCache: string | null = null;

/**
 * Stable per-installation id, sent on register/login for the backend's
 * anti-abuse checks (SPEC §7). Android exposes a real install id; iOS gives a
 * vendor id that survives a reinstall of the same vendor's apps. Both beat a
 * random UUID, which resets whenever storage is cleared.
 */
export async function deviceFingerprint(): Promise<string> {
  if (deviceCache) return deviceCache;

  const stored = await AsyncStorage.getItem(DEVICE_KEY);
  if (stored) {
    deviceCache = stored;
    return stored;
  }

  let id: string | null = null;
  try {
    id =
      Platform.OS === 'android'
        ? Application.getAndroidId()
        : await Application.getIosIdForVendorAsync();
  } catch {
    id = null;
  }

  const model = `${Device.osName ?? Platform.OS}-${Device.modelName ?? 'device'}`;
  const fingerprint = `${model}:${id ?? randomId()}`.slice(0, 128);

  await AsyncStorage.setItem(DEVICE_KEY, fingerprint);
  deviceCache = fingerprint;
  return fingerprint;
}

function randomId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/* ──────────────────────────── Transport ─────────────────────────────── */

type Listener = () => void;
const unauthorizedListeners = new Set<Listener>();

/** Fires when the server rejects the session, so the app can sign out once. */
export function onUnauthorized(listener: Listener): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch {
    throw new NetworkError();
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    // Nest error bodies are { message: string | string[], statusCode }.
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      /* non-JSON error body — keep the status text */
    }
    if (res.status === 401 || res.status === 403) {
      unauthorizedListeners.forEach((l) => l());
    }
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Human-readable message for any thrown value, for use in an error banner. */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof NetworkError) return fallback;
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
