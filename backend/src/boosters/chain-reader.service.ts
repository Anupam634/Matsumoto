import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import type { ObservedPayment } from './payment.rules';

/** `Transfer(address indexed from, address indexed to, uint256 value)` */
const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

export interface PaymentConfig {
  /** Address users pay into. */
  payToAddress: string;
  tokenSymbol: string;
  /** BEP-20 contract, or undefined when accepting native BNB. */
  tokenAddress?: string;
  decimals: number;
  /** Token units per 1 USD. 1 for a dollar stablecoin. */
  unitsPerUsd: number;
  enabled: boolean;
  /** Why it's disabled, for a clear API error. */
  disabledReason?: string;
}

/**
 * Reads a transaction off BNB Chain and reduces it to the facts
 * `payment.rules` needs. Contains no accept/reject policy of its own — it
 * only reports what the chain says.
 */
@Injectable()
export class ChainReaderService {
  private readonly logger = new Logger(ChainReaderService.name);
  private provider?: ethers.JsonRpcProvider;
  readonly config: PaymentConfig;

  constructor(cfg: ConfigService) {
    const payToAddress = cfg.get<string>('BOOSTER_PAY_TO_ADDRESS') ?? '';
    const symbol = (cfg.get<string>('BOOSTER_PAY_TOKEN') ?? 'USDT').toUpperCase();
    const rpc =
      cfg.get<string>('BOOSTER_RPC_URL') ??
      cfg.get<string>('BSC_RPC_URL') ??
      '';

    const isNative = symbol === 'BNB';
    const tokenAddress = isNative
      ? undefined
      : cfg.get<string>('BOOSTER_PAY_TOKEN_ADDRESS');
    const decimals = Number(cfg.get('BOOSTER_PAY_TOKEN_DECIMALS') ?? 18);

    // Plans are priced in USD. A dollar stablecoin maps 1:1; native BNB does
    // not, and inventing a rate would misprice every purchase — so BNB stays
    // disabled unless an explicit rate is configured.
    const bnbPerUsd = cfg.get<string>('BOOSTER_BNB_PER_USD');
    const unitsPerUsd = isNative ? Number(bnbPerUsd ?? 0) : 1;

    let disabledReason: string | undefined;
    if (!payToAddress) disabledReason = 'BOOSTER_PAY_TO_ADDRESS is not set.';
    else if (!rpc) disabledReason = 'No BSC RPC URL is configured.';
    else if (!isNative && !tokenAddress)
      disabledReason = 'BOOSTER_PAY_TOKEN_ADDRESS is not set.';
    else if (isNative && !(unitsPerUsd > 0))
      disabledReason =
        'Paying in BNB needs BOOSTER_BNB_PER_USD (a USD→BNB rate); ' +
        'without it the plan price cannot be converted.';

    this.config = {
      payToAddress,
      tokenSymbol: symbol,
      tokenAddress,
      decimals,
      unitsPerUsd,
      enabled: !disabledReason,
      disabledReason,
    };

    if (this.config.enabled) {
      this.provider = new ethers.JsonRpcProvider(rpc);
      this.logger.log(
        `Booster payments enabled: ${symbol} -> ${payToAddress}`,
      );
    } else {
      this.logger.warn(`Booster payments disabled — ${disabledReason}`);
    }
  }

  /** Smallest-unit price of a plan, given its USD price. */
  expectedUnits(priceUsd: number): bigint {
    const amount = priceUsd * this.config.unitsPerUsd;
    // toFixed avoids scientific notation for very small/large rates.
    return ethers.parseUnits(
      amount.toFixed(Math.min(this.config.decimals, 18)),
      this.config.decimals,
    );
  }

  humanAmount(units: bigint): string {
    return ethers.formatUnits(units, this.config.decimals);
  }

  /**
   * Look up a transaction and extract the transfer relevant to us.
   * Returns null when the hash is unknown or still unmined.
   */
  async observe(txHash: string): Promise<ObservedPayment | null> {
    if (!this.provider) return null;

    const [tx, receipt] = await Promise.all([
      this.provider.getTransaction(txHash),
      this.provider.getTransactionReceipt(txHash),
    ]);
    if (!tx || !receipt || receipt.blockNumber == null) return null;

    const block = await this.provider.getBlock(receipt.blockNumber);
    const minedAt = new Date((block?.timestamp ?? 0) * 1000);
    const confirmations = await receipt.confirmations();
    const succeeded = receipt.status === 1;

    if (!this.config.tokenAddress) {
      // Native BNB: the value rides on the transaction itself.
      return {
        from: tx.from,
        to: tx.to ?? '',
        units: tx.value,
        tokenAddress: undefined,
        confirmations,
        minedAt,
        succeeded,
      };
    }

    // BEP-20: find a Transfer log from the configured token addressed to us.
    // Summing would let a single tx that pays us twice count once per log, so
    // we take the largest matching transfer instead.
    const wanted = this.config.payToAddress.toLowerCase();
    let best: { from: string; units: bigint } | null = null;

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.config.tokenAddress.toLowerCase())
        continue;
      if (log.topics[0] !== TRANSFER_TOPIC || log.topics.length < 3) continue;

      const from = ethers.getAddress('0x' + log.topics[1].slice(26));
      const to = ethers.getAddress('0x' + log.topics[2].slice(26));
      if (to.toLowerCase() !== wanted) continue;

      const units = BigInt(log.data);
      if (!best || units > best.units) best = { from, units };
    }

    if (!best) {
      // A real transaction that simply didn't pay us. Report it as a
      // zero-value transfer to the right token so the rules layer rejects it
      // with UNDERPAID/WRONG_RECIPIENT rather than us throwing here.
      return {
        from: tx.from,
        to: '',
        units: 0n,
        tokenAddress: this.config.tokenAddress,
        confirmations,
        minedAt,
        succeeded,
      };
    }

    return {
      from: best.from,
      to: this.config.payToAddress,
      units: best.units,
      tokenAddress: this.config.tokenAddress,
      confirmations,
      minedAt,
      succeeded,
    };
  }
}
