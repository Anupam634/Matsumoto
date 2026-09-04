import { requireJwtSecret, MIN_JWT_SECRET_LENGTH } from './jwt-secret';

const strong = 'a'.repeat(MIN_JWT_SECRET_LENGTH);

describe('requireJwtSecret', () => {
  it('accepts a long secret and trims it', () => {
    expect(requireJwtSecret(`  ${strong}  `)).toBe(strong);
  });

  it('refuses a missing secret rather than falling back', () => {
    // The whole point: there is no default. Miner and admin tokens share this
    // key, so a silent fallback is a forgeable admin session.
    expect(() => requireJwtSecret(undefined)).toThrow(/not set/i);
    expect(() => requireJwtSecret('')).toThrow(/not set/i);
    expect(() => requireJwtSecret('   ')).toThrow(/not set/i);
  });

  it('refuses the values that shipped in the repo', () => {
    expect(() =>
      requireJwtSecret(
        'bondkoin_super_secret_jwt_key_production_fallback_key_2026',
      ),
    ).toThrow(/repository/i);
    expect(() =>
      requireJwtSecret('bondkoin_super_secret_jwt_key_change_me_in_production'),
    ).toThrow(/repository/i);
  });

  it('refuses a secret that is too short to be one', () => {
    expect(() => requireJwtSecret('short')).toThrow(/at least/i);
  });
});
