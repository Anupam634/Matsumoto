/**
 * Whether an inviter may email one of their referrals a "come back and
 * mine" nudge right now, and if not, why not.
 *
 * Pure so it can be tested without a database. The service applies it to
 * every roster row (so the client can render the button state) and again
 * on the send endpoint (so the client's opinion is never trusted).
 */

/** A referral who mined within this window is active; nudging is pointless. */
export const ACTIVE_WINDOW_MS = 24 * 3_600_000;
/** One referral is emailed at most once per this window. */
export const NUDGE_COOLDOWN_MS = 3 * 24 * 3_600_000;

export type ReminderBlock = 'ACTIVE' | 'NO_EMAIL' | 'COOLDOWN' | 'BLOCKED';

export interface ReminderState {
  canSend: boolean;
  /** Set when `canSend` is false. */
  reason: ReminderBlock | null;
  /** Last nudge, if any. */
  sentAt: string | null;
  /** When the cooldown lifts. Null when there is no cooldown running. */
  availableAt: string | null;
}

export function reminderState(
  referral: {
    email: string | null;
    isBlocked: boolean;
    lastMineAt: Date | null;
    lastReferralNudgeAt: Date | null;
  },
  now: Date = new Date(),
): ReminderState {
  const sentAt = referral.lastReferralNudgeAt
    ? referral.lastReferralNudgeAt.toISOString()
    : null;
  const cooldownEnds = referral.lastReferralNudgeAt
    ? referral.lastReferralNudgeAt.getTime() + NUDGE_COOLDOWN_MS
    : 0;
  const availableAt =
    cooldownEnds > now.getTime() ? new Date(cooldownEnds).toISOString() : null;

  const blocked = (reason: ReminderBlock): ReminderState => ({
    canSend: false,
    reason,
    sentAt,
    availableAt,
  });

  if (referral.isBlocked) return blocked('BLOCKED');
  if (!referral.email) return blocked('NO_EMAIL');
  if (
    referral.lastMineAt &&
    now.getTime() - referral.lastMineAt.getTime() <= ACTIVE_WINDOW_MS
  ) {
    return blocked('ACTIVE');
  }
  if (availableAt) return blocked('COOLDOWN');

  return { canSend: true, reason: null, sentAt, availableAt: null };
}

/** Whole days since the referral last mined, or null if they never have. */
export function idleDays(lastMineAt: Date | null, now: Date = new Date()): number | null {
  if (!lastMineAt) return null;
  return Math.max(0, Math.floor((now.getTime() - lastMineAt.getTime()) / 86_400_000));
}
