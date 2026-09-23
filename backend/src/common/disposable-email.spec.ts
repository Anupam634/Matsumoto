import { isDisposableEmail } from './disposable-email';

describe('isDisposableEmail', () => {
  const saved = process.env.BLOCKED_EMAIL_DOMAINS;
  afterEach(() => {
    process.env.BLOCKED_EMAIL_DOMAINS = saved;
  });

  it('allows ordinary mail providers', () => {
    for (const e of ['a@gmail.com', 'b@outlook.com', 'c@qq.com', 'd@yahoo.com', 'hello@bondkoinlabs.com']) {
      expect(isDisposableEmail(e)).toBe(false);
    }
  });

  it('blocks domains on the published list', () => {
    expect(isDisposableEmail('x@mailinator.com')).toBe(true);
  });

  it('blocks the domains seen in the production sign-up wave', () => {
    expect(isDisposableEmail('dn3cp5abt@facaimail.com')).toBe(true);
    expect(isDisposableEmail('kiensam568@uberip.com')).toBe(true);
  });

  it('is case-insensitive and ignores surrounding whitespace', () => {
    expect(isDisposableEmail('X@FacaiMail.COM ')).toBe(true);
  });

  it('blocks subdomains of blocked services', () => {
    expect(isDisposableEmail('x@abc.facaimail.com')).toBe(true);
  });

  it('picks up extra domains from BLOCKED_EMAIL_DOMAINS', () => {
    expect(isDisposableEmail('x@newtemp.example')).toBe(false);
    process.env.BLOCKED_EMAIL_DOMAINS = ' newtemp.example , other.test';
    expect(isDisposableEmail('x@newtemp.example')).toBe(true);
    expect(isDisposableEmail('x@other.test')).toBe(true);
  });

  it('does not treat an address without a domain as disposable', () => {
    expect(isDisposableEmail('not-an-email')).toBe(false);
  });
});
