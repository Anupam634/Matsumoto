import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * Unauthenticated liveness probe.
 *
 * The host uses this to decide whether a deploy came up, so it checks the
 * database too: a process that cannot reach Postgres cannot serve anything
 * useful, and should not be rolled out over a working instance.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
      });
    }
    return { status: 'ok', database: 'ok' };
  }
}
