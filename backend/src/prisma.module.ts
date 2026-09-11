import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * The API's one PrismaService.
 *
 * Every feature module used to list PrismaService in its own `providers`, and
 * Nest builds a separate instance for each module that does — thirteen
 * PrismaClients, each with its own query engine and its own three-connection
 * pool. The guard on every miner route drew from whichever small pool its
 * module happened to own, so a few dashboards polling mining status starved
 * it and the rest of the requests timed out as 500s.
 *
 * Global so feature modules inject it without listing it. Do not add it back
 * to a module's `providers`: that module would quietly get a private pool
 * again.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
