import {
  base32Decode,
  base32Encode,
  generateTotpSecret,
  hotp,
  matchTotp,
  otpauthUrl,
  totpStep,
} from './totp';

/**
 * RFC 6238 Appendix B, SHA-1 column. The RFC prints eight digits; Google
 * Authenticator shows six, which are the last six of the same number.
 * Secret: the ASCII bytes "12345678901234567890".
 */
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890', 'ascii'));
const RFC_VECTORS: [number, string][] = [
  [59, '94287082'],
  [1111111109, '07081804'],
  [1111111111, '14050471'],
  [1234567890, '89005924'],
  [2000000000, '69279037'],
  [20000000000, '65353130'],
];

describe('TOTP', () => {
  it('encodes the RFC secret the way authenticator apps expect', () => {
    expect(RFC_SECRET).toBe('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ');
  });

  it.each(RFC_VECTORS)('matches RFC 6238 at t=%i', (seconds, eight) => {
    const key = base32Decode(RFC_SECRET);
    expect(hotp(key, totpStep(seconds * 1000), 8)).toBe(eight);
    expect(hotp(key, totpStep(seconds * 1000))).toBe(eight.slice(-6));
  });

  it('accepts the current code and one step either side, and no further', () => {
    const now = 1234567890 * 1000;
    const key = base32Decode(RFC_SECRET);
    const step = totpStep(now);

    expect(matchTotp(RFC_SECRET, hotp(key, step), now)).toBe(step);
    expect(matchTotp(RFC_SECRET, hotp(key, step - 1), now)).toBe(step - 1);
    expect(matchTotp(RFC_SECRET, hotp(key, step + 1), now)).toBe(step + 1);
    expect(matchTotp(RFC_SECRET, hotp(key, step - 2), now)).toBeNull();
    expect(matchTotp(RFC_SECRET, hotp(key, step + 2), now)).toBeNull();
  });

  it('refuses anything that is not six digits before doing any work', () => {
    const now = 59_000;
    for (const junk of ['', '12345', '1234567', 'abcdef', '28708a', '287 08']) {
      expect(matchTotp(RFC_SECRET, junk, now)).toBeNull();
    }
    // Spaces between groups are what people paste from some apps.
    expect(matchTotp(RFC_SECRET, '287 082', now)).toBe(totpStep(now));
  });

  it('round-trips base32, ignoring the spaces and case people type', () => {
    const bytes = Buffer.from('any bytes at all, of any length!');
    const text = base32Encode(bytes);
    expect(base32Decode(text)).toEqual(bytes);
    expect(base32Decode(text.toLowerCase().replace(/(.{4})/g, '$1 '))).toEqual(bytes);
    expect(() => base32Decode('NOT-BASE32-1!')).toThrow();
  });

  it('generates 160-bit secrets that differ every time', () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(base32Decode(a)).toHaveLength(20);
    expect(a).not.toBe(b);
  });

  it('builds the otpauth link Google Authenticator scans', () => {
    const url = new URL(otpauthUrl('JBSWY3DPEHPK3PXP', 'miner@example.com'));
    expect(url.protocol).toBe('otpauth:');
    expect(url.host).toBe('totp');
    expect(decodeURIComponent(url.pathname)).toBe('/BONDKOIN:miner@example.com');
    expect(url.searchParams.get('secret')).toBe('JBSWY3DPEHPK3PXP');
    expect(url.searchParams.get('issuer')).toBe('BONDKOIN');
    expect(url.searchParams.get('digits')).toBe('6');
    expect(url.searchParams.get('period')).toBe('30');
  });
});
