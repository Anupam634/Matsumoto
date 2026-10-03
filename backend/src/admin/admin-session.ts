import type { ConfigService } from '@nestjs/config';

/**
 * How admin-console sign-in is configured. Read on every call, like the
 * miner-side switches, so a changed env value applies after a restart
 * without code changes.
 */

/**
 * Whether signing in to the admin console needs the emailed code. On unless
 * ADMIN_LOGIN_OTP_ENFORCED is exactly "false" — the off-switch exists for an
 * SMTP outage that would otherwise lock every operator out, and needs server
 * access to flip.
 */
export function adminOtpEnforced(config: ConfigService): boolean {
  return config.get<string>('ADMIN_LOGIN_OTP_ENFORCED') !== 'false';
}

const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/**
 * The operator inbox the client asked admin sign-in codes to go to. Kept in
 * code so a deployment needs no extra env setup; this repository is public,
 * so the address is visible to anyone reading it.
 */
export const DEFAULT_ADMIN_OTP_RECIPIENTS = ['sunipk93@gmail.com'];

/**
 * Where the admin sign-in code is mailed: every address in ADMIN_OTP_EMAIL
 * (comma or space separated) when it names any — use it for a different
 * inbox, e.g. your own during local development — otherwise the default
 * operator inbox above. Never settable from the panel, so a hijacked admin
 * session cannot redirect the codes to itself.
 */
export function adminOtpRecipients(config: ConfigService): string[] {
  const configured = (config.get<string>('ADMIN_OTP_EMAIL') ?? '')
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL.test(e));
  return configured.length ? [...new Set(configured)] : [...DEFAULT_ADMIN_OTP_RECIPIENTS];
}

/**
 * Lifetime of an admin token. Shorter than a miner's (JWT_EXPIRES_IN, 7 days
 * by default): an admin token approves payouts, and a laptop left signed in
 * should not stay a way in for a week.
 */
export function adminSessionTtl(config: ConfigService): string {
  return config.get<string>('ADMIN_SESSION_TTL')?.trim() || '12h';
}
