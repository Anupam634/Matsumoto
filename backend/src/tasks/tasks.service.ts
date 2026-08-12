import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { pickSegmentIndex, segmentValuesMilli } from './spin';

export interface TaskDto {
  id: string;
  type: string;
  title: string;
  rewardPoints: number;
  cooldownHours: number;
  canClaim: boolean;
  /** Point value of each wheel segment, in order. Null for other tasks. */
  wheelSegments: number[] | null;
  /** When the cooldown lifts, or null if claimable right now. */
  nextAvailableAt: Date | null;
  lastClaimedAt: Date | null;
}

/**
 * Engagement tasks (SPEC §5): tweet, follow, repost, watch YouTube, quiz,
 * spin wheel. Each grants a configurable point reward on a per-task cooldown.
 *
 * Verification is honour-system for now — claims are written with
 * `verified: false` so an operator can spot-check them later. How strict this
 * should be (real X/YouTube API checks vs. spot-check) is still an open
 * question with the client (SPEC §9b.5), so nothing here pretends to have
 * proven the user actually did the task.
 */
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active tasks with this user's claim state folded in. */
  async list(userId: string): Promise<TaskDto[]> {
    const tasks = await this.prisma.task.findMany({
      where: { active: true },
      orderBy: { rewardMilli: 'desc' },
    });

    // Newest claim per task for this user, in one query rather than N.
    const claims = await this.prisma.taskClaim.findMany({
      where: { userId, taskId: { in: tasks.map((t) => t.id) } },
      orderBy: { claimedAt: 'desc' },
    });
    const latest = new Map<string, Date>();
    for (const c of claims) {
      if (!latest.has(c.taskId)) latest.set(c.taskId, c.claimedAt);
    }

    const now = Date.now();
    return tasks.map((t) => {
      const last = latest.get(t.id) ?? null;
      const readyAt = last
        ? new Date(last.getTime() + t.cooldownHours * 3_600_000)
        : null;
      const canClaim = !readyAt || readyAt.getTime() <= now;
      return {
        id: t.id,
        type: t.type,
        title: t.title,
        rewardPoints: t.rewardMilli / 1000,
        wheelSegments:
          t.type === 'SPIN_WHEEL'
            ? segmentValuesMilli(t.rewardMilli).map((m) => m / 1000)
            : null,
        cooldownHours: t.cooldownHours,
        canClaim,
        nextAvailableAt: canClaim ? null : readyAt,
        lastClaimedAt: last,
      };
    });
  }

  /** Credit a task reward, subject to the task's cooldown. */
  async claim(userId: string, taskId: string) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    if (!task.active) {
      throw new BadRequestException('This task is no longer available.');
    }

    const last = await this.prisma.taskClaim.findFirst({
      where: { userId, taskId },
      orderBy: { claimedAt: 'desc' },
    });
    if (last) {
      const readyAt = last.claimedAt.getTime() + task.cooldownHours * 3_600_000;
      if (readyAt > Date.now()) {
        throw new BadRequestException(
          `Task is on cooldown for another ${Math.ceil((readyAt - Date.now()) / 60_000)} minutes.`,
        );
      }
    }

    // The spin wheel draws its payout here, server-side, and reports which
    // segment it drew so the client can stop the wheel on it. The wheel shows
    // the outcome; it does not decide it.
    const spinIndex =
      task.type === 'SPIN_WHEEL' ? pickSegmentIndex() : null;
    const rewardMilli =
      spinIndex === null
        ? task.rewardMilli
        : segmentValuesMilli(task.rewardMilli)[spinIndex];

    const reward = BigInt(rewardMilli);
    const [user] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: reward } },
        select: { pointsBalance: true },
      }),
      this.prisma.taskClaim.create({
        data: { userId, taskId, verified: false },
      }),
      this.prisma.ledgerEntry.create({
        data: {
          userId,
          reason: 'TASK_REWARD',
          deltaMilli: reward,
          meta: { taskId, type: task.type, ...(spinIndex !== null && { spinIndex }) },
        },
      }),
    ]);

    return {
      earnedPoints: rewardMilli / 1000,
      balancePoints: Number(user.pointsBalance) / 1000,
      nextAvailableAt: new Date(Date.now() + task.cooldownHours * 3_600_000),
      // Null for every task but the wheel.
      spinIndex,
    };
  }
}
