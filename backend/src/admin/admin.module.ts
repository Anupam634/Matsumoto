import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminBootstrapService } from './admin-bootstrap.service';
import { AdminController, AdminSecureController } from './admin.controller';
import { AdminAuthGuard } from './admin.guard';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';
import { WithdrawalsModule } from '../withdrawals/withdrawals.module';
import { TasksService } from '../tasks/tasks.service';

/**
 * Admin panel API (SPEC §6). Imports AuthModule purely for its configured
 * JwtModule — admin sessions are a separate token type (`typ: 'admin'`)
 * checked by AdminAuthGuard, not the miner JwtAuthGuard.
 */
@Module({
  imports: [AuthModule, WithdrawalsModule],
  controllers: [AdminController, AdminSecureController],
  providers: [
    AdminService,
    AdminAuthGuard,
    PrismaService,
    AdminBootstrapService,
    TasksService,
  ],
})
export class AdminModule {}
