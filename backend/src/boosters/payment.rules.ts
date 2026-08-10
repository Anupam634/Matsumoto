/**
 * Pure decision logic for accepting an on-chain booster payment.
 *
 * Kept side-effect free and separate from the RPC layer so every rule can be
 * unit tested without a chain. This is money code: a false accept mints a
 * paid booster for free, so each check below exists to close a specific way
 * that could happen.
 */

export interface PaymentExpectation {
  /** Address the platform expects to be paid at. */
  payToAddress: string;
  /** Wallet the user declared they would pay from, bound at intent time. */
  fromAddress: string;
  /** Smallest-unit amount required (token decimals already applied). */
  expectedUnits: bigint;
  /** For BEP-20 payments, the token contract that must have been used. */
  tokenAddress?: string;
  /** When the purchase intent was created. */
  intentCreatedAt: Date;
}

export interface ObservedPayment {
  from: string;
  to: string;
  units: bigint;
  /** BEP-20 contract the transfer belongs to; absent for native BNB. */
  tokenAddress?: string;
  confirmations: number;
  /** Block timestamp of the transaction. */
  minedAt: Date;
  /** Whether the transaction itself succeeded on chain. */
  succeeded: boolean;
}

export interface Policy {
  minConfirmations: number;
  /**
   * How far before the intent a payment may have been mined. A small window
   * tolerates a user who paid moments before pressing the button; anything
   * older is refused so an unrelated historical transfer can't be replayed.
   */
  backdateToleranceMs: number;
}

export const DEFAULT_POLICY: Policy = {
  minConfirmations: 6,
  backdateToleranceMs: 30 * 60_000, // 30 minutes
};

export type PaymentRejection =
  | 'TX_FAILED'
  | 'NOT_ENOUGH_CONFIRMATIONS'
  | 'WRONG_RECIPIENT'
  | 'WRONG_SENDER'
  | 'WRONG_TOKEN'
  | 'UNDERPAID'
  | 'TOO_OLD';

export type PaymentVerdict =
  | { ok: true }
  | { ok: false; reason: PaymentRejection; detail: string };

const eq = (a?: string, b?: string) =>
  (a ?? '').toLowerCase() === (b ?? '').toLowerCase();

/**
 * Decide whether an observed transfer satisfies a purchase intent.
 *
 * Deliberately strict: overpayment is accepted (the user simply paid more),
 * but anything else — wrong token, wrong recipient, a sender other than the
 * one bound to the intent, too few confirmations, or a transfer mined well
 * before the intent existed — is refused.
 */
export function verifyPayment(
  expected: PaymentExpectation,
  observed: ObservedPayment,
  policy: Policy = DEFAULT_POLICY,
): PaymentVerdict {
  if (!observed.succeeded) {
    return { ok: false, reason: 'TX_FAILED', detail: 'Transaction reverted.' };
  }

  if (observed.confirmations < policy.minConfirmations) {
    return {
      ok: false,
      reason: 'NOT_ENOUGH_CONFIRMATIONS',
      detail: `Waiting for confirmations (${observed.confirmations}/${policy.minConfirmations}).`,
    };
  }

  if (!eq(observed.to, expected.payToAddress)) {
    return {
      ok: false,
      reason: 'WRONG_RECIPIENT',
      detail: 'Payment was not sent to the platform address.',
    };
  }

  // Without this, anyone could paste a stranger's transaction hash and claim
  // their payment before the real payer got to it.
  if (!eq(observed.from, expected.fromAddress)) {
    return {
      ok: false,
      reason: 'WRONG_SENDER',
      detail: 'Payment came from a different wallet than the one you declared.',
    };
  }

  // A BEP-20 intent must be paid in that exact token; a native intent must
  // not be satisfied by an arbitrary token transfer.
  if (!eq(observed.tokenAddress, expected.tokenAddress)) {
    return {
      ok: false,
      reason: 'WRONG_TOKEN',
      detail: 'Payment used a different token than required.',
    };
  }

  if (observed.units < expected.expectedUnits) {
    return {
      ok: false,
      reason: 'UNDERPAID',
      detail: 'Amount paid is less than the plan price.',
    };
  }

  const earliest =
    expected.intentCreatedAt.getTime() - policy.backdateToleranceMs;
  if (observed.minedAt.getTime() < earliest) {
    return {
      ok: false,
      reason: 'TOO_OLD',
      detail: 'That transaction predates this purchase.',
    };
  }

  return { ok: true };
}
