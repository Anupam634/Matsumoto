import { canonicalizeEmail, isSameMailbox } from './canonical-email';

describe('canonicalizeEmail', () => {
  it('trims and lowercases the stored form', () => {
    const result = canonicalizeEmail('  Xyz@Gmail.COM  ');
    expect(result.normalized).toBe('xyz@gmail.com');
  });

  it('folds dots out of a gmail local part', () => {
    expect(canonicalizeEmail('xy.z@gmail.com').canonical).toBe('xyz@gmail.com');
    expect(canonicalizeEmail('x.y.z@gmail.com').canonical).toBe('xyz@gmail.com');
  });

  it('folds a gmail +tag away', () => {
    expect(canonicalizeEmail('xyz+spare@gmail.com').canonical).toBe('xyz@gmail.com');
    expect(canonicalizeEmail('x.y.z+a.b@gmail.com').canonical).toBe('xyz@gmail.com');
  });

  it('treats googlemail.com as gmail.com', () => {
    expect(canonicalizeEmail('xy.z@googlemail.com').canonical).toBe('xyz@gmail.com');
  });

  it('leaves the normalized form alone while folding the canonical one', () => {
    const result = canonicalizeEmail('Xy.Z+tag@googlemail.com');
    // What we mail and store is still what the user typed, lowercased.
    expect(result.normalized).toBe('xy.z+tag@googlemail.com');
    expect(result.canonical).toBe('xyz@gmail.com');
    expect(result.aliases).toBe(true);
  });

  it('does NOT fold dots or tags on other domains', () => {
    // These are distinct mailboxes on most providers; merging them would lock
    // real users out of their own accounts.
    expect(canonicalizeEmail('xy.z@outlook.com').canonical).toBe('xy.z@outlook.com');
    expect(canonicalizeEmail('xyz+tag@outlook.com').canonical).toBe('xyz+tag@outlook.com');
    expect(canonicalizeEmail('xy.z@company.co.in').aliases).toBe(false);
  });

  it('splits on the last @, not the first', () => {
    const result = canonicalizeEmail('"a@b".c@gmail.com');
    expect(result.canonicalDomain).toBe('gmail.com');
    expect(result.canonical).toBe('"a@b"c@gmail.com');
  });

  it('passes unparseable input through instead of throwing', () => {
    for (const junk of ['', '   ', 'not-an-email', '@gmail.com', 'xyz@']) {
      const result = canonicalizeEmail(junk);
      expect(result.canonical).toBe(junk.trim().toLowerCase());
      expect(result.aliases).toBe(false);
    }
  });

  it('survives a null-ish value', () => {
    expect(canonicalizeEmail(undefined as unknown as string).canonical).toBe('');
  });
});

describe('isSameMailbox', () => {
  it('matches gmail aliases of one inbox', () => {
    expect(isSameMailbox('xyz@gmail.com', 'xy.z@gmail.com')).toBe(true);
    expect(isSameMailbox('xyz@gmail.com', 'x.y.z+work@googlemail.com')).toBe(true);
  });

  it('keeps genuinely different addresses apart', () => {
    expect(isSameMailbox('xyz@gmail.com', 'xyzz@gmail.com')).toBe(false);
    expect(isSameMailbox('xyz@gmail.com', 'xyz@outlook.com')).toBe(false);
    expect(isSameMailbox('xy.z@outlook.com', 'xyz@outlook.com')).toBe(false);
  });
});
