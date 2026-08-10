import {
  verifyPayment,
  DEFAULT_POLICY,
  type ObservedPayment,
  type PaymentExpectation,
} from './payment.rules';

const PAY_TO = '0x1111111111111111111111111111111111111111';
const PAYER = '0x2222222222222222222222222222222222222222';
const TOKEN = '0x55d398326f99059fF775485246999027B3197955'; // BSC-USDT
const INTENT_AT = new Date('2026-01-01T12:00:00Z');

const expectation = (over: Partial<PaymentExpectation> = {}): PaymentExpectation => ({
  payToAddress: PAY_TO,
  fromAddress: PAYER,
  expectedUnits: 5_000_000_000_000_000_000n, // 5 USDT @ 18dp
  tokenAddress: TOKEN,
  intentCreatedAt: INTENT_AT,
  ...over,
});

const observed = (over: Partial<ObservedPayment> = {}): ObservedPayment => ({
  from: PAYER,
  to: PAY_TO,
  units: 5_000_000_000_000_000_000n,
  tokenAddress: TOKEN,
  confirmations: DEFAULT_POLICY.minConfirmations,
  minedAt: new Date(INTENT_AT.getTime() + 60_000),
  succeeded: true,
  ...over,
});

describe('verifyPayment', () => {
  it('accepts an exact, confirmed payment', () => {
    expect(verifyPayment(expectation(), observed())).toEqual({ ok: true });
  });

  it('accepts overpayment', () => {
    const v = verifyPayment(
      expectation(),
      observed({ units: 9_000_000_000_000_000_000n }),
    );
    expect(v.ok).toBe(true);
  });

  it('is case-insensitive about address checksums', () => {
    const v = verifyPayment(
      expectation(),
      observed({ to: PAY_TO.toUpperCase().replace('0X', '0x') }),
    );
    expect(v.ok).toBe(true);
  });

  it('rejects a reverted transaction', () => {
    const v = verifyPayment(expectation(), observed({ succeeded: false }));
    expect(v).toMatchObject({ ok: false, reason: 'TX_FAILED' });
  });

  it('rejects until it has enough confirmations', () => {
    const v = verifyPayment(expectation(), observed({ confirmations: 1 }));
    expect(v).toMatchObject({ ok: false, reason: 'NOT_ENOUGH_CONFIRMATIONS' });
  });

  it('rejects payment sent somewhere else', () => {
    const v = verifyPayment(
      expectation(),
      observed({ to: '0x9999999999999999999999999999999999999999' }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'WRONG_RECIPIENT' });
  });

  it("rejects someone else's transaction hash", () => {
    const v = verifyPayment(
      expectation(),
      observed({ from: '0x8888888888888888888888888888888888888888' }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'WRONG_SENDER' });
  });

  it('rejects a different token', () => {
    const v = verifyPayment(
      expectation(),
      observed({ tokenAddress: '0xdeadbeef00000000000000000000000000000000' }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'WRONG_TOKEN' });
  });

  it('rejects a native transfer against a BEP-20 intent', () => {
    const v = verifyPayment(expectation(), observed({ tokenAddress: undefined }));
    expect(v).toMatchObject({ ok: false, reason: 'WRONG_TOKEN' });
  });

  it('rejects a token transfer against a native intent', () => {
    const v = verifyPayment(
      expectation({ tokenAddress: undefined }),
      observed({ tokenAddress: TOKEN }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'WRONG_TOKEN' });
  });

  it('rejects underpayment, even by one unit', () => {
    const v = verifyPayment(
      expectation(),
      observed({ units: 4_999_999_999_999_999_999n }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'UNDERPAID' });
  });

  it('rejects an old transfer being replayed against a new intent', () => {
    const v = verifyPayment(
      expectation(),
      observed({ minedAt: new Date(INTENT_AT.getTime() - 6 * 3_600_000) }),
    );
    expect(v).toMatchObject({ ok: false, reason: 'TOO_OLD' });
  });

  it('tolerates paying slightly before the intent was created', () => {
    const v = verifyPayment(
      expectation(),
      observed({ minedAt: new Date(INTENT_AT.getTime() - 5 * 60_000) }),
    );
    expect(v.ok).toBe(true);
  });
});
