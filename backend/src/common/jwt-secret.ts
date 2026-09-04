/**
 * The signing key for every token this API issues.
 *
 * There used to be a hardcoded fallback here, which meant a missing
 * JWT_SECRET did not fail the boot — it silently signed with a key that is
 * committed to the repository. Miner tokens and admin tokens share this
 * secret (the admin guard only distinguishes them by a `typ` claim), so
 * anyone holding it could mint an admin token and approve their own
 * withdrawals.
 *
 * Two failures are fatal, because in both cases the key is known to someone
 * outside the deployment:
 *
 *   - no secret at all — there is deliberately nothing to fall back to
 *   - a secret that shipped in this repo or in .env.example
 *
 * A secret that is merely *short* is a weak key, not a published one, so it
 * warns on every boot instead of refusing to start. That is a deliberate
 * trade: a length rule that takes the API down is a length rule that gets
 * deleted under pressure. Fix the warning — `openssl rand -hex 32` — rather
 * than living with it.
 */

/** Below this, the key is brute-forcible. `openssl rand -hex 32` clears it. */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Fallbacks that shipped in the repo or in .env.example at some point. */
const KNOWN_LEAKED = new Set([
  'bondkoin_super_secret_jwt_key_production_fallback_key_2026',
  'bondkoin_super_secret_jwt_key_change_me_in_production',
]);

export interface JwtSecretCheck {
  secret: string;
  /** Set when the secret is usable but should be replaced. */
  warning?: string;
}

/**
 * Validate the configured secret. Throws only when the key is one an
 * outsider could already have; returns a warning for a key that is merely
 * too short.
 */
export function checkJwtSecret(value: string | undefined): JwtSecretCheck {
  const secret = value?.trim();

  if (!secret) {
    throw new Error(
      'JWT_SECRET is not set. Generate one with `openssl rand -hex 32` and set it in the environment — the API will not start without it.',
    );
  }
  if (KNOWN_LEAKED.has(secret)) {
    throw new Error(
      'JWT_SECRET is still one of the example values from the repository. Anyone with the source can forge admin tokens with it — generate a real one with `openssl rand -hex 32`.',
    );
  }
  if (secret.length < MIN_JWT_SECRET_LENGTH) {
    return {
      secret,
      warning: `JWT_SECRET is ${secret.length} characters; ${MIN_JWT_SECRET_LENGTH} is the minimum for a key that also signs admin sessions. Replace it with \`openssl rand -hex 32\` — every token issued until then is signed with a brute-forcible key.`,
    };
  }
  return { secret };
}
