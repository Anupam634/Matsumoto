import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { AntiabuseModule } from './antiabuse/antiabuse.module';
import { MiningModule } from './mining/mining.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { AdminModule } from './admin/admin.module';
import { TasksModule } from './tasks/tasks.module';
import { KycModule } from './kyc/kyc.module';

/**
 * Root module. Feature modules that are still stubs (boosters, referrals) get wired here as they are built out.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    AntiabuseModule,
    MiningModule,
    WithdrawalsModule,
    AdminModule,
    TasksModule,
    KycModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
