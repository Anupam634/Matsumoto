import { Module } from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { ReferralsController } from './referrals.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
  exports: [ReferralsService],
})
export class ReferralsModule {}
