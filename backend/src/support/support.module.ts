import { Module } from '@nestjs/common';
import { SupportService } from './support.service';
import { SupportController, SupportAdminController } from './support.controller';
import { AdminAuthGuard } from '../admin/admin.guard';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

/**
 * Imports AuthModule for its configured JwtModule, which both guards need:
 * JwtAuthGuard for the miner routes and AdminAuthGuard for the queue.
 */
@Module({
  imports: [AuthModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, AdminAuthGuard, PrismaService],
})
export class SupportModule {}
