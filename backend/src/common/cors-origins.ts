/**
 * Browser origins allowed to call this API.
 *
 * The front end is on a different host, so CORS has to be open to *it* —
 * but reflecting whatever `Origin` arrives, with credentials enabled, makes
 * every endpoint callable from any page on the internet. Override the
 * defaults with CORS_ORIGINS as a comma-separated list.
 */
export const DEFAULT_ORIGINS = [
  'https://bondkoinlabs.com',
  'https://www.bondkoinlabs.com',
  'http://localhost:3000',
];

export function allowedOrigins(env: string | undefined = process.env.CORS_ORIGINS): string[] {
  const configured = (env ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return configured.length > 0 ? configured : DEFAULT_ORIGINS;
}

/**
 * Whether a request's Origin may be answered.
 *
 * A missing Origin is allowed: that is curl, a health check or another
 * server, none of which CORS is protecting anything from.
 */
export function isOriginAllowed(
  origin: string | undefined,
  origins: string[],
): boolean {
  if (!origin) return true;
  return origins.includes(origin);
}
