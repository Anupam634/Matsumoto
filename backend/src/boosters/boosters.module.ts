import { Module } from '@nestjs/common';
import { BoostersService } from './boosters.service';
import { BoostersController } from './boosters.controller';
import { ChainReaderService } from './chain-reader.service';
import { CollectorService } from './collector.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // provides JwtAuthGuard
  controllers: [BoostersController],
  providers: [BoostersService, ChainReaderService, CollectorService],
  exports: [CollectorService],
})
export class BoostersModule {}
