import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateIntentDto {
  @IsString()
  @MinLength(1)
  planId!: string;

  /** Wallet the user will pay from — bound so nobody else can claim the tx. */
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Enter a valid BNB Chain address (0x…40 hex characters).',
  })
  fromAddress!: string;
}

export class SubmitPaymentDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{64}$/, {
    message: 'Enter a valid transaction hash (0x…64 hex characters).',
  })
  @MaxLength(66)
  txHash!: string;
}
