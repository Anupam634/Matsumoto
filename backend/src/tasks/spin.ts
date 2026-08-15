/**
 * Prize table for the spin wheel.
 *
 * The wheel is the presentation of a real outcome, not decoration: the server
 * draws a segment here, credits exactly that, and tells the client which
 * segment it landed on so the animation can stop there. A wheel that spun to
 * a random-looking segment while crediting something else would be a lie.
 *
 * Multipliers are relative to the task's configured `rewardMilli`, so that one
 * number still controls the payout and an operator can tune it in one place.
 * The weights are chosen so the expected value stays at 0.9925x that reward —
 * i.e. the configured reward becomes the average rather than a constant, and
 * adding the wheel does not quietly inflate what tasks pay out.
 *
 * Order is the order segments appear around the wheel, so the two rare prizes
 * sit apart rather than side by side.
 */
export interface SpinSegment {
  /** Share of the task's base reward this segment pays. */
  multiplier: number;
  /** Relative likelihood. The weights below sum to 100. */
  weight: number;
}

export const SPIN_SEGMENTS: readonly SpinSegment[] = [
  { multiplier: 0.5, weight: 30 },
  { multiplier: 2.5, weight: 6 },
  { multiplier: 1, weight: 25 },
  { multiplier: 10, weight: 2 },
  { multiplier: 0.25, weight: 25 },
  { multiplier: 1.5, weight: 12 },
];

const TOTAL_WEIGHT = SPIN_SEGMENTS.reduce((sum, s) => sum + s.weight, 0);

/** Expected payout as a share of the base reward. Asserted in the tests. */
export const SPIN_EXPECTED_MULTIPLIER =
  SPIN_SEGMENTS.reduce((sum, s) => sum + s.multiplier * s.weight, 0) /
  TOTAL_WEIGHT;

/**
 * Draw a segment.
 *
 * `random` is injectable so the tests can pin the outcome; production passes
 * Math.random. This is not a security boundary — it decides a points reward
 * inside a transaction the client cannot influence.
 */
export function pickSegmentIndex(random: () => number = Math.random): number {
  let ticket = random() * TOTAL_WEIGHT;
  for (let i = 0; i < SPIN_SEGMENTS.length; i += 1) {
    ticket -= SPIN_SEGMENTS[i].weight;
    if (ticket < 0) return i;
  }
  // random() returning exactly 1 would fall through; the last segment is the
  // correct answer for the top of the range.
  return SPIN_SEGMENTS.length - 1;
}

/** The milli-point value of every segment, for a given base reward. */
export function segmentValuesMilli(baseRewardMilli: number): number[] {
  return SPIN_SEGMENTS.map((s) => Math.round(baseRewardMilli * s.multiplier));
}
