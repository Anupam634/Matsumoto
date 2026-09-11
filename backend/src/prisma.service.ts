import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Connections in the API's one pool (see PrismaModule), unless DATABASE_URL
 * sets its own `connection_limit`. Prisma's default is 2 × CPUs + 1, which is
 * 3 on the single-vCPU box production runs on: a handful of open dashboards
 * fills that, and every request behind them waits out the 10s pool timeout
 * and fails with P2024.
 */
export const DEFAULT_POOL_SIZE = 10;

/** DATABASE_POOL_SIZE if it is a positive integer, else the default. */
export function poolSizeFromEnv(value: string | undefined): number {
  const size = Number(value);
  return Number.isInteger(size) && size > 0 ? size : DEFAULT_POOL_SIZE;
}

/**
 * DATABASE_URL with a pool size. A `connection_limit` the URL already carries
 * wins — whoever wrote it into the URL knows the database's limits.
 */
export function withPoolSize(
  url: string | undefined,
  size: number,
): string | undefined {
  if (!url) return url;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    // Let Prisma reject a malformed URL in its own words.
    return url;
  }
  if (parsed.searchParams.has('connection_limit')) return url;
  parsed.searchParams.set('connection_limit', String(size));
  return parsed.toString();
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor() {
    const url = withPoolSize(
      process.env.DATABASE_URL,
      poolSizeFromEnv(process.env.DATABASE_POOL_SIZE),
    );
    super(url ? { datasources: { db: { url } } } : undefined);
  }

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Prisma connection error during startup:', err);
    }
  }
}
