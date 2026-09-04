import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TaskType } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { pickSegmentIndex, segmentValuesMilli } from './spin';
import { lockUserRow } from '../common/row-lock';

export interface QuizQuestionDto {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface TaskDto {
  id: string;
  type: string;
  title: string;
  rewardPoints: number;
  cooldownHours: number;
  canClaim: boolean;
  /** Point value of each wheel segment, in order. Null for other tasks. */
  wheelSegments: number[] | null;
  /** Interactive quiz questions if type is QUIZ. */
  quizQuestions?: QuizQuestionDto[] | null;
  /** Social or target URL for social tasks */
  actionUrl?: string | null;
  /** When the cooldown lifts, or null if claimable right now. */
  nextAvailableAt: Date | null;
  lastClaimedAt: Date | null;
}

export interface AdminTaskConfigDto {
  id: string;
  type: string;
  title: string;
  rewardPoints: number;
  cooldownHours: number;
  active: boolean;
  wheelSegments?: number[] | null;
  quizQuestions?: QuizQuestionDto[] | null;
  actionUrl?: string | null;
}

// Default initial Web3 quiz questions
const DEFAULT_QUIZ_QUESTIONS: QuizQuestionDto[] = [
  {
    id: 1,
    question: 'Which blockchain network settles BONDKOIN ($BONDKOIN) token withdrawals?',
    options: [
      'BNB Smart Chain (BEP-20)',
      'Ethereum Mainnet (ERC-20)',
      'Solana Network (SPL)',
      'Bitcoin Lightning Network',
    ],
    correctIndex: 0,
    explanation: 'BONDKOIN utilizes the high-speed, low-gas BNB Smart Chain (BEP-20) for automated withdrawals.',
  },
  {
    id: 2,
    question: 'What is the official BONDKOIN Point to $BONDKOIN token conversion standard?',
    options: [
      '1 Point = 1 $BONDKOIN',
      '3 Points = 1 $BONDKOIN',
      '10 Points = 1 $BONDKOIN',
      '5 Points = 1 $BONDKOIN',
    ],
    correctIndex: 1,
    explanation: 'According to tokenomics, 3 BONDKOIN Points convert directly to 1 mainnet $BONDKOIN token.',
  },
  {
    id: 3,
    question: 'What is the standard base node mining rate per hour?',
    options: [
      '0.25 BONDKOIN/h',
      '0.50 BONDKOIN/h',
      '0.90 BONDKOIN/h',
      '1.50 BONDKOIN/h',
    ],
    correctIndex: 2,
    explanation: 'Every verified miner receives a baseline node allocation of 0.90 BONDKOIN points every hour.',
  },
  {
    id: 4,
    question: 'How often do miners need to check in to sustain continuous node mining?',
    options: [
      'Every 1 Hour',
      'Every 6 Hours',
      'Every 12 Hours',
      'Every 24 Hours',
    ],
    correctIndex: 3,
    explanation: 'Mining runs on an automated 24-hour cycle before requiring a session claim and reboot.',
  },
];

/* ─────────────────────── Social task defaults ─────────────────────── */

/** Public site, used to build the invite link inside the tweet. */
const WEB_URL = (process.env.WEB_URL || 'https://bondkoinlabs.com').replace(/\/$/, '');
/** Official X handle, without the @. */
const X_HANDLE = process.env.X_HANDLE || 'BondKoin';
/** The pinned post to repost. Falls back to the profile, where it sits on top. */
const X_PINNED_POST_URL = process.env.X_PINNED_POST_URL || `https://x.com/${X_HANDLE}`;

/**
 * Where a social task sends the miner when no admin-configured URL exists.
 *
 * The tweet is a real X compose intent: the miner's own referral link goes in
 * as `url`, so X unfurls the site's Open Graph card (image + title) under the
 * text, and the post carries the @handle and hashtags.
 */
function defaultActionUrl(type: string, referralCode: string): string | null {
  switch (type) {
    case 'TWEET': {
      const text =
        `I'm mining $BONDKOIN every day on BNB Chain with @${X_HANDLE} ⛏️ ` +
        'Free to join, no hardware, on-chain payouts. Start with my link 👇';
      const params = new URLSearchParams({
        text,
        url: `${WEB_URL}/en/login?ref=${referralCode}`,
        hashtags: 'BONDKOIN,BNBChain,Crypto,Mining',
      });
      return `https://x.com/intent/post?${params.toString()}`;
    }
    case 'FOLLOW':
      return `https://x.com/intent/follow?screen_name=${X_HANDLE}`;
    case 'REPOST': {
      // A status URL becomes a one-tap repost intent; anything else opens as-is.
      const match = /status\/(\d+)/.exec(X_PINNED_POST_URL);
      return match
        ? `https://x.com/intent/retweet?tweet_id=${match[1]}`
        : X_PINNED_POST_URL;
    }
    default:
      return null;
  }
}

/** Rows seeded under the project's old working name keep their id; fix the label. */
function brandTitle(title: string): string {
  return title.replace(/Matsumoto/gi, 'BONDKOIN');
}

/**
 * Narrow an admin-supplied array to what Prisma accepts for a `Json?` column.
 * `null` (or an absent value) clears the override back to the built-in
 * default; `Prisma.DbNull` is the SQL NULL rather than a JSON `null` literal.
 */
function asJson(
  value: unknown[] | null | undefined,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value == null ? Prisma.DbNull : (value as Prisma.InputJsonValue);
}

/** The admin-editable extras that live in the Task row's JSON columns. */
interface TaskConfig {
  quizQuestions?: QuizQuestionDto[] | null;
  wheelSegments?: number[] | null;
  actionUrl?: string | null;
}

/**
 * Read the extras off a Task row.
 *
 * These used to sit in a module-level `Map`, which meant every quiz question,
 * wheel layout and bounty URL an admin configured survived only until the
 * next deploy — and a second instance never saw them at all. They are columns
 * now; this just narrows the `Json` type back to what was written.
 */
function configOf(task: {
  wheelSegments: unknown;
  quizQuestions: unknown;
  actionUrl: string | null;
}): TaskConfig {
  return {
    wheelSegments: Array.isArray(task.wheelSegments)
      ? (task.wheelSegments as number[])
      : null,
    quizQuestions: Array.isArray(task.quizQuestions)
      ? (task.quizQuestions as QuizQuestionDto[])
      : null,
    actionUrl: task.actionUrl,
  };
}

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Active tasks with this user's claim state folded in. */
  async list(userId: string): Promise<TaskDto[]> {
    const [tasks, user] = await Promise.all([
      this.prisma.task.findMany({
        where: { active: true },
        orderBy: { rewardMilli: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { referralCode: true },
      }),
    ]);
    const referralCode = user?.referralCode ?? '';

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
      const customConfig = configOf(t);

      let wheelSegments: number[] | null = null;
      if (t.type === 'SPIN_WHEEL') {
        wheelSegments = customConfig.wheelSegments || segmentValuesMilli(t.rewardMilli).map((m) => m / 1000);
      }

      let quizQuestions: QuizQuestionDto[] | null = null;
      if (t.type === 'QUIZ') {
        quizQuestions = customConfig.quizQuestions || DEFAULT_QUIZ_QUESTIONS;
      }

      let actionUrl: string | null = customConfig.actionUrl || null;
      if (t.type === 'YOUTUBE' && !actionUrl) {
        actionUrl = 'https://www.youtube.com/watch?v=kJQP7kiw5Fk';
      }
      if (!actionUrl) actionUrl = defaultActionUrl(t.type, referralCode);

      return {
        id: t.id,
        type: t.type,
        title: brandTitle(t.title),
        rewardPoints: t.rewardMilli / 1000,
        wheelSegments,
        quizQuestions,
        actionUrl,
        cooldownHours: t.cooldownHours,
        canClaim,
        nextAvailableAt: canClaim ? null : readyAt,
        lastClaimedAt: last,
      };
    });
  }

  /**
   * Credit a task reward, subject to the task's cooldown.
   *
   * Cooldown and credit share one transaction behind a lock on the user's
   * row. Read separately, concurrent claims on the same task all found the
   * same "last claim" and all paid out — the cooldown only ever slowed down a
   * client that waited for its own response.
   */
  async claim(userId: string, taskId: string) {
    const task = await this.prisma.task.findUniqueOrThrow({
      where: { id: taskId },
    });
    if (!task.active) {
      throw new BadRequestException('This task is no longer available.');
    }

    const config = configOf(task);
    const spinSegments =
      config.wheelSegments ||
      segmentValuesMilli(task.rewardMilli).map((m) => m / 1000);

    const spinIndex = task.type === 'SPIN_WHEEL' ? pickSegmentIndex() : null;
    const rewardMilli =
      spinIndex === null
        ? task.rewardMilli
        : Math.round(spinSegments[spinIndex % spinSegments.length] * 1000);
    const reward = BigInt(rewardMilli);

    const balance = await this.prisma.$transaction(async (tx) => {
      await lockUserRow(tx, userId);

      const last = await tx.taskClaim.findFirst({
        where: { userId, taskId },
        orderBy: { claimedAt: 'desc' },
      });
      if (last) {
        const readyAt =
          last.claimedAt.getTime() + task.cooldownHours * 3_600_000;
        if (readyAt > Date.now()) {
          throw new BadRequestException(
            `Task is on cooldown for another ${Math.ceil((readyAt - Date.now()) / 60_000)} minutes.`,
          );
        }
      }

      const user = await tx.user.update({
        where: { id: userId },
        data: { pointsBalance: { increment: reward } },
        select: { pointsBalance: true },
      });
      await tx.taskClaim.create({
        data: { userId, taskId, verified: false },
      });
      await tx.ledgerEntry.create({
        data: {
          userId,
          reason: 'TASK_REWARD',
          deltaMilli: reward,
          meta: { taskId, type: task.type, ...(spinIndex !== null && { spinIndex }) },
        },
      });
      return user.pointsBalance;
    });

    return {
      earnedPoints: rewardMilli / 1000,
      balancePoints: Number(balance) / 1000,
      nextAvailableAt: new Date(Date.now() + task.cooldownHours * 3_600_000),
      spinIndex,
    };
  }

  // ── Admin management methods ──
  async adminListTasks(): Promise<AdminTaskConfigDto[]> {
    const tasks = await this.prisma.task.findMany({
      orderBy: { rewardMilli: 'desc' },
    });

    return tasks.map((t) => {
      const customConfig = configOf(t);
      return {
        id: t.id,
        type: t.type,
        title: t.title,
        rewardPoints: t.rewardMilli / 1000,
        cooldownHours: t.cooldownHours,
        active: t.active,
        wheelSegments: customConfig.wheelSegments || (t.type === 'SPIN_WHEEL' ? segmentValuesMilli(t.rewardMilli).map((m) => m / 1000) : undefined),
        quizQuestions: customConfig.quizQuestions || (t.type === 'QUIZ' ? DEFAULT_QUIZ_QUESTIONS : undefined),
        actionUrl: customConfig.actionUrl,
      };
    });
  }

  async adminUpdateTask(id: string, dto: Partial<AdminTaskConfigDto>) {
    const data: Prisma.TaskUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.rewardPoints !== undefined) data.rewardMilli = Math.round(dto.rewardPoints * 1000);
    if (dto.cooldownHours !== undefined) data.cooldownHours = dto.cooldownHours;
    if (dto.active !== undefined) data.active = dto.active;
    // `null` clears an override and restores the built-in default; leaving a
    // key out of the request leaves the stored value alone.
    if (dto.quizQuestions !== undefined) {
      data.quizQuestions = asJson(dto.quizQuestions);
    }
    if (dto.wheelSegments !== undefined) {
      data.wheelSegments = asJson(dto.wheelSegments);
    }
    if (dto.actionUrl !== undefined) data.actionUrl = dto.actionUrl ?? null;

    const task = await this.prisma.task.update({ where: { id }, data });
    const config = configOf(task);

    return {
      id: task.id,
      type: task.type,
      title: task.title,
      rewardPoints: task.rewardMilli / 1000,
      cooldownHours: task.cooldownHours,
      active: task.active,
      wheelSegments: config.wheelSegments,
      quizQuestions: config.quizQuestions,
      actionUrl: config.actionUrl,
    };
  }

  async adminCreateTask(dto: Omit<AdminTaskConfigDto, 'id'>) {
    return this.prisma.task.create({
      data: {
        type: dto.type as TaskType,
        title: dto.title,
        rewardMilli: Math.round((dto.rewardPoints || 10) * 1000),
        cooldownHours: dto.cooldownHours || 24,
        active: dto.active ?? true,
        quizQuestions: asJson(dto.quizQuestions),
        wheelSegments: asJson(dto.wheelSegments),
        actionUrl: dto.actionUrl ?? null,
      },
    });
  }

  async adminDeleteTask(id: string) {
    // The claim history references the task, so clear it first rather than
    // letting the delete fail on a foreign key.
    return this.prisma.$transaction(async (tx) => {
      await tx.taskClaim.deleteMany({ where: { taskId: id } });
      return tx.task.delete({ where: { id } });
    });
  }
}
