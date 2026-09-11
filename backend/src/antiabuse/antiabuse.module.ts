import { Module } from '@nestjs/common';
import { AntiabuseService } from './antiabuse.service';

@Module({
  providers: [AntiabuseService],
  exports: [AntiabuseService],
})
export class AntiabuseModule {}
