/**
 * Encryption at rest for the few secrets the database has to hold in a
 * reversible form — today, the seeds behind each miner's authenticator app.
 *
 * A seed is as good as the second factor itself: anyone who reads it can
 * generate valid codes forever. Sealing it with a key that lives only in the
 * environment means a copy of the database (a backup, a leaked dump) is not
 * also a copy of everyone's authenticator.
 *
 * AES-256-GCM, so a tampered or wrong-key value fails loudly instead of
 * decrypting to garbage. Sealed form:
 *
 *   v1.<keyId>.<iv>.<tag>.<ciphertext>        (each part base64url)
 *
 * The key id says which key sealed it:
 *
 *   k1 — TOTP_ENCRYPTION_KEY, the dedicated key (set this)
 *   k0 — derived from JWT_SECRET, used only while TOTP_ENCRYPTION_KEY is unset
 *
 * Both are kept for opening, so setting TOTP_ENCRYPTION_KEY later does not
 * strand the seeds sealed before it. Rotating JWT_SECRET does strand any k0
 * seed — those users need an operator to reset their 2FA — which is why the
 * dedicated key exists and why boot warns when it is missing.
 */

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';

const VERSION = 'v1';
const IV_BYTES = 12;
const SALT = 'bondkoin/secret-box';

export interface SecretKeyring {
  /** The key new values are sealed with. */
  sealWith: { id: string; key: Buffer };
  /** Every key a stored value may have been sealed with, by id. */
  keys: Map<string, Buffer>;
}

function derive(material: string, purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', material, SALT, purpose, 32));
}

/**
 * Keys for one purpose (e.g. 'totp'). Throws when neither variable is set —
 * the API cannot boot without JWT_SECRET anyway, so in practice this only
 * fires in a misconfigured test.
 */
export function keyringFromEnv(
  purpose: string,
  env: Record<string, string | undefined> = process.env,
): SecretKeyring {
  const keys = new Map<string, Buffer>();
  const dedicated = env.TOTP_ENCRYPTION_KEY?.trim();
  const jwtSecret = env.JWT_SECRET?.trim();

  if (jwtSecret) keys.set('k0', derive(jwtSecret, `${purpose}/jwt`));
  if (dedicated) keys.set('k1', derive(dedicated, `${purpose}/dedicated`));

  const sealWith = keys.has('k1') ? 'k1' : 'k0';
  const key = keys.get(sealWith);
  if (!key) {
    throw new Error('Neither TOTP_ENCRYPTION_KEY nor JWT_SECRET is set; cannot encrypt secrets.');
  }
  return { sealWith: { id: sealWith, key }, keys };
}

export function sealSecret(plain: string, ring: SecretKeyring): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', ring.sealWith.key, iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    ring.sealWith.id,
    iv.toString('base64url'),
    tag.toString('base64url'),
    body.toString('base64url'),
  ].join('.');
}

/** Throws when the value is malformed, tampered with, or its key is gone. */
export function openSecret(sealed: string, ring: SecretKeyring): string {
  const parts = sealed.split('.');
  if (parts.length !== 5 || parts[0] !== VERSION) {
    throw new Error('Not a sealed secret.');
  }
  const [, keyId, iv, tag, body] = parts;
  const key = ring.keys.get(keyId);
  if (!key) {
    throw new Error(`Sealed with key ${keyId}, which this server does not have.`);
  }
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(body, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
