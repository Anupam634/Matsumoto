import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../auth/auth.module';
import { MiningModule } from '../mining/mining.module';

/**
 * Composition only — it owns no service of its own, it just serves the
 * dashboard's three reads over one request. Both modules already export what
 * it needs.
 */
@Module({
  imports: [AuthModule, MiningModule],
  controllers: [DashboardController],
})
export class DashboardModule {}
