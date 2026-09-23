'use client';

/**
 * Crypto-payment finance module API client.
 *
 * Uses the same admin token as lib/admin-api.ts (one login, one AdminUser
 * table) — the separation this module provides is authorization
 * (CRYPTO_PAYMENT_VIEW / role: 'super', enforced server-side by
 * PermissionGuard) and a route the general admin panel never links to, not
 * a second account system. A token belonging to an admin without that
 * permission still gets a 403 from every call below.
 */

import { adminFetch, ApiError } from './admin-api';

export { ApiError };

export interface CollectorStatus {
  id: string;
  label: string;
  walletAddress: string;
  dailyCapUsd: number | null;
  collectedTodayUsd: number;
  remainingUsd: number | null;
  capReached: boolean;
}

export interface CryptoPayment {
  id: string;
  userId: string;
  userEmail: string;
  planId: string;
  amountUsd: number;
  tokenSymbol: string;
  expectedAmount: string;
  txHash: string | null;
  attemptedTxHash: string | null;
  receivingWallet: string;
  collectorId: string;
  collectorLabel: string;
  network: string;
  status: string;
  failureReason: string | null;
  confirmedAt: string | null;
  createdAt: string;
}

export const listCryptoPayments = (params?: {
  status?: string;
  collectorId?: string;
  search?: string;
}) => {
  const q = new URLSearchParams();
  if (params?.status && params.status !== 'ALL') q.set('status', params.status);
  if (params?.collectorId && params.collectorId !== 'ALL') q.set('collectorId', params.collectorId);
  if (params?.search) q.set('search', params.search);
  const qs = q.toString();
  return adminFetch<CryptoPayment[]>(`/finance/crypto/payments${qs ? `?${qs}` : ''}`);
};

export const getCryptoPaymentDetail = (id: string) =>
  adminFetch<CryptoPayment>(`/finance/crypto/payments/${id}`);

export const getCollectorStatus = () =>
  adminFetch<CollectorStatus[]>('/finance/crypto/collectors');
