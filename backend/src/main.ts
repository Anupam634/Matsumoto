import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import compression from 'compression';
import { AppModule } from './app.module';
import { allowedOrigins, isOriginAllowed } from './common/cors-origins';

// Balances are BigInt milli-points; JSON.stringify throws on BigInt by
// default. Services return decimals, this is the safety net for anything
// that slips through as a raw Prisma row.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function (
  this: bigint,
) {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const origins = allowedOrigins();

  // nginx terminates TLS in front of this process, so without this every
  // request looks like it came from the proxy and per-IP rate limiting
  // would put the whole userbase in one bucket.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  app.enableCors({
    // Refusal omits the header rather than erroring, so the browser
    // reports a clean CORS failure instead of a 500.
    //
    // NOTE: nginx in front of this process injects its own CORS headers and
    // answers preflights itself, so tightening things here is only half the
    // fix — see DEPLOY.md ("CORS is enforced in two places").
    origin: (origin, callback) =>
      callback(null, isOriginAllowed(origin, origins)),
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'Fingerprint',
    ],
    exposedHeaders: ['Content-Length'],
    credentials: true,
    optionsSuccessStatus: 204,
  });

  // Responses are JSON and often several KB (leaderboards, admin lists,
  // ledgers). nginx does not gzip them, so do it here.
  app.use(compression());

  // Every route is either authenticated or a mutation: none of it should
  // sit in a shared or browser cache.
  app.use((_req: unknown, res: { setHeader(k: string, v: string): void }, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  // KYC submissions carry base64 identity photos, which blow past Express's
  // 100kb default. The DTO caps each image at ~2MB, so 10mb leaves room for
  // three images plus the surrounding JSON.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Matsumoto API listening on http://0.0.0.0:${port}/api`);
  // eslint-disable-next-line no-console
  console.log(`CORS origins: ${origins.join(', ')}`);
}
bootstrap();
