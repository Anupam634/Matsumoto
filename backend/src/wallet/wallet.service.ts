import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

/**
 * Swappable chain layer. WALLET_MODE selects the backend:
 *
 *   offchain  — no chain calls; payouts are recorded as DB-only (demo/dev).
 *   testnet   — real transfers on BSC testnet against a mock BEP-20.
 *   mainnet   — real transfers on BNB Chain against the client's contract.
 *
 * Every other module depends only on this interface, so switching modes
 * never touches business logic.
 */

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export type WalletMode = 'offchain' | 'testnet' | 'mainnet';

export interface PayoutResult {
  txHash: string;
  onchain: boolean;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);
  private readonly mode: WalletMode;
  private provider?: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private token?: ethers.Contract;

  constructor(private readonly config: ConfigService) {
    this.mode = (this.config.get<string>('WALLET_MODE') ??
      'offchain') as WalletMode;

    if (this.mode !== 'offchain') {
      const rpc =
        this.mode === 'mainnet'
          ? this.config.getOrThrow<string>('BSC_RPC_URL')
          : this.config.getOrThrow<string>('BSC_TESTNET_RPC_URL');
      const pk = this.config.getOrThrow<string>('HOT_WALLET_PRIVATE_KEY');
      const contract = this.config.getOrThrow<string>(
        'MATSUMOTO_CONTRACT_ADDRESS',
      );
      this.provider = new ethers.JsonRpcProvider(rpc);
      this.signer = new ethers.Wallet(pk, this.provider);
      this.token = new ethers.Contract(contract, ERC20_ABI, this.signer);
    }
    this.logger.log(`WalletService running in "${this.mode}" mode`);
  }

  /** Send `amount` of $Matsumoto to `toAddress`. Amount is a decimal string. */
  async payout(toAddress: string, amount: string): Promise<PayoutResult> {
    if (this.mode === 'offchain' || !this.token) {
      // Deterministic pseudo-hash so the ledger has a reference in dev.
      const fake = ethers.id(`${toAddress}:${amount}:${Date.now()}`);
      this.logger.warn(`[offchain] simulated payout ${amount} -> ${toAddress}`);
      return { txHash: fake, onchain: false };
    }
    const decimals = Number(this.config.get('MATSUMOTO_DECIMALS') ?? 18);
    const value = ethers.parseUnits(amount, decimals);
    const tx = await this.token.transfer(toAddress, value);
    const receipt = await tx.wait();
    return { txHash: receipt.hash, onchain: true };
  }

  async tokenBalance(address: string): Promise<string> {
    if (this.mode === 'offchain' || !this.token) return '0';
    const decimals = Number(this.config.get('MATSUMOTO_DECIMALS') ?? 18);
    const raw: bigint = await this.token.balanceOf(address);
    return ethers.formatUnits(raw, decimals);
  }

  getMode(): WalletMode {
    return this.mode;
  }
}
