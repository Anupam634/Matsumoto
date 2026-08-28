import {
  allowedOrigins,
  DEFAULT_ORIGINS,
  isOriginAllowed,
} from './cors-origins';

describe('allowedOrigins', () => {
  it('falls back to the production and dev origins', () => {
    expect(allowedOrigins(undefined)).toEqual(DEFAULT_ORIGINS);
    expect(allowedOrigins('')).toEqual(DEFAULT_ORIGINS);
    expect(allowedOrigins('  ,  ')).toEqual(DEFAULT_ORIGINS);
  });

  it('parses a configured list, trimming blanks', () => {
    expect(allowedOrigins('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
  });
});

describe('isOriginAllowed', () => {
  const origins = ['https://www.bondkoinlabs.com'];

  it('allows a listed origin', () => {
    expect(isOriginAllowed('https://www.bondkoinlabs.com', origins)).toBe(true);
  });

  it('refuses anything else — the bug this replaced reflected them all', () => {
    expect(isOriginAllowed('https://evil.example.com', origins)).toBe(false);
    // Not a prefix or suffix match: a lookalike host must not slip through.
    expect(isOriginAllowed('https://www.bondkoinlabs.com.evil.com', origins)).toBe(false);
    expect(isOriginAllowed('http://www.bondkoinlabs.com', origins)).toBe(false);
  });

  it('allows a request with no Origin at all (curl, health checks)', () => {
    expect(isOriginAllowed(undefined, origins)).toBe(true);
  });
});
