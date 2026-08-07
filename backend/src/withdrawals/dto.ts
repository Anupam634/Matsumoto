import { IsNumber, IsString, Min } from 'class-validator';

export class RequestWithdrawalDto {
  /** Amount in whole/decimal Matsumoto Points (min 100 — SPEC §4). */
  @IsNumber()
  @Min(100, { message: 'Minimum withdrawal is 100 points.' })
  points!: number;

  /** BNB Chain address that receives the $Matsumoto payout. */
  @IsString()
  toAddress!: string;
}
