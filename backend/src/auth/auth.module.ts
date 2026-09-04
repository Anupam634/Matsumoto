import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt.guard';
import { PrismaService } from '../prisma.service';
import { AntiabuseModule } from '../antiabuse/antiabuse.module';
import { Logger } from '@nestjs/common';
import { checkJwtSecret } from '../common/jwt-secret';

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
      useFactory: (config: ConfigService) => {
        const { secret, warning } = checkJwtSecret(
          config.get<string>('JWT_SECRET'),
        );
        // Loud, and on every boot: a warning nobody sees is the same as no
        // check at all.
        if (warning) new Logger('JwtConfig').error(warning);
        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d',
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PrismaService],
  exports: [JwtAuthGuard, JwtModule],
})
export class AuthModule {}
