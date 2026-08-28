import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { AntiabuseModule } from './antiabuse/antiabuse.module';
import { MiningModule } from './mining/mining.module';
import { WithdrawalsModule } from './withdrawals/withdrawals.module';
import { AdminModule } from './admin/admin.module';
import { TasksModule } from './tasks/tasks.module';
import { KycModule } from './kyc/kyc.module';
import { BoostersModule } from './boosters/boosters.module';
import { SupportModule } from './support/support.module';
import { HealthModule } from './health/health.module';
import { EmailModule } from './email/email.module';
import { ReferralsModule } from './referrals/referrals.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';

/**
 * Root module.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // A blanket per-IP ceiling. Deliberately generous — the dashboard polls
    // mining status, and this is a backstop against scripted abuse, not a
    // per-endpoint budget. The routes that need a real limit (anything that
    // sends mail) are capped per email address in EmailService, which holds
    // even if the proxy hides the client IP.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    EmailModule,
    AuthModule,
    AntiabuseModule,
    MiningModule,
    WithdrawalsModule,
    AdminModule,
    TasksModule,
    KycModule,
    SupportModule,
    HealthModule,
    BoostersModule,
    ReferralsModule,
    LeaderboardModule,
  ],
  providers: [
    PrismaService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
