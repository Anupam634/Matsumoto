import { Module } from '@nestjs/common';
import { KycService } from './kyc.service';
import { KycController, KycAdminController } from './kyc.controller';
import { AdminAuthGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Imports AuthModule for its configured JwtModule, which both guards need:
 * JwtAuthGuard for the miner routes and AdminAuthGuard for the review queue.
 */
@Module({
  imports: [AuthModule],
  controllers: [KycController, KycAdminController],
  providers: [KycService, AdminAuthGuard, PrismaService],
})
export class KycModule {}
