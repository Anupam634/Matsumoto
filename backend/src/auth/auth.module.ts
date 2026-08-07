import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { PrismaService } from '../prisma.service';
import { AntiabuseModule } from '../antiabuse/antiabuse.module';

/**
 * Exports JwtModule + JwtAuthGuard so any feature module can guard its routes
 * by importing AuthModule.
 */
@Module({
  imports: [
    AntiabuseModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PrismaService],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
