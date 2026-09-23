import disposableDomains from 'disposable-email-domains/index.json';
import disposableWildcards from 'disposable-email-domains/wildcard.json';

/**
 * Throwaway-inbox detection for sign-up.
 *
 * Farmed accounts register on temporary mailboxes, and every one of them
 * costs a real OTP email. That volume is what tripped the old SMTP host's
 * hourly cap, and on SES a stream of dead or throwaway recipients drives up
 * the bounce rate that SES suspends accounts over.
 *
 * The published list lags behind new temp-mail services — neither domain in
 * the observed wave was on it — so production can extend it without a
 * deploy via BLOCKED_EMAIL_DOMAINS (comma separated).
 */

const EXACT = new Set<string>(disposableDomains);

/** Any subdomain of these is disposable too (e.g. `abc.mailinator.com`). */
const WILDCARD = new Set<string>(disposableWildcards);

/** Seen driving the September 2026 sign-up wave; absent from the list above. */
const OBSERVED = ['facaimail.com', 'uberip.com'];

function extraFromEnv(): Set<string> {
  return new Set(
    [...OBSERVED, ...(process.env.BLOCKED_EMAIL_DOMAINS ?? '').split(',')]
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Domain part after the last `@`, lowercased; empty if there is none. */
function domainOf(email: string): string {
  const at = email.lastIndexOf('@');
  return at === -1 ? '' : email.slice(at + 1).trim().toLowerCase();
}

/**
 * Whether `email` is on a throwaway domain. Parent domains are checked too,
 * so a random subdomain of a blocked service doesn't slip past.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = domainOf(email);
  if (!domain) return false;

  // Read per call so an env change takes effect on restart without a rebuild,
  // and so tests can set it.
  const extra = extraFromEnv();

  const labels = domain.split('.');
  for (let i = 0; i < labels.length - 1; i++) {
    const candidate = labels.slice(i).join('.');
    if (i === 0 && EXACT.has(candidate)) return true;
    if (WILDCARD.has(candidate) || extra.has(candidate)) return true;
  }
  return false;
}
