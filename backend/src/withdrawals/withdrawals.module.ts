import { Module } from '@nestjs/common';
import { WithdrawalsService } from './withdrawals.service';
import { WithdrawalsController } from './withdrawals.controller';
import { WalletService } from '../wallet/wallet.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, WalletService],
  exports: [WithdrawalsService],
})
export class WithdrawalsModule {}
