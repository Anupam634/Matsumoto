/**
 * Seeds the catalogue from SPEC.md:
 *   $1  -> 2.9/hr  => +2.0/hr bonus  => 2000 milli
 *   $5  -> 10.9/hr => +10.0/hr       => 10000 milli
 *   $10 -> 20.9/hr => +20.0/hr       => 20000 milli
 *   $50 -> 90.9/hr => +90.0/hr       => 90000 milli
 *
 * Plain JavaScript on purpose. This runs on every deploy, and ts-node is a
 * devDependency that a production install does not have — a TypeScript seed
 * simply cannot run there, which left the booster and task catalogues empty
 * on any host without shell access.
 *
 * Idempotent: each row is created only when it is missing, so re-running adds
 * nothing. Neither priceUsd nor type is unique in the schema, so this checks
 * before inserting rather than upserting.
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
];

async function main() {
  let added = 0;

  for (const plan of BOOSTER_PLANS) {
    const existing = await prisma.boosterPlan.findFirst({
      where: { priceUsd: plan.priceUsd },
    });
    if (existing) continue;
    await prisma.boosterPlan.create({ data: { ...plan, durationDays: 30 } });
    added += 1;
  }

  for (const task of TASKS) {
    const existing = await prisma.task.findFirst({ where: { type: task.type } });
    if (existing) continue;
    await prisma.task.create({ data: { ...task, cooldownHours: 24 } });
    added += 1;
  }

  // eslint-disable-next-line no-console
  console.log(
    added === 0
      ? 'Catalogue already seeded — nothing to do.'
      : `Seeded ${added} catalogue row(s).`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
