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
/** Cloudflare's recommended ceiling; the signup request waits on this. */
const VERIFY_TIMEOUT_MS = 10_000;

const logger = new Logger('Turnstile');

export function turnstileEnabled(): boolean {
  return !!process.env.TURNSTILE_SECRET_KEY?.trim();
}

/**
 * Whether a caller claiming `platform` has to solve a captcha.
 *
 * `platform` is client-declared, so gating on `web` alone means a script that
 * simply omits the field is waved through — which is how the sign-up flood
 * kept arriving after the widget went up. CAPTCHA_ALL_PLATFORMS=true closes
 * that by requiring a solution from every caller, at the cost of the mobile
 * app's sign-up until it ships a widget of its own.
 */
export function captchaApplies(platform?: string): boolean {
  if (!turnstileEnabled()) return false;
  return process.env.CAPTCHA_ALL_PLATFORMS === 'true' || platform === 'web';
}

/** Hostnames a solution may come from. Unset means any — see `assertHuman`. */
function allowedHostnames(): string[] {
  return (process.env.TURNSTILE_HOSTNAMES ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Throws unless `token` is a valid, unused Turnstile solution for `action`.
 *
 * Tokens are single use, so each protected action needs its own. The site key
 * is public: anyone can put the widget on their own page and mint valid
 * tokens, so the solution is also checked against the action it was issued
 * for and the hostname it was solved on.
 */
export async function assertHuman(
  token: string | undefined,
  opts: { ip?: string; action: string } = { action: '' },
): Promise<void> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) return;

  if (!token) {
    throw new BadRequestException('Please complete the anti-bot check and try again.');
  }

  const body = new URLSearchParams({ secret, response: token });
  if (opts.ip) body.set('remoteip', opts.ip);

  let outcome: {
    success?: boolean;
    action?: string;
    hostname?: string;
    'error-codes'?: string[];
  };
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

  // A solution minted for one flow must not be spent on another.
  if (opts.action && outcome.action && outcome.action !== opts.action) {
    logger.warn(`rejected token: action ${outcome.action}, expected ${opts.action}`);
    throw new BadRequestException('Anti-bot check failed. Please try again.');
  }

  // Unset TURNSTILE_HOSTNAMES skips this, which is the safe default for a
  // first deploy: a wrong list here would refuse every real signup.
  const allowed = allowedHostnames();
  if (allowed.length && outcome.hostname && !allowed.includes(outcome.hostname.toLowerCase())) {
    logger.warn(`rejected token solved on ${outcome.hostname}`);
    throw new BadRequestException('Anti-bot check failed. Please try again.');
  }
}
