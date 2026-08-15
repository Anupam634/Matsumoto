import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SupportService } from './support.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AdminAuthGuard } from '../admin/admin.guard';
import { AdminReplyDto, CreateTicketDto, ReplyDto } from './dto';

/** Miner-facing: open a ticket and follow your own threads. */
@UseGuards(JwtAuthGuard)
@Controller('support')
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** GET /api/support — the caller's own tickets, with full threads. */
  @Get()
  mine(@CurrentUser('id') userId: string) {
    return this.support.listForUser(userId);
  }

  /** POST /api/support — open a new ticket. */
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTicketDto) {
    return this.support.create(userId, dto.subject, dto.body);
  }

  /** POST /api/support/:id/reply — add to one of your own threads. */
  @Post(':id/reply')
  reply(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.support.reply(userId, id, dto.body);
  }
}

/** Operator-facing queue. Admin token only. */
@UseGuards(AdminAuthGuard)
@Controller('admin/support')
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  /** GET /api/admin/support?status=OPEN — the review queue. */
  @Get()
  list(@Query('status') status?: string) {
    return this.support.listForAdmin(status);
  }

  /** POST /api/admin/support/:id/reply — answer, optionally closing it. */
  @Post(':id/reply')
  reply(@Param('id') id: string, @Body() dto: AdminReplyDto) {
    return this.support.adminReply(id, dto.body, dto.status ?? 'ANSWERED');
  }

  /** POST /api/admin/support/:id/close — close without a reply. */
  @Post(':id/close')
  close(@Param('id') id: string) {
    return this.support.setStatus(id, 'CLOSED');
  }
}
