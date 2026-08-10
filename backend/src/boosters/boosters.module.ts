import { Module } from '@nestjs/common';
import { BoostersService } from './boosters.service';
import { BoostersController } from './boosters.controller';
import { ChainReaderService } from './chain-reader.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [BoostersController],
  providers: [BoostersService, ChainReaderService, PrismaService],
})
export class BoostersModule {}
