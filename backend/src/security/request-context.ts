/**
 * Who is on the other end of a request, as far as the security logs care.
 *
 * `ip` is `req.ip`, which honours the `trust proxy: 1` set in main.ts — the
 * address nginx saw, not a header the client wrote (see clientIp in
 * auth.controller.ts for why that distinction mattered here before).
 */
export interface RequestContext {
  ip?: string;
  fingerprint?: string;
  platform?: string;
  userAgent?: string;
}

/** Long enough to tell browsers and app builds apart; short enough to store. */
const USER_AGENT_MAX = 200;

export function requestContext(
  req: any,
  extra: { fingerprint?: string; platform?: string } = {},
): RequestContext {
  const userAgent = req?.headers?.['user-agent'];
  return {
    ip: req?.ip ?? req?.socket?.remoteAddress ?? undefined,
    userAgent: typeof userAgent === 'string' ? userAgent.slice(0, USER_AGENT_MAX) : undefined,
    fingerprint: extra.fingerprint,
    platform: extra.platform,
  };
}
