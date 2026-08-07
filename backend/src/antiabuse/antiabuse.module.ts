import { Module } from '@nestjs/common';
import { AntiabuseService } from './antiabuse.service';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [AntiabuseService, PrismaService],
  exports: [AntiabuseService],
})
export class AntiabuseModule {}
