import type { TicketStatus } from '../api/endpoints';

/** Badge tone for each ticket status, shared by the inbox and the thread. */
export const STATUS_TONE: Record<TicketStatus, 'warning' | 'success' | 'neutral'> = {
  OPEN: 'warning',
  ANSWERED: 'success',
  CLOSED: 'neutral',
};
