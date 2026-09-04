import { checkJwtSecret, MIN_JWT_SECRET_LENGTH } from './jwt-secret';

const strong = 'a'.repeat(MIN_JWT_SECRET_LENGTH);

describe('checkJwtSecret', () => {
  it('accepts a long secret and trims it', () => {
    expect(checkJwtSecret(`  ${strong}  `)).toEqual({ secret: strong });
  });

  it('refuses a missing secret rather than falling back', () => {
    // The whole point: there is no default. Miner and admin tokens share this
    // key, so a silent fallback is a forgeable admin session.
    expect(() => checkJwtSecret(undefined)).toThrow(/not set/i);
    expect(() => checkJwtSecret('')).toThrow(/not set/i);
    expect(() => checkJwtSecret('   ')).toThrow(/not set/i);
  });

  it('refuses the values that shipped in the repo', () => {
    expect(() =>
      checkJwtSecret(
        'bondkoin_super_secret_jwt_key_production_fallback_key_2026',
      ),
    ).toThrow(/repository/i);
    expect(() =>
      checkJwtSecret('bondkoin_super_secret_jwt_key_change_me_in_production'),
    ).toThrow(/repository/i);
  });

  it('warns about a short secret but still boots on it', () => {
    // A short key is weak, not published. Taking the API down for it means
    // the rule gets deleted the first time it fires in production.
    const result = checkJwtSecret('short');

    expect(result.secret).toBe('short');
    expect(result.warning).toMatch(/5 characters/);
    expect(result.warning).toMatch(/openssl rand -hex 32/);
  });

  it('does not warn once the secret is long enough', () => {
    expect(checkJwtSecret(strong).warning).toBeUndefined();
  });
});
