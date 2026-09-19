import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { AdminAuthGuard } from '../admin.guard';
import { PermissionGuard, RequirePermission } from '../permission.guard';
import { PERMISSIONS } from '../permissions';

/**
 * The crypto-payment finance module (SPEC extension — shareholder-wallet
 * routing). Deliberately its own controller rather than routes added to
 * AdminSecureController: every route here needs both a valid admin token
 * *and* CRYPTO_PAYMENT_VIEW, and keeping them apart means that second guard
 * can never be forgotten on a route added to the general admin surface.
 *
 * Order matters: AdminAuthGuard must run first to attach `req.admin`, which
 * PermissionGuard then reads.
 */
@UseGuards(AdminAuthGuard, PermissionGuard)
@Controller('admin/finance/crypto')
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}

  /** GET /api/admin/finance/crypto/payments — every collector's purchases. */
  @RequirePermission(PERMISSIONS.CRYPTO_PAYMENT_VIEW)
  @Get('payments')
  listPayments(
    @Query('status') status?: string,
    @Query('collectorId') collectorId?: string,
    @Query('search') search?: string,
  ) {
    return this.finance.listPayments({ status, collectorId, search });
  }

  /** GET /api/admin/finance/crypto/payments/:id — one purchase, full detail. */
  @RequirePermission(PERMISSIONS.CRYPTO_PAYMENT_VIEW)
  @Get('payments/:id')
  paymentDetail(@Param('id') id: string) {
    return this.finance.paymentDetail(id);
  }

  /**
   * GET /api/admin/finance/crypto/collectors — wallet-wise totals and the
   * $/day cap status for each configured collector.
   */
  @RequirePermission(PERMISSIONS.CRYPTO_PAYMENT_VIEW)
  @Get('collectors')
  collectorStatus() {
    return this.finance.collectorStatus();
  }
}
