import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('round-trips a correct password', async () => {
    const hash = await hashPassword('correct horse battery');
    await expect(verifyPassword('correct horse battery', hash)).resolves.toBe(
      true,
    );
  });

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery');
    await expect(verifyPassword('wrong horse battery', hash)).resolves.toBe(
      false,
    );
  });

  it('salts — the same password hashes differently every time', async () => {
    const a = await hashPassword('same-password');
    const b = await hashPassword('same-password');
    expect(a).not.toEqual(b);
    await expect(verifyPassword('same-password', a)).resolves.toBe(true);
    await expect(verifyPassword('same-password', b)).resolves.toBe(true);
  });

  it('encodes its parameters so they can be tuned later', async () => {
    const hash = await hashPassword('x');
    expect(hash.split('$')).toHaveLength(6);
    expect(hash.startsWith('scrypt$16384$8$1$')).toBe(true);
  });

  it('returns false for missing or malformed hashes instead of throwing', async () => {
    await expect(verifyPassword('x', null)).resolves.toBe(false);
    await expect(verifyPassword('x', undefined)).resolves.toBe(false);
    await expect(verifyPassword('x', '')).resolves.toBe(false);
    await expect(verifyPassword('x', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt$1$1$1$aa$bb')).resolves.toBe(
      false,
    );
    await expect(verifyPassword('x', 'scrypt$0$0$0$aa$bb')).resolves.toBe(
      false,
    );
    await expect(verifyPassword('x', 'scrypt$16384$8$1$$')).resolves.toBe(
      false,
    );
  });
});
