import { ethers } from 'ethers';

/**
 * Wallets a booster payment can be routed to, and the rule each one is
 * capped by. Deliberately hardcoded rather than read from env/config: these
 * are business-decided payout destinations, not per-deployment settings, and
 * keeping them in code means they show up in code review and git history
 * like any other change to where the platform's money goes.
 *
 * Every collector is paid in whatever token `ChainReaderService` is
 * configured for (BEP-20 USDT by default) — this list only decides *which*
 * address a given purchase is quoted to pay, not the token or chain.
 */
export interface CollectorConfig {
  /** Stable id, stored on `BoosterPurchase.collectorId`. Never reused. */
  id: string;
  /** Human label for admin screens. */
  label: string;
  walletAddress: string;
  /**
   * Maximum USD this wallet may be assigned across a UTC calendar day,
   * counting only CONFIRMED purchases. `null` means uncapped — the
   * catch-all a purchase falls back to once every capped collector for the
   * day is full. `0` switches the wallet off: nothing routes to it, while it
   * stays visible in the finance module with its history intact.
   */
  dailyCapUsd: number | null;
}

export const COLLECTORS: readonly CollectorConfig[] = [
  {
    id: 'default',
    label: 'Primary treasury',
    walletAddress: ethers.getAddress(
      '0x8E1A28572f4A0EB9699BCf2a3d93eCa5417Ab96c',
    ),
    dailyCapUsd: null,
  },
  {
    id: 'shareholder-1',
    label: 'Shareholder wallet 1',
    walletAddress: ethers.getAddress(
      '0x14542e192DFC617f394B63C3BA635818dC9B1927',
    ),
    // Switched off for now: every purchase goes to the treasury instead.
    // Raise it back to route a share of each UTC day here again — the
    // wallet, its id and its past payments are all untouched by this.
    dailyCapUsd: 0,
  },
];

/** The uncapped collector every purchase eventually falls back to. */
export const DEFAULT_COLLECTOR: CollectorConfig = COLLECTORS.find(
  (c) => c.dailyCapUsd === null,
)!;

export function collectorById(id: string): CollectorConfig | undefined {
  return COLLECTORS.find((c) => c.id === id);
}

export function collectorByAddress(
  address: string,
): CollectorConfig | undefined {
  const wanted = address.toLowerCase();
  return COLLECTORS.find((c) => c.walletAddress.toLowerCase() === wanted);
}
