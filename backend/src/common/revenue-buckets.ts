/**
 * Calendar bucketing for the admin revenue charts.
 *
 * Everything here is UTC. A bucket has to mean the same thing to every
 * operator looking at the panel, and the signup chart already keys its days
 * off UTC — mixing the two would put a payment and the signup it came from
 * on different days of the same chart.
 */

export type Grain = 'daily' | 'weekly' | 'monthly';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** Midnight UTC on the day containing `d`. */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Start of the bucket containing `d`, shifted by `offset` whole buckets.
 *
 * Month arithmetic goes through `Date.UTC`, which normalises an out-of-range
 * month index, so stepping back from January lands in the previous year
 * rather than on an invalid date.
 */
export function bucketStart(d: Date, grain: Grain, offset: number): Date {
  if (grain === 'monthly') {
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1));
  }
  const day = startOfUtcDay(d);
  if (grain === 'weekly') {
    // ISO weeks start on Monday; getUTCDay() is 0 for Sunday.
    const sinceMonday = (day.getUTCDay() + 6) % 7;
    day.setUTCDate(day.getUTCDate() - sinceMonday + offset * 7);
    return day;
  }
  day.setUTCDate(day.getUTCDate() + offset);
  return day;
}

/** Stable id for a bucket — 'YYYY-MM-DD' for days and weeks, 'YYYY-MM' for months. */
export function bucketKey(start: Date, grain: Grain): string {
  const iso = start.toISOString();
  return grain === 'monthly' ? iso.slice(0, 7) : iso.slice(0, 10);
}

/** Short axis label for a bucket. */
export function bucketLabel(start: Date, grain: Grain): string {
  const month = MONTHS[start.getUTCMonth()];
  const dayOfMonth = String(start.getUTCDate()).padStart(2, '0');
  if (grain === 'monthly') return `${month} ${start.getUTCFullYear()}`;
  if (grain === 'weekly') return `Wk ${month} ${dayOfMonth}`;
  return `${month} ${dayOfMonth}`;
}
