import { Module } from '@nestjs/common';
import { MiningService } from './mining.service';
import { MiningController } from './mining.controller';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [MiningController],
  providers: [MiningService, PrismaService],
  exports: [MiningService],
})
export class MiningModule {}
