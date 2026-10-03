import { keyringFromEnv, openSecret, sealSecret } from './secret-box';

const JWT = 'j'.repeat(64);
const DEDICATED = 'd'.repeat(64);

describe('secret box', () => {
  it('seals and opens, and the sealed form does not contain the secret', () => {
    const ring = keyringFromEnv('totp', { JWT_SECRET: JWT, TOTP_ENCRYPTION_KEY: DEDICATED });
    const sealed = sealSecret('JBSWY3DPEHPK3PXP', ring);

    expect(sealed).not.toContain('JBSWY3DPEHPK3PXP');
    expect(sealed.startsWith('v1.k1.')).toBe(true);
    expect(openSecret(sealed, ring)).toBe('JBSWY3DPEHPK3PXP');
  });

  it('never seals the same value to the same text', () => {
    const ring = keyringFromEnv('totp', { JWT_SECRET: JWT });
    expect(sealSecret('same', ring)).not.toBe(sealSecret('same', ring));
  });

  it('falls back to a JWT_SECRET-derived key, and keeps opening it once a dedicated key is set', () => {
    const before = keyringFromEnv('totp', { JWT_SECRET: JWT });
    const sealed = sealSecret('seed', before);
    expect(sealed.startsWith('v1.k0.')).toBe(true);

    const after = keyringFromEnv('totp', { JWT_SECRET: JWT, TOTP_ENCRYPTION_KEY: DEDICATED });
    expect(openSecret(sealed, after)).toBe('seed');
  });

  it('fails loudly when the key it was sealed with is gone', () => {
    const sealed = sealSecret('seed', keyringFromEnv('totp', { JWT_SECRET: JWT }));
    const rotated = keyringFromEnv('totp', { JWT_SECRET: 'x'.repeat(64) });
    expect(() => openSecret(sealed, rotated)).toThrow();
  });

  it('rejects a tampered value instead of decrypting it to garbage', () => {
    const ring = keyringFromEnv('totp', { JWT_SECRET: JWT });
    const parts = sealSecret('seed', ring).split('.');
    const body = Buffer.from(parts[4], 'base64url');
    body[0] ^= 1;
    parts[4] = body.toString('base64url');
    expect(() => openSecret(parts.join('.'), ring)).toThrow();
    expect(() => openSecret('not sealed', ring)).toThrow();
  });

  it('keeps keys for different purposes apart', () => {
    const totp = keyringFromEnv('totp', { JWT_SECRET: JWT });
    const other = keyringFromEnv('other', { JWT_SECRET: JWT });
    expect(() => openSecret(sealSecret('seed', totp), other)).toThrow();
  });
});
