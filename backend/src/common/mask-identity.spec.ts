import { maskIdentity } from './mask-identity';

describe('maskIdentity', () => {
  it('keeps two characters of the local part and the domain', () => {
    expect(maskIdentity({ id: 'abc123', email: 'anupam@gmail.com' })).toBe(
      'an***@gmail.com',
    );
  });

  it('never reveals a whole short local part', () => {
    expect(maskIdentity({ id: 'abc123', email: 'ab@gmail.com' })).toBe(
      'a***@gmail.com',
    );
    expect(maskIdentity({ id: 'abc123', email: 'a@gmail.com' })).toBe(
      'a***@gmail.com',
    );
  });

  it('falls back to a short handle for wallet-only accounts', () => {
    expect(maskIdentity({ id: 'clx0000zzzz', email: null })).toBe('Miner zzzz');
  });
});
