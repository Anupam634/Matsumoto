import { BadRequestException, Logger } from '@nestjs/common';

/**
 * Cloudflare Turnstile verification for the unauthenticated email-sending
 * routes.
 *
 * Sign-up is being flooded by scripted registrations on generated addresses,
 * and every one of them costs a real OTP email. The per-device and per-IP
 * caps do not touch it: the fingerprint is whatever the client sends, and the
 * IPs rotate.
 *
 * Unset TURNSTILE_SECRET_KEY disables the check entirely, so the feature ships
 * dark and is switched on by adding the key.
 */
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
/** Cloudflare is in the signup path; fail fast rather than hang the request. */
const VERIFY_TIMEOUT_MS = 5_000;

const logger = new Logger('Turnstile');

export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY?.trim();
}

/**
 * Throws unless `token` is a valid, unused Turnstile solution. Tokens are
 * single use, so each protected action needs its own.
 */
export async function assertHuman(token: string | undefined, ip?: string): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return;

  if (!token) {
    throw new BadRequestException('Please complete the anti-bot check and try again.');
  }

  const body = new URLSearchParams({ secret, response: token });
  if (ip) body.set('remoteip', ip);

  let outcome: { success?: boolean; 'error-codes'?: string[] };
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    outcome = (await res.json()) as typeof outcome;
  } catch (err) {
    // Cloudflare unreachable. Refuse rather than wave everyone through: the
    // routes behind this send mail, and an outage here would otherwise hand
    // the flood straight back.
    logger.error(
      `verification unavailable: ${err instanceof Error ? err.message : String(err)}`,
    );
    throw new BadRequestException(
      'Could not run the anti-bot check right now. Please try again in a moment.',
    );
  }

  if (!outcome.success) {
    logger.warn(`rejected token: ${(outcome['error-codes'] ?? []).join(', ') || 'no reason given'}`);
    throw new BadRequestException('Anti-bot check failed. Please try again.');
  }
}
