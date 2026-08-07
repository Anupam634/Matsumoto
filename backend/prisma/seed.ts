import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seeds the catalogue from SPEC.md:
 *   $1  -> 2.9/hr  => +2.0/hr bonus  => 2000 milli
 *   $5  -> 10.9/hr => +10.0/hr       => 10000 milli
 *   $10 -> 20.9/hr => +20.0/hr       => 20000 milli
 *   $50 -> 90.9/hr => +90.0/hr       => 90000 milli
 */
const BOOSTER_PLANS = [
  { priceUsd: 1, rateBonusMilli: 2000 },
  { priceUsd: 5, rateBonusMilli: 10000 },
  { priceUsd: 10, rateBonusMilli: 20000 },
  { priceUsd: 50, rateBonusMilli: 90000 },
];

const TASKS = [
  { type: 'TWEET', title: 'Tweet about Matsumoto', rewardMilli: 5000 },
  { type: 'FOLLOW', title: 'Follow us on X', rewardMilli: 3000 },
  { type: 'REPOST', title: 'Repost our pinned post', rewardMilli: 3000 },
  { type: 'YOUTUBE', title: 'Watch our YouTube video', rewardMilli: 4000 },
  { type: 'QUIZ', title: 'Complete the daily quiz', rewardMilli: 6000 },
  { type: 'SPIN_WHEEL', title: 'Spin the reward wheel', rewardMilli: 2000 },
] as const;

async function main() {
  for (const p of BOOSTER_PLANS) {
    await prisma.boosterPlan.create({ data: { ...p, durationDays: 30 } });
  }
  for (const t of TASKS) {
    await prisma.task.create({ data: { ...t, cooldownHours: 24 } });
  }
  // eslint-disable-next-line no-console
  console.log('Seeded booster plans + tasks.');
}

main().finally(() => prisma.$disconnect());
