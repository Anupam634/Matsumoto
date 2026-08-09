import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { KycService } from './kyc.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminAuthGuard } from '../admin/admin.guard';
import { KycDecisionDto, SubmitKycDto } from './dto';

/** Miner-facing: submit documents and check your own status. */
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private readonly kyc: KycService) {}

  /** GET /api/kyc — the caller's own status (no document payloads). */
  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.kyc.mine(userId);
  }

  /** POST /api/kyc — submit or re-submit documents for manual review. */
  @Post()
  submit(@CurrentUser('id') userId: string, @Body() dto: SubmitKycDto) {
    return this.kyc.submit(userId, dto);
  }
}

/** Operator-facing review queue. Admin token only. */
@UseGuards(AdminAuthGuard)
@Controller('admin/kyc')
export class KycAdminController {
  constructor(private readonly kyc: KycService) {}

  /** GET /api/admin/kyc?status=PENDING */
  @Get()
  list(@Query('status') status?: string) {
    return this.kyc.adminList(status);
  }

  /** GET /api/admin/kyc/:userId — includes the document images. */
  @Get(':userId')
  detail(@Param('userId') userId: string) {
    return this.kyc.adminDetail(userId);
  }

  /** POST /api/admin/kyc/:userId/decision — approve or reject. */
  @Post(':userId/decision')
  decide(@Param('userId') userId: string, @Body() dto: KycDecisionDto) {
    return this.kyc.decide(userId, dto.approve, dto.note);
  }
}
