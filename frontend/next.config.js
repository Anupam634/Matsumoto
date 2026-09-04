const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./i18n.ts');

/**
 * Response headers for every page.
 *
 * The app had none. On a site where the whole value of a session is a
 * localStorage token and a withdrawal form, the defaults are worth setting:
 * a framed dashboard is a clickjacked "approve withdrawal" button, and a
 * sniffed content type is a stored KYC image served as script.
 *
 * The CSP is deliberately conservative rather than absent. `'unsafe-inline'`
 * on scripts stays for now because the App Router emits inline hydration
 * payloads and nothing here is wired up to mint a per-request nonce — but
 * pinning `script-src` to this origin still stops the usual delivery route,
 * which is a remote script. Tighten it to a nonce when there is a reason to
 * touch the middleware again.
 */
const isDev = process.env.NODE_ENV !== 'production';

/**
 * Origins the browser is allowed to call.
 *
 * The API lives on another host and its URL is configurable, so derive it
 * from NEXT_PUBLIC_API_URL rather than hardcoding it — a deploy that points
 * at a staging API would otherwise have every request blocked by its own CSP,
 * with the failure showing up only in the browser console. `next dev` talks
 * to a local API, so allow localhost there too.
 */
function connectSources() {
  const sources = new Set([
    "'self'",
    'https://bondkoinlabs.com',
    'https://api.bondkoinlabs.com',
    // The public BSC node the chain widgets read from.
    'https://bsc-dataseed.binance.org',
  ]);

  const api = process.env.NEXT_PUBLIC_API_URL;
  if (api) {
    try {
      sources.add(new URL(api).origin);
    } catch {
      // Not a URL we can parse — leave the defaults rather than emitting a
      // malformed directive, which browsers drop wholesale.
    }
  }
  if (isDev) {
    sources.add('http://localhost:*');
    sources.add('ws://localhost:*');
  }
  return Array.from(sources).join(' ');
}

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  // qrserver renders the referral QR; the wallet/chain logos and KYC previews
  // arrive as data:/blob: URIs.
  "img-src 'self' data: blob: https://api.qrserver.com",
  "font-src 'self' data:",
  `connect-src ${connectSources()}`,
  // The YouTube task modal.
  "frame-src https://www.youtube-nocookie.com https://www.youtube.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  // Belt to X-Frame-Options' braces; frame-ancestors is the header browsers
  // actually still honour.
  "frame-ancestors 'none'",
  // Meaningless over plain http in dev, and it would break `next dev`.
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // The KYC flow uses the camera; nothing else needs a device.
    value: 'camera=(self), microphone=(), geolocation=(), payment=()',
  },
  // Only meaningful over TLS, and setting it in dev pins localhost to https
  // in the browser's HSTS store, which is a genuinely annoying thing to undo.
  ...(isDev
    ? []
    : [
        {
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains',
        },
      ]),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nothing gains from advertising the framework version.
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = withNextIntl(nextConfig);
