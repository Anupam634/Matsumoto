'use client';

/**
 * Admin panel API client.
 *
 * Deliberately separate from lib/api.ts: admin sessions use their own token
 * (issued with `typ: 'admin'`) stored under a different key, so signing out
 * of the miner app doesn't touch an admin session and vice versa.
 */

import { ApiError } from './api';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const ADMIN_TOKEN_KEY = 'matsumoto_admin_token';

export { ApiError };

export function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(ADMIN_TOKEN_KEY);
}

export function adminLogout() {
  window.localStorage.removeItem(ADMIN_TOKEN_KEY);
}

async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API}/admin${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (!res.ok) {
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

// ─────────────────────────── Types ───────────────────────────

export interface AdminStats {
  totalUsers: number;
  activeMiners: number;
  blockedUsers: number;
  totalBalancePoints: number;
  pendingWithdrawals: number;
  withdrawalsByStatus: Record<string, number>;
  usersByCountry: { countryCode: string; users: number }[];
}

export interface AdminUserRow {
  id: string;
  email: string | null;
  countryCode: string | null;
  balancePoints: number;
  ratePerHour: number;
  rateAdjustMilli: number;
  referralCount: number;
  referralTier: { level: number; multiplier: number };
  activeBoosters: number;
  kycStatus: string;
  isBlocked: boolean;
  lastMineAt: string | null;
  createdAt: string;
}

export interface TreeNode {
  id: string;
  email: string | null;
  countryCode: string | null;
  balancePoints: number;
  isBlocked: boolean;
  children: TreeNode[];
}

export interface AdminUserDetail {
  user: AdminUserRow;
  referralTree: TreeNode[];
  ledger: { id: string; reason: string; points: number; createdAt: string }[];
  withdrawals: {
    id: string;
    points: number;
    tokenAmount: string;
    status: string;
    requestedAt: string;
  }[];
}

export interface AdminWithdrawal {
  id: string;
  userId: string;
  userEmail: string | null;
  countryCode: string | null;
  points: number;
  tokenAmount: string;
  toAddress: string;
  status: string;
  txHash: string | null;
  adminNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

// ────────────────────────── Calls ────────────────────────────

export async function adminLogin(email: string, password: string) {
  const data = await adminFetch<{
    accessToken: string;
    admin: { id: string; email: string; role: string };
  }>('/login', { method: 'POST', body: JSON.stringify({ email, password }) });
  window.localStorage.setItem(ADMIN_TOKEN_KEY, data.accessToken);
  return data;
}

export const getStats = () => adminFetch<AdminStats>('/stats');

export const listUsers = (search: string, page = 1) =>
  adminFetch<{
    total: number;
    page: number;
    pageSize: number;
    users: AdminUserRow[];
  }>(
    `/users?page=${page}&pageSize=25${search ? `&search=${encodeURIComponent(search)}` : ''}`,
  );

export const getUserDetail = (id: string) =>
  adminFetch<AdminUserDetail>(`/users/${id}`);

export const setBlocked = (id: string, blocked: boolean) =>
  adminFetch<{ id: string; isBlocked: boolean }>(`/users/${id}/block`, {
    method: 'POST',
    body: JSON.stringify({ blocked }),
  });

export const adjustRate = (id: string, rateAdjustMilli: number) =>
  adminFetch<AdminUserRow>(`/users/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rateAdjustMilli }),
  });

export const airdrop = (id: string, points: number, note?: string) =>
  adminFetch<{ id: string; balancePoints: number; credited: number }>(
    `/users/${id}/airdrop`,
    { method: 'POST', body: JSON.stringify({ points, note }) },
  );

export const listWithdrawals = (status: string) =>
  adminFetch<AdminWithdrawal[]>(
    `/withdrawals${status ? `?status=${status}` : ''}`,
  );

export const decideWithdrawal = (id: string, approve: boolean, note?: string) =>
  adminFetch<unknown>(`/withdrawals/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({ approve, note }),
  });

// ──────────────────────── KYC review ─────────────────────────

export interface AdminKycRow {
  userId: string;
  userEmail: string | null;
  isBlocked: boolean;
  status: string;
  fullName: string | null;
  documentType: string | null;
  documentNumber: string | null;
  countryCode: string | null;
  documentCount: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
}

export interface AdminKycDetail extends AdminKycRow {
  documents: { id: string; kind: string; dataUrl: string }[];
}

export const listKyc = (status: string) =>
  adminFetch<AdminKycRow[]>(`/kyc${status ? `?status=${status}` : ''}`);

export const getKycDetail = (userId: string) =>
  adminFetch<AdminKycDetail>(`/kyc/${userId}`);

export const decideKyc = (userId: string, approve: boolean, note?: string) =>
  adminFetch<{ userId: string; status: string }>(`/kyc/${userId}/decision`, {
    method: 'POST',
    body: JSON.stringify({ approve, note }),
  });
