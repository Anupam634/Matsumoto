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
  otp?: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      referralCode: params.referralCode || undefined,
      countryCode: params.countryCode || undefined,
      otp: params.otp || undefined,
      deviceFingerprint: deviceFingerprint(),
    }),
  });
  setToken(data.accessToken);
  return data;
}

export async function login(params: {
  email: string;
  password: string;
  otp?: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      ...params,
      otp: params.otp || undefined,
      deviceFingerprint: deviceFingerprint(),
    }),
  });
  setToken(data.accessToken);
  return data;
}

export async function sendOtp(
  email: string,
  purpose: 'signup' | 'login' | 'forgot_password' = 'signup',
): Promise<{ success: boolean; message: string }> {
  return apiFetch('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });
}

export async function forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(params: {
  email: string;
  otp: string;
  newPassword: string;
}): Promise<{ success: boolean; message: string }> {
  return apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });
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

// ────────────────────────── Referrals ──────────────────────────

export interface ReferralMember {
  id: string;
  maskedEmail: string;
  countryCode: string;
  joinedAt: string;
  lastMineAt: string | null;
  isMiningActive: boolean;
}

export interface ReferralTierInfo {
  minInvites: number;
  maxInvites: number;
  level: number;
  multiplier: number;
}

export interface ReferralStatsResponse {
  referralCode: string;
  totalInvited: number;
  activeMinersCount: number;
  currentTier: ReferralTierInfo;
  nextTier: ReferralTierInfo | null;
  progressToNextPercent: number;
  invitesNeededForNext: number;
  allTiers: ReferralTierInfo[];
  referralsList: ReferralMember[];
}

export const getReferralStats = () =>
  apiFetch<ReferralStatsResponse>('/referrals/stats');

// ───────────────────────── Leaderboard ─────────────────────────

export type LeaderboardCategory = 'EARNINGS' | 'BALANCE' | 'REFERRALS';
export type LeaderboardPeriod = 'ALL_TIME' | 'MONTH' | 'WEEK';

export interface RankBadge {
  label: string;
  /** Podium medal, or an empty string outside the top 3. */
  medal: string;
}

export interface LeaderboardEntry {
  rank: number;
  id: string;
  /** Privacy-masked — the API never returns another miner's full email. */
  displayName: string;
  countryCode: string;
  value: number;
  badge: RankBadge;
  isCurrentUser: boolean;
  isMiningActive: boolean;
  joinedAt: string | null;
}

export interface LeaderboardResponse {
  category: LeaderboardCategory;
  /** The period actually used — BALANCE always reports ALL_TIME. */
  period: LeaderboardPeriod;
  periodSupported: boolean;
  unit: 'points' | 'miners';
  totalRanked: number;
  generatedAt: string;
  entries: LeaderboardEntry[];
  me: {
    /** Null until the miner has a non-zero score in this category. */
    rank: number | null;
    value: number;
    percentile: number | null;
    badge: RankBadge;
    inTopList: boolean;
  };
}

export const getLeaderboard = (params: {
  category?: LeaderboardCategory;
  period?: LeaderboardPeriod;
  limit?: number;
} = {}) => {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.period) query.set('period', params.period);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch<LeaderboardResponse>(`/leaderboard${qs ? `?${qs}` : ''}`);
};

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
  /** Point value of each wheel segment, in order. Null for non-wheel tasks. */
  wheelSegments: number[] | null;
  /**
   * Dynamic quiz questions configured by admin.
   *
   * The answers are not here. The server withholds `correctIndex` and the
   * explanation (which names the answer in prose) until the claim is
   * submitted — grading happens there, not in this client.
   */
  quizQuestions?: QuizQuestionDto[] | null;
  /** Custom social/target URL */
  actionUrl?: string | null;
}

export interface QuizQuestionDto {
  id: number;
  question: string;
  options: string[];
}

/** How one answer was marked, returned by the server after a quiz claim. */
export interface QuizAnswerResultDto {
  id: number;
  yourAnswer: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
}

export interface QuizResultDto {
  correctCount: number;
  total: number;
  results: QuizAnswerResultDto[];
}

export interface ClaimTaskResultDto {
  earnedPoints: number;
  balancePoints: number;
  nextAvailableAt: string;
  /** Which wheel segment the server drew. Null for non-wheel tasks. */
  spinIndex: number | null;
  /** Marking and explanations for a QUIZ claim. Null for other tasks. */
  quiz: QuizResultDto | null;
}

export const getTasks = () => apiFetch<TaskDto[]>('/tasks');

/**
 * Claim a task reward.
 *
 * `answers` is required for QUIZ tasks — the chosen option index per
 * question, in order. The reward is scaled by how many were right, and the
 * cooldown starts either way.
 */
export const claimTask = (id: string, answers?: number[]) =>
  apiFetch<ClaimTaskResultDto>(`/tasks/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify(answers ? { answers } : {}),
  });

// ──────────────────────────── KYC ───────────────────────────

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface KycStatusDto {
  status: KycStatus;
  fullName: string | null;
  documentType: string | null;
  countryCode: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewerNote: string | null;
  canSubmit: boolean;
}

export interface KycImage {
  mimeType: string;
  data: string;
}

export const getKyc = () => apiFetch<KycStatusDto>('/kyc');

export const submitKyc = (body: {
  fullName: string;
  documentType: string;
  documentNumber: string;
  countryCode: string;
  front: KycImage;
  back?: KycImage;
  selfie: KycImage;
}) =>
  apiFetch<KycStatusDto>('/kyc', {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ───────────────────────── Boosters ─────────────────────────

export interface BoosterPlanDto {
  id: string;
  priceUsd: number;
  rateBonusPerHour: number;
  durationDays: number;
  resultingRatePerHour: number;
}

export interface ActiveBoosterDto {
  id: string;
  priceUsd: number;
  rateBonusPerHour: number;
  startedAt: string;
  expiresAt: string;
}

export interface BoosterPurchaseDto {
  id: string;
  status: 'AWAITING_PAYMENT' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
  tokenSymbol: string;
  amount: string;
  payToAddress: string;
  fromAddress: string;
  txHash: string | null;
  failureReason: string | null;
  createdAt: string;
  expiresAt: string;
}

export interface BoosterOverview {
  payment: {
    enabled: boolean;
    disabledReason?: string;
    tokenSymbol: string;
    payToAddress: string | null;
    minConfirmations: number;
  };
  plans: BoosterPlanDto[];
  activeBoosters: ActiveBoosterDto[];
  purchases: BoosterPurchaseDto[];
}

export const getBoosters = () => apiFetch<BoosterOverview>('/boosters');

export const createBoosterIntent = (planId: string, fromAddress: string) =>
  apiFetch<BoosterPurchaseDto>('/boosters/purchase', {
    method: 'POST',
    body: JSON.stringify({ planId, fromAddress }),
  });

export const submitBoosterPayment = (purchaseId: string, txHash: string) =>
  apiFetch<{
    activated: boolean;
    booster: { id: string; rateBonusPerHour: number; expiresAt: string };
  }>(`/boosters/purchase/${purchaseId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ txHash }),
  });

// ─────────────────── Mining history / earnings ──────────────

export interface LedgerEntryDto {
  id: string;
  reason:
    | 'MINING'
    | 'TASK_REWARD'
    | 'REFERRAL_BONUS'
    | 'BOOSTER_PURCHASE'
    | 'WITHDRAWAL'
    | 'AIRDROP'
    | 'ADMIN_ADJUST';
  points: number;
  createdAt: string;
}

export interface MiningHistory {
  lifetimeEarnedPoints: number;
  entries: LedgerEntryDto[];
}

export const getMiningHistory = () => apiFetch<MiningHistory>('/mining/history');

// ───────────────────────── Withdrawals ──────────────────────

export interface WithdrawalDto {
  id: string;
  /** Points debited, in whole points (the API divides milli-points by 1000). */
  points: number;
  /** $Matsumoto to be paid out — points ÷ 3, as a decimal string. */
  tokenAmount: string;
  toAddress: string;
  status: 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';
  txHash: string | null;
  /** Reviewer's note — the reason shown to the user when REJECTED. */
  adminNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

/** Rules the server enforces on a request (SPEC §4) — mirrored for the UI. */
export const WITHDRAWAL_MIN_POINTS = 100;
export const WITHDRAWAL_COOLDOWN_DAYS = 7;

export const getWithdrawals = () => apiFetch<WithdrawalDto[]>('/withdrawals');

export const requestWithdrawal = (points: number, toAddress: string) =>
  apiFetch<WithdrawalDto>('/withdrawals', {
    method: 'POST',
    body: JSON.stringify({ points, toAddress }),
  });

// ─────────────────────────── Support ────────────────────────

export interface SupportMessageDto {
  id: string;
  /** False for the miner's own messages, true for an operator reply. */
  fromAdmin: boolean;
  body: string;
  createdAt: string;
}

export interface SupportTicketDto {
  id: string;
  subject: string;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageDto[];
}

/** Server-side cap on tickets left unresolved — mirrored so the UI can explain it. */
export const SUPPORT_MAX_OPEN = 3;

export const getSupportTickets = () => apiFetch<SupportTicketDto[]>('/support');

export const createSupportTicket = (subject: string, body: string) =>
  apiFetch<SupportTicketDto>('/support', {
    method: 'POST',
    body: JSON.stringify({ subject, body }),
  });

export const replyToSupportTicket = (id: string, body: string) =>
  apiFetch<SupportTicketDto>(`/support/${id}/reply`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
