import { Module } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [LeaderboardController],
  providers: [LeaderboardService, PrismaService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
