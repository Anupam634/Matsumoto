import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

/**
 * A miner may not pile up unanswered tickets — without a cap, one person can
 * bury the operator queue by submitting in a loop.
 */
const MAX_OPEN_PER_USER = 3;

/** Messages a miner may add to one ticket, so a thread can't be used as spam. */
const MAX_MESSAGES_PER_TICKET = 50;

export interface TicketDto {
  id: string;
  subject: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messages: {
    id: string;
    fromAdmin: boolean;
    body: string;
    createdAt: Date;
  }[];
}

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  /** The caller's own threads, newest activity first. */
  async listForUser(userId: string): Promise<TicketDto[]> {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async create(userId: string, subject: string, body: string): Promise<TicketDto> {
    const open = await this.prisma.supportTicket.count({
      where: { userId, status: { in: ['OPEN', 'ANSWERED'] } },
    });
    if (open >= MAX_OPEN_PER_USER) {
      throw new BadRequestException(
        `You already have ${MAX_OPEN_PER_USER} open tickets. Please continue in one of those instead.`,
      );
    }

    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject,
        messages: { create: { body, fromAdmin: false } },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /** Miner adds to their own thread; answering reopens it for the operator. */
  async reply(userId: string, ticketId: string, body: string): Promise<TicketDto> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { _count: { select: { messages: true } } },
    });
    if (!ticket) throw new NotFoundException('Ticket not found.');
    // Not found vs. forbidden would leak which ticket ids exist.
    if (ticket.userId !== userId) throw new NotFoundException('Ticket not found.');
    if (ticket.status === 'CLOSED') {
      throw new BadRequestException('This ticket is closed. Please open a new one.');
    }
    if (ticket._count.messages >= MAX_MESSAGES_PER_TICKET) {
      throw new BadRequestException('This thread is too long. Please open a new ticket.');
    }

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: 'OPEN',
        messages: { create: { body, fromAdmin: false } },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  /* ───────────────────────────── Operator ───────────────────────────── */

  /** The operator queue: open threads first, stalest at the top. */
  async listForAdmin(status?: string): Promise<(TicketDto & { userEmail: string | null })[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: [{ status: 'asc' }, { updatedAt: 'asc' }],
      take: 100,
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        user: { select: { email: true } },
      },
    });
    return rows.map(({ user, ...t }) => ({ ...t, userEmail: user.email }));
  }

  async adminReply(
    ticketId: string,
    body: string,
    status: 'ANSWERED' | 'CLOSED' = 'ANSWERED',
  ): Promise<TicketDto> {
    const exists = await this.prisma.supportTicket.count({ where: { id: ticketId } });
    if (!exists) throw new NotFoundException('Ticket not found.');

    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status,
        messages: { create: { body, fromAdmin: true } },
      },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async setStatus(ticketId: string, status: 'OPEN' | 'ANSWERED' | 'CLOSED') {
    const exists = await this.prisma.supportTicket.count({ where: { id: ticketId } });
    if (!exists) throw new NotFoundException('Ticket not found.');
    return this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { status },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
  }
}
