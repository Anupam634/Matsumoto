import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

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

  // Universal CORS middleware ensuring all origins (www.bondkoinlabs.com, bondkoinlabs.com, etc.) and preflight OPTIONS are answered immediately
  app.use((req: any, res: any, next: any) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token, Fingerprint, Range',
    );
    res.setHeader(
      'Access-Control-Expose-Headers',
      'Content-Range, X-Content-Range, Content-Length',
    );

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
    next();
  });

  app.enableCors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-CSRF-Token',
      'Fingerprint',
      'Range',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'Content-Length'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });
  // KYC submissions carry base64 identity photos, which blow past Express's
  // 100kb default. The DTO caps each image at ~2MB, so 10mb leaves room for
  // three images plus the surrounding JSON.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Matsumoto API listening on http://0.0.0.0:${port}/api`);
}
bootstrap();
