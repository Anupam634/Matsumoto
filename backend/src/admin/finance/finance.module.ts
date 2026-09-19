import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { AdminAuthGuard } from '../admin.guard';
import { PermissionGuard } from '../permission.guard';
import { AuthModule } from '../../auth/auth.module';
import { BoostersModule } from '../../boosters/boosters.module';

/**
 * The crypto-payment finance module. Imports BoostersModule for
 * CollectorService (the collector wallet list and daily-cap math already
 * used to route purchases) rather than duplicating that logic here.
 *
 * AdminAuthGuard and PermissionGuard are listed as providers (not just
 * referenced by class in `@UseGuards`) because Nest resolves a
 * class-reference guard through the *current* module's DI container — they
 * are not exported by AdminModule, so without this, FinanceController's
 * guards would fail to resolve their own dependencies at boot.
 */
@Module({
  imports: [AuthModule, BoostersModule], // AuthModule -> JwtModule for AdminAuthGuard
  controllers: [FinanceController],
  providers: [FinanceService, AdminAuthGuard, PermissionGuard],
})
export class FinanceModule {}
