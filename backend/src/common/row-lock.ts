import { Prisma } from '@prisma/client';

/**
 * Take an exclusive lock on a user's row for the rest of the transaction.
 *
 * Every path that pays a user out — mining claims, task rewards, withdrawal
 * requests — used to read its guard (cooldown elapsed? balance sufficient?
 * already withdrawn this week?) in one query and act on it in another. Under
 * READ COMMITTED, two requests that arrive together both read the state from
 * *before* either wrote, so both pass. Firing a handful of concurrent taps
 * claimed the same mining reward several times over; doing it on the
 * withdrawal endpoint drove `pointsBalance` negative and left an admin with a
 * queue of payouts the balance never covered.
 *
 * `FOR UPDATE` makes the second transaction wait for the first to commit and
 * then see its writes, so the guard is evaluated against real current state.
 * Locking the *user* row (rather than whatever table the guard reads) is what
 * makes it work across all three flows: they all settle into the same row, so
 * they serialise against each other as well as against themselves.
 *
 * Must be called inside `$transaction` — outside one the lock is released
 * immediately and guards nothing.
 */
export async function lockUserRow(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<void> {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
}
