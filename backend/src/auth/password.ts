/**
 * Password hashing with node's built-in scrypt — no native deps, so the
 * backend installs cleanly on Windows/CI without node-gyp.
 *
 * Stored format (self-describing so params can be tuned later without
 * invalidating existing hashes):
 *
 *   scrypt$<N>$<r>$<p>$<saltHex>$<keyHex>
 */

import { randomBytes, scrypt, ScryptOptions, timingSafeEqual } from 'crypto';

// Hand-rolled rather than promisify() — scrypt is an overloaded signature and
// promisify resolves to the 3-argument form, which drops the options object.
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) =>
      err ? reject(err) : resolve(derivedKey),
    );
  });
}

/** Current work factors. ~100ms on a modern server; bump N as hardware moves. */
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const key = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${key.toString('hex')}`;
}

/**
 * Constant-time verification. Returns false (never throws) for malformed or
 * missing hashes so callers can treat "no password set" as a failed login.
 */
export async function verifyPassword(
  plain: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;

  const [, nStr, rStr, pStr, saltHex, keyHex] = parts;
  const n = Number(nStr);
  const r = Number(rStr);
  const p = Number(pStr);
  if (!n || !r || !p) return false;

  let expected: Buffer;
  let salt: Buffer;
  try {
    expected = Buffer.from(keyHex, 'hex');
    salt = Buffer.from(saltHex, 'hex');
  } catch {
    return false;
  }
  if (expected.length === 0 || salt.length === 0) return false;

  const actual = await scryptAsync(plain, salt, expected.length, {
    N: n,
    r,
    p,
  });
  return timingSafeEqual(actual, expected);
}
