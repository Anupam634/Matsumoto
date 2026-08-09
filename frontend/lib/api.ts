'use client';

/**
 * Thin client for the Matsumoto API.
 *
 * Holds the JWT and the browser's device id, and attaches both to every
 * request — the backend uses the device id for its anti-abuse checks
 * (SPEC §7).
 */

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const TOKEN_KEY = 'matsumoto_token';
const DEVICE_KEY = 'matsumoto_device';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  window.localStorage.removeItem(TOKEN_KEY);
}

/**
 * Stable per-browser id. A placeholder for a real fingerprinting library —
 * clearing storage resets it, so treat it as a signal, not proof of identity.
 */
export function deviceFingerprint(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
    // Nest error bodies are { message: string | string[], statusCode }.
    let message = res.statusText;
    try {
      const body = await res.json();
      message = Array.isArray(body.message)
        ? body.message.join(', ')
        : (body.message ?? message);
    } catch {
      /* non-JSON error body — keep the status text */
    }
    throw new ApiError(message, res.status);
  }
  return res.json() as Promise<T>;
}

// ─────────────────────────── Auth ───────────────────────────

export interface SessionUser {
  id: string;
  email: string | null;
  referralCode: string;
}

interface AuthResponse {
  accessToken: string;
  user: SessionUser;
  referralRejected?: boolean;
}

export async function register(params: {
  email: string;
  password: string;
  referralCode?: string;
  countryCode?: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      referralCode: params.referralCode || undefined,
      countryCode: params.countryCode || undefined,
      deviceFingerprint: deviceFingerprint(),
    }),
  });
  setToken(data.accessToken);
  return data;
}

export async function login(params: {
  email: string;
  password: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      deviceFingerprint: deviceFingerprint(),
    }),
  });
  setToken(data.accessToken);
  return data;
}

export interface Profile {
  id: string;
  email: string | null;
  walletAddress: string | null;
  countryCode: string | null;
  pointsBalance: number;
  referralCode: string;
  referralCount: number;
  referralTier: { level: number; multiplier: number };
  kycStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export const getProfile = () => apiFetch<Profile>('/auth/me');

// ────────────────────────── Mining ──────────────────────────

export interface MiningStatus {
  ratePerHour: number;
  pendingPoints: number;
  activeBoosters: number;
  canClaim: boolean;
  referralTier: { level: number; multiplier: number };
  /** ISO timestamp the 24h cooldown lifts, or null if never mined. */
  nextClaimAt: string | null;
  /** Accrual ceiling (rate × 24h) — pending stops growing here. */
  maxPendingPoints: number;
}

export const getMiningStatus = () => apiFetch<MiningStatus>('/mining/status');

export const claimMining = () =>
  apiFetch<{ earnedPoints: number; nextClaimAt: string }>('/mining/claim', {
    method: 'POST',
  });

// ─────────────────────────── Tasks ──────────────────────────

export interface TaskDto {
  id: string;
  type: 'TWEET' | 'FOLLOW' | 'REPOST' | 'YOUTUBE' | 'QUIZ' | 'SPIN_WHEEL';
  title: string;
  rewardPoints: number;
  cooldownHours: number;
  canClaim: boolean;
  nextAvailableAt: string | null;
  lastClaimedAt: string | null;
}

export const getTasks = () => apiFetch<TaskDto[]>('/tasks');

export const claimTask = (id: string) =>
  apiFetch<{
    earnedPoints: number;
    balancePoints: number;
    nextAvailableAt: string;
  }>(`/tasks/${id}/claim`, { method: 'POST' });
