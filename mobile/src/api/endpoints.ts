import { apiFetch, deviceFingerprint, setToken } from './client';

/**
 * Every route the app talks to, typed exactly as the server returns it.
 * Mirrors `frontend/lib/api.ts` so both clients drift together, not apart.
 */

/* ─────────────────────────────── Auth ─────────────────────────────── */

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
  countryCode: string;
  otp?: string;
}): Promise<AuthResponse> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      password: params.password,
      referralCode: params.referralCode || undefined,
      countryCode: params.countryCode,
      otp: params.otp || undefined,
      deviceFingerprint: await deviceFingerprint(),
    }),
  });
  await setToken(data.accessToken);
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
      email: params.email,
      password: params.password,
      otp: params.otp || undefined,
      deviceFingerprint: await deviceFingerprint(),
    }),
  });
  await setToken(data.accessToken);
  return data;
}

export const sendOtp = (
  email: string,
  purpose: 'signup' | 'login' | 'forgot_password' = 'signup',
) =>
  apiFetch<{ success: boolean; message: string }>('/auth/send-otp', {
    method: 'POST',
    body: JSON.stringify({ email, purpose }),
  });

export const forgotPassword = (email: string) =>
  apiFetch<{ success: boolean; message: string }>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const resetPassword = (params: {
  email: string;
  otp: string;
  newPassword: string;
}) =>
  apiFetch<{ success: boolean; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(params),
  });

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Profile {
  id: string;
  email: string | null;
  walletAddress: string | null;
  countryCode: string | null;
  pointsBalance: number;
  referralCode: string;
  referralCount: number;
  referralTier: { level: number; multiplier: number };
  kycStatus: KycStatus;
  createdAt: string;
}

export const getProfile = () => apiFetch<Profile>('/auth/me');

/* ────────────────────────────── Mining ────────────────────────────── */

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

export type LedgerReason =
  | 'MINING'
  | 'TASK_REWARD'
  | 'REFERRAL_BONUS'
  | 'BOOSTER_PURCHASE'
  | 'WITHDRAWAL'
  | 'AIRDROP'
  | 'ADMIN_ADJUST';

export interface LedgerEntryDto {
  id: string;
  reason: LedgerReason;
  points: number;
  createdAt: string;
}

export interface MiningHistory {
  lifetimeEarnedPoints: number;
  entries: LedgerEntryDto[];
}

/** `take` caps the ledger rows returned (server default 12, max 200). */
export const getMiningHistory = (take?: number) =>
  apiFetch<MiningHistory>(
    take ? `/mining/history?take=${Math.round(take)}` : '/mining/history',
  );

/* ─────────────────────────────── Tasks ────────────────────────────── */

export type TaskType =
  | 'TWEET'
  | 'FOLLOW'
  | 'REPOST'
  | 'YOUTUBE'
  | 'QUIZ'
  | 'SPIN_WHEEL';

/**
 * A question as the client is allowed to see it before answering.
 *
 * `correctIndex` and `explanation` (which names the answer in prose) are
 * withheld by the server until the answers are submitted — grading happens
 * there, not here.
 */
export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
}

/** How one submitted answer was marked. */
export interface QuizAnswerResult {
  id: number;
  yourAnswer: number;
  correctIndex: number;
  correct: boolean;
  explanation: string;
}

export interface QuizResult {
  correctCount: number;
  total: number;
  results: QuizAnswerResult[];
}

export interface ClaimTaskResult {
  earnedPoints: number;
  balancePoints: number;
  nextAvailableAt: string;
  /** Which wheel segment the server drew. Null for non-wheel tasks. */
  spinIndex: number | null;
  /** Marking and explanations for a QUIZ claim. Null for other tasks. */
  quiz: QuizResult | null;
}

export interface TaskDto {
  id: string;
  type: TaskType;
  title: string;
  rewardPoints: number;
  cooldownHours: number;
  canClaim: boolean;
  nextAvailableAt: string | null;
  lastClaimedAt: string | null;
  /** Point value of each wheel segment, in order. Null for non-wheel tasks. */
  wheelSegments: number[] | null;
  quizQuestions?: QuizQuestion[] | null;
  actionUrl?: string | null;
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
  apiFetch<ClaimTaskResult>(`/tasks/${id}/claim`, {
    method: 'POST',
    body: JSON.stringify(answers ? { answers } : {}),
  });

/* ───────────────────────────── Referrals ──────────────────────────── */

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

/* ──────────────────────────── Leaderboard ─────────────────────────── */

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

export const getLeaderboard = (
  params: {
    category?: LeaderboardCategory;
    period?: LeaderboardPeriod;
    limit?: number;
  } = {},
) => {
  const query = new URLSearchParams();
  if (params.category) query.set('category', params.category);
  if (params.period) query.set('period', params.period);
  if (params.limit) query.set('limit', String(params.limit));
  const qs = query.toString();
  return apiFetch<LeaderboardResponse>(`/leaderboard${qs ? `?${qs}` : ''}`);
};

/* ──────────────────────────────── KYC ─────────────────────────────── */

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

/* ───────────────────────────── Boosters ───────────────────────────── */

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

export type PurchaseStatus =
  | 'AWAITING_PAYMENT'
  | 'CONFIRMED'
  | 'FAILED'
  | 'EXPIRED';

export interface BoosterPurchaseDto {
  id: string;
  status: PurchaseStatus;
  tokenSymbol: string;
  /** Human amount, e.g. "10.0". */
  amount: string;
  /** The same amount in the token's smallest unit — for wallet URIs. */
  expectedUnits: string;
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
    /** BEP-20 contract to pay in; null when payments are off or native BNB. */
    tokenAddress: string | null;
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

/* ──────────────────────────── Withdrawals ─────────────────────────── */

export type WithdrawalStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface WithdrawalDto {
  id: string;
  /** Points debited, in whole points. */
  points: number;
  /** $BONDKOIN to be paid out — points ÷ 3, as a decimal string. */
  tokenAmount: string;
  toAddress: string;
  status: WithdrawalStatus;
  txHash: string | null;
  /** Reviewer's note — the reason shown to the user when REJECTED. */
  adminNote: string | null;
  requestedAt: string;
  resolvedAt: string | null;
}

/** Rules the server enforces on a request (SPEC §4) — mirrored for the UI. */
export const WITHDRAWAL_MIN_POINTS = 100;
export const WITHDRAWAL_COOLDOWN_DAYS = 7;
/** SPEC §3: 3 points = 1 mainnet $BONDKOIN. */
export const POINTS_PER_TOKEN = 3;

export const getWithdrawals = () => apiFetch<WithdrawalDto[]>('/withdrawals');

export const requestWithdrawal = (points: number, toAddress: string) =>
  apiFetch<WithdrawalDto>('/withdrawals', {
    method: 'POST',
    body: JSON.stringify({ points, toAddress }),
  });

/* ────────────────────────────── Support ───────────────────────────── */

export interface SupportMessageDto {
  id: string;
  /** False for the miner's own messages, true for an operator reply. */
  fromAdmin: boolean;
  body: string;
  createdAt: string;
}

export type TicketStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';

export interface SupportTicketDto {
  id: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  messages: SupportMessageDto[];
}

/** Server-side cap on unresolved tickets — mirrored so the UI can explain it. */
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
