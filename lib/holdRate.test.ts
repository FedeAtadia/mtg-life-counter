import { describe, expect, it } from "vitest";
import {
  HOLD_DELAY_MS,
  POINTS_PER_SECOND,
  TICK_MS,
  pointsForHeldMs,
} from "./holdRate";

describe("pointsForHeldMs", () => {
  it("is worth nothing until the hold delay passes", () => {
    // Everything shorter than the delay is a tap, and a tap is already worth
    // its own single point elsewhere.
    expect(pointsForHeldMs(0)).toBe(0);
    expect(pointsForHeldMs(200)).toBe(0);
    expect(pointsForHeldMs(HOLD_DELAY_MS - 1)).toBe(0);
  });

  it("starts counting the moment the delay is reached", () => {
    expect(pointsForHeldMs(HOLD_DELAY_MS)).toBe(1);
    expect(pointsForHeldMs(HOLD_DELAY_MS + TICK_MS)).toBe(2);
    expect(pointsForHeldMs(HOLD_DELAY_MS + 2 * TICK_MS)).toBe(3);
  });

  it("delivers ten points for the second after the delay", () => {
    const atDelay = pointsForHeldMs(HOLD_DELAY_MS);
    const aSecondLater = pointsForHeldMs(HOLD_DELAY_MS + 1000);
    expect(aSecondLater - atDelay).toBe(POINTS_PER_SECOND);
    expect(POINTS_PER_SECOND).toBe(10);
  });

  it("holds a constant rate rather than accelerating", () => {
    // The complaint about the old behaviour was that it ran away from you.
    // Every subsequent second must be worth exactly the same as the first.
    const at = (seconds: number) =>
      pointsForHeldMs(HOLD_DELAY_MS + seconds * 1000);
    for (let second = 1; second <= 8; second++) {
      expect(at(second) - at(second - 1)).toBe(POINTS_PER_SECOND);
    }
  });

  it("can stop on a value that is not a multiple of ten", () => {
    // Holding must be able to land on 7, or commander damage could never be
    // held to the lethal 21.
    expect(pointsForHeldMs(HOLD_DELAY_MS + 6 * TICK_MS)).toBe(7);
    expect(pointsForHeldMs(HOLD_DELAY_MS + 20 * TICK_MS)).toBe(21);
  });

  it("never goes backwards as the hold gets longer", () => {
    let previous = 0;
    for (let ms = 0; ms <= 5000; ms += 17) {
      const points = pointsForHeldMs(ms);
      expect(points).toBeGreaterThanOrEqual(previous);
      previous = points;
    }
  });

  it("catches up rather than undercounting when a tick arrives late", () => {
    // A backgrounded tab throttles timers to about a second. Deriving from
    // elapsed time means a late tick still owes the full amount.
    expect(pointsForHeldMs(HOLD_DELAY_MS + 1000)).toBe(11);
    expect(pointsForHeldMs(HOLD_DELAY_MS + 3000)).toBe(31);
  });

  it("shrugs off nonsense input", () => {
    expect(pointsForHeldMs(-1000)).toBe(0);
    expect(pointsForHeldMs(Number.NaN)).toBe(0);
  });
});
