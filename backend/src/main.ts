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
  app.enableCors();
  // KYC submissions carry base64 identity photos, which blow past Express's
  // 100kb default. The DTO caps each image at ~2MB, so 10mb leaves room for
  // three images plus the surrounding JSON.
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Matsumoto API listening on http://localhost:${port}/api`);
}
bootstrap();
