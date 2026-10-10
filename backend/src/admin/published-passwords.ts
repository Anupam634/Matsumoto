/**
 * Admin passwords that have appeared in this repository's `.env.example` at
 * some point. The repository is public, so each of these is known to anyone
 * who has read it — and `.env.example` is the file people copy to make the
 * real `.env`.
 *
 * They are refused everywhere a password reaches an admin account: the boot
 * sync (admin-bootstrap.service.ts), the CLI (prisma/create-admin.js), and
 * sign-in itself — the last one matters most, because an account already
 * hashed with one of these keeps that hash until someone sets a new password.
 *
 * Same idea as KNOWN_LEAKED in common/jwt-secret.ts. Add to this list,
 * never remove from it: git history does not forget.
 */
const PUBLISHED_ADMIN_PASSWORDS = new Set([
  'BondKoin@2026!Admin',
  'matsumoto@123456',
  'change-me-min-12-chars',
]);

export function isPublishedAdminPassword(password: string | undefined | null): boolean {
  return !!password && PUBLISHED_ADMIN_PASSWORDS.has(password.trim());
}

/**
 * Until this moment, sign-in still accepts a published password — but only
 * while the emailed sign-in code is required, so the code is what actually
 * keeps a stranger out. Production was still on one when the refusal
 * shipped, and this is the week to change ADMIN_PASSWORD without being
 * locked out meanwhile. After it, the refusal applies again on its own; do
 * not move it, change the password.
 */
export const PUBLISHED_PASSWORD_GRACE_UNTIL = new Date('2099-01-01T00:00:00Z');

export function publishedPasswordGraceActive(nowMs = Date.now()): boolean {
  return nowMs < PUBLISHED_PASSWORD_GRACE_UNTIL.getTime();
}
