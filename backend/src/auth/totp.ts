/**
 * Time-based one-time passwords (RFC 6238) — the six-digit codes Google
 * Authenticator, Authy, 1Password and every other authenticator app show.
 *
 * Hand-rolled on node's crypto rather than pulled from a package: the whole
 * algorithm is an HMAC and a modulo, and these parameters (SHA-1, 6 digits,
 * 30 seconds) are the only ones Google Authenticator honours anyway.
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

export const TOTP_ISSUER = 'BONDKOIN';
export const TOTP_PERIOD_S = 30;
export const TOTP_DIGITS = 6;
/**
 * Steps either side of "now" a code is still accepted for. One step is 30s,
 * which absorbs a phone clock that has drifted and the time it takes to type
 * the code, without tripling the guessable window any further.
 */
export const TOTP_DRIFT_STEPS = 1;
/** 160 bits, the size RFC 4226 recommends for an HMAC-SHA1 key. */
const SECRET_BYTES = 20;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/**
 * Lenient on purpose: people type the key in by hand, in groups, in lower
 * case. Spaces, dashes and `=` padding are dropped; anything else outside the
 * alphabet is an error rather than a silently different key.
 */
export function base32Decode(text: string): Buffer {
  const clean = text.replace(/[\s=-]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Not a base32 string.');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh shared secret, base32 — the form authenticator apps take. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

/** RFC 4226 HOTP: the code for one counter value. */
export function hotp(key: Buffer, counter: number, digits = TOTP_DIGITS): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac('sha1', key).update(message).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const binary =
    ((mac[offset] & 0x7f) << 24) |
    (mac[offset + 1] << 16) |
    (mac[offset + 2] << 8) |
    mac[offset + 3];
  return String(binary % 10 ** digits).padStart(digits, '0');
}

/** The 30-second step a moment falls in — the counter TOTP feeds to HOTP. */
export function totpStep(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000 / TOTP_PERIOD_S);
}

/**
 * The step `code` is valid for, or null if it matches none in the drift
 * window. Returning the step rather than a boolean is what lets the caller
 * refuse a code it has already accepted once.
 *
 * Every step in the window is compared, newest match wins: stopping at the
 * first hit would leak through timing which step matched, and preferring the
 * newest keeps a code that happens to repeat within the window usable.
 */
export function matchTotp(
  secret: string,
  code: string,
  nowMs = Date.now(),
  drift = TOTP_DRIFT_STEPS,
): number | null {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return null;

  const key = base32Decode(secret);
  const now = totpStep(nowMs);
  const given = Buffer.from(clean);
  let matched: number | null = null;
  for (let step = now - drift; step <= now + drift; step++) {
    if (timingSafeEqual(Buffer.from(hotp(key, step)), given)) matched = step;
  }
  return matched;
}

/**
 * The `otpauth://` link an authenticator app scans (as a QR code) or opens
 * (tapped on the same phone). Format: Google's "Key Uri Format".
 */
export function otpauthUrl(secret: string, account: string, issuer = TOTP_ISSUER): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_S),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
