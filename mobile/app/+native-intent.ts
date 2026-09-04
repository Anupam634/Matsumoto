/**
 * Maps incoming universal / app links onto the app's own routes.
 *
 * The web app's auth page lives at `/{locale}/login`; the same URL, opened on
 * a phone with the app installed, lands here. A `?ref=` (an invite link) or
 * `?mode=register` means "create an account" on the web too, so both go to
 * sign-up with the referral code carried across; a bare login goes to sign-in.
 * Every other path is left for the router to resolve as-is.
 */

const LOGIN_PATH = /^\/(?:(?:en|zh|ko)\/)?login\/?$/;

export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  try {
    // A base is required for a bare path; any origin will do for parsing.
    const url = new URL(path, 'https://bondkoinlabs.com');
    if (!LOGIN_PATH.test(url.pathname)) return path;

    const ref = url.searchParams.get('ref')?.trim();
    const register = !!ref || url.searchParams.get('mode') === 'register';
    if (!register) return '/(auth)/sign-in';
    return ref
      ? `/(auth)/sign-up?ref=${encodeURIComponent(ref)}`
      : '/(auth)/sign-up';
  } catch {
    return path;
  }
}
