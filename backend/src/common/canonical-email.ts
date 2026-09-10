/**
 * Canonical form of an email address, for "is this the same mailbox?" checks.
 *
 * Gmail ignores dots in the local part and everything from a `+` onwards, so
 * `xyz@gmail.com`, `xy.z@gmail.com`, `x.y.z@gmail.com` and `xyz+spare@gmail.com`
 * are one inbox — and `googlemail.com` is the same service under another name.
 * Sign-up only ever compared the address as typed, so the dot variant looked
 * like a free address: it passed the "already registered" check, sent an OTP to
 * a mailbox that already held an account, and opened a second one on it.
 *
 * Only Google's domains get this treatment. Dots and `+` tags are ordinary
 * address characters elsewhere, and folding them would merge genuinely
 * separate mailboxes into one — a far worse failure than the one being fixed.
 */

/** Domains that deliver dot- and plus-variants to a single mailbox. */
const GOOGLE_MAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/** The one domain every Google alias is folded onto. */
const GOOGLE_CANONICAL_DOMAIN = 'gmail.com';

export interface CanonicalEmail {
  /** The address as it should be stored and mailed: trimmed and lowercased. */
  normalized: string;
  /** Local part of the canonical form, with dots and any `+` tag removed. */
  canonicalLocal: string;
  /** Domain of the canonical form; Google aliases collapse to `gmail.com`. */
  canonicalDomain: string;
  /** `canonicalLocal@canonicalDomain` — equal for any two aliases of one mailbox. */
  canonical: string;
  /** Whether this domain aliases, i.e. whether canonical can differ from normalized. */
  aliases: boolean;
}

/**
 * Split and fold `rawEmail`. Never throws: an address that does not parse
 * comes back with its canonical form equal to its normalized form, so callers
 * fall through to the exact-match path and the DTO validator stays the single
 * place that decides what a valid address is.
 */
export function canonicalizeEmail(rawEmail: string): CanonicalEmail {
  const normalized = (rawEmail ?? '').trim().toLowerCase();

  // Split on the LAST '@': the local part may legally contain one when quoted,
  // and the domain never can.
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    return {
      normalized,
      canonicalLocal: normalized,
      canonicalDomain: '',
      canonical: normalized,
      aliases: false,
    };
  }

  const local = normalized.slice(0, at);
  const domain = normalized.slice(at + 1);

  if (!GOOGLE_MAIL_DOMAINS.has(domain)) {
    return {
      normalized,
      canonicalLocal: local,
      canonicalDomain: domain,
      canonical: normalized,
      aliases: false,
    };
  }

  const untagged = local.split('+')[0];
  const canonicalLocal = untagged.replace(/\./g, '');

  return {
    normalized,
    canonicalLocal,
    canonicalDomain: GOOGLE_CANONICAL_DOMAIN,
    canonical: `${canonicalLocal}@${GOOGLE_CANONICAL_DOMAIN}`,
    aliases: true,
  };
}

/** Whether two addresses reach the same mailbox. */
export function isSameMailbox(a: string, b: string): boolean {
  return canonicalizeEmail(a).canonical === canonicalizeEmail(b).canonical;
}
