/**
 * The signing key for every token this API issues.
 *
 * There used to be a hardcoded fallback here, which meant a missing
 * JWT_SECRET did not fail the boot — it silently signed with a key that is
 * committed to the repository. Miner tokens and admin tokens share this
 * secret (the admin guard only distinguishes them by a `typ` claim), so
 * anyone holding it could mint an admin token and approve their own
 * withdrawals. A key this important has no safe default: refuse to start.
 */

/** Anything shorter is a placeholder, not a key. `openssl rand -hex 32`. */
export const MIN_JWT_SECRET_LENGTH = 32;

/** Fallbacks that shipped in the repo or in .env.example at some point. */
const KNOWN_LEAKED = new Set([
  'bondkoin_super_secret_jwt_key_production_fallback_key_2026',
  'bondkoin_super_secret_jwt_key_change_me_in_production',
]);

export function requireJwtSecret(value: string | undefined): string {
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
    throw new Error(
      `JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters. Generate one with \`openssl rand -hex 32\`.`,
    );
  }
  return secret;
}
