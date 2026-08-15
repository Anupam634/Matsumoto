import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin.guard';
import { WithdrawalsService } from '../withdrawals/withdrawals.service';
import { TasksService } from '../tasks/tasks.service';
import {
  AdjustRateDto,
  AdminLoginDto,
  AirdropDto,
  BlockUserDto,
  WithdrawalDecisionDto,
} from './dto';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly admin: AdminService,
    private readonly withdrawals: WithdrawalsService,
  ) {}

  /** POST /api/admin/login — unguarded; issues the admin-scoped token. */
  @Post('login')
  login(@Body() dto: AdminLoginDto) {
    return this.admin.login(dto.email, dto.password);
  }
}

/**
 * Everything below the login route requires a valid admin token. Kept as a
 * separate controller so the guard can't be forgotten on a new route.
 */
@UseGuards(AdminAuthGuard)
@Controller('admin')
export class AdminSecureController {
  constructor(
    private readonly admin: AdminService,
    private readonly withdrawals: WithdrawalsService,
    private readonly tasks: TasksService,
  ) {}

  /** GET /api/admin/stats — active miners, balances, per-country counts. */
  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  /** GET /api/admin/tasks — manage Quiz, Lucky Wheel, and Bounty tasks. */
  @Get('tasks')
  listTasks() {
    return this.tasks.adminListTasks();
  }

  /** POST /api/admin/tasks — create new task/bounty. */
  @Post('tasks')
  createTask(@Body() dto: any) {
    return this.tasks.adminCreateTask(dto);
  }

  /** PUT /api/admin/tasks/:id — update task questions, wheel segments, rewards, etc. */
  @Post('tasks/:id/update')
  updateTask(@Param('id') id: string, @Body() dto: any) {
    return this.tasks.adminUpdateTask(id, dto);
  }

  /** DELETE /api/admin/tasks/:id — remove task. */
  @Post('tasks/:id/delete')
  deleteTask(@Param('id') id: string) {
    return this.tasks.adminDeleteTask(id);
  }

  /** GET /api/admin/users?search=&page=&pageSize= */
  @Get('users')
  users(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.admin.listUsers({
      search,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  /** GET /api/admin/users/:id — detail, referral tree, ledger. */
  @Get('users/:id')
  user(@Param('id') id: string) {
    return this.admin.userDetail(id);
  }

  /** POST /api/admin/users/:id/block — block or unblock. */
  @Post('users/:id/block')
  block(@Param('id') id: string, @Body() dto: BlockUserDto) {
    return this.admin.setBlocked(id, dto.blocked);
  }

  /** POST /api/admin/users/:id/rate — manual hash-rate adjustment. */
  @Post('users/:id/rate')
  rate(@Param('id') id: string, @Body() dto: AdjustRateDto) {
    return this.admin.adjustRate(id, dto.rateAdjustMilli);
  }

  /** POST /api/admin/users/:id/airdrop — manual point grant. */
  @Post('users/:id/airdrop')
  airdrop(@Param('id') id: string, @Body() dto: AirdropDto) {
    return this.admin.airdrop(id, dto.points, dto.note);
  }

  /** GET /api/admin/withdrawals?status=PENDING — approval queue. */
  @Get('withdrawals')
  listWithdrawals(@Query('status') status?: string) {
    return this.admin.listWithdrawals(status);
  }

  /**
   * POST /api/admin/withdrawals/:id/decision
   * Approving runs the on-chain payout; rejecting refunds the escrow.
   */
  @Post('withdrawals/:id/decision')
  decide(@Param('id') id: string, @Body() dto: WithdrawalDecisionDto) {
    return dto.approve
      ? this.withdrawals.approve(id, dto.note)
      : this.withdrawals.reject(id, dto.note ?? 'Rejected by admin.');
  }
}
