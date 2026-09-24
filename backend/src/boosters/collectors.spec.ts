import { COLLECTORS, DEFAULT_COLLECTOR, collectorByAddress } from './collectors';

/**
 * Invariants of the live wallet list. Deliberately not asserting any
 * particular cap: that number is a business decision that changes (the
 * shareholder wallet sits at 0 — switched off — today), and a test pinning it
 * would only ever be updated in the same commit that changed it.
 */
describe('the live collector list', () => {
  it('has exactly one uncapped wallet for everything to fall back to', () => {
    expect(COLLECTORS.filter((c) => c.dailyCapUsd == null)).toHaveLength(1);
    expect(DEFAULT_COLLECTOR.dailyCapUsd).toBeNull();
  });

  it('never carries a negative cap, which would read as "off" by accident', () => {
    for (const c of COLLECTORS) {
      if (c.dailyCapUsd != null) expect(c.dailyCapUsd).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every wallet a distinct id and a checksummed address', () => {
    const ids = COLLECTORS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of COLLECTORS) {
      expect(c.walletAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
      // Addresses are run through ethers.getAddress, so the lookup a payment
      // verification does must find them whatever case it is handed.
      expect(collectorByAddress(c.walletAddress.toLowerCase())?.id).toBe(c.id);
    }
  });
});
