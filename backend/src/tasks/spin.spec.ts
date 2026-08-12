import {
  pickSegmentIndex,
  segmentValuesMilli,
  SPIN_EXPECTED_MULTIPLIER,
  SPIN_SEGMENTS,
} from './spin';

describe('spin wheel prize table', () => {
  it('does not change what tasks pay on average', () => {
    // The wheel adds variance, not value: a spin still averages the task's
    // configured reward. If a segment is retuned, this is the guard rail.
    expect(SPIN_EXPECTED_MULTIPLIER).toBeCloseTo(0.9925, 4);
  });

  it('scales every segment from the task reward', () => {
    expect(segmentValuesMilli(2000)).toEqual([1000, 5000, 2000, 20000, 500, 3000]);
  });

  it('picks the segment the random draw falls in', () => {
    // Weights 30, 6, 25, 2, 25, 12 give boundaries at 30, 36, 61, 63, 88.
    expect(pickSegmentIndex(() => 0)).toBe(0); // first tick of segment 0
    expect(pickSegmentIndex(() => 0.29)).toBe(0); // last tick of segment 0
    expect(pickSegmentIndex(() => 0.3)).toBe(1); // first tick of segment 1
    expect(pickSegmentIndex(() => 0.35)).toBe(1); // still inside segment 1
    expect(pickSegmentIndex(() => 0.37)).toBe(2);
    expect(pickSegmentIndex(() => 0.61)).toBe(3);
    expect(pickSegmentIndex(() => 0.63)).toBe(4);
    expect(pickSegmentIndex(() => 0.88)).toBe(5);
  });

  it('never falls off the end, even at the top of the range', () => {
    expect(pickSegmentIndex(() => 0.999999)).toBe(SPIN_SEGMENTS.length - 1);
    expect(pickSegmentIndex(() => 1)).toBe(SPIN_SEGMENTS.length - 1);
  });

  it('returns a valid index for every draw', () => {
    for (let i = 0; i < 1000; i += 1) {
      const idx = pickSegmentIndex();
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(SPIN_SEGMENTS.length);
    }
  });

  it('lands on the rare prize about as often as its weight says', () => {
    // The 10x segment carries weight 2 of 100. Over 40k draws that is ~800;
    // a wide band keeps this from failing on an unlucky run.
    const rare = SPIN_SEGMENTS.findIndex((s) => s.multiplier === 10);
    let hits = 0;
    for (let i = 0; i < 40_000; i += 1) {
      if (pickSegmentIndex() === rare) hits += 1;
    }
    expect(hits).toBeGreaterThan(550);
    expect(hits).toBeLessThan(1100);
  });
});
