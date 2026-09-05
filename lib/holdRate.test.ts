import { describe, expect, it } from "vitest";
import {
  HOLD_DELAY_MS,
  STEP_INTERVAL_MS,
  STEP_SIZE,
  pointsForHeldMs,
} from "./holdRate";

describe("pointsForHeldMs", () => {
  it("is worth a single point until the hold delay passes", () => {
    expect(pointsForHeldMs(0)).toBe(1);
    expect(pointsForHeldMs(200)).toBe(1);
    expect(pointsForHeldMs(HOLD_DELAY_MS - 1)).toBe(1);
  });

  it("jumps to ten the moment the delay is reached", () => {
    expect(pointsForHeldMs(HOLD_DELAY_MS)).toBe(10);
  });

  it("adds another ten every second after that", () => {
    const at = (afterDelayMs: number) =>
      pointsForHeldMs(HOLD_DELAY_MS + afterDelayMs);
    expect(at(0)).toBe(10);
    expect(at(999)).toBe(10);
    expect(at(STEP_INTERVAL_MS)).toBe(20);
    expect(at(2 * STEP_INTERVAL_MS)).toBe(30);
    expect(at(5 * STEP_INTERVAL_MS)).toBe(60);
  });

  it("walks 40 up through 50 and 60, as described", () => {
    // The behaviour, stated the way it was asked for: press and you pass
    // through 41, land on 50 once the delay is up, then 60 a second later.
    const start = 40;
    expect(start + pointsForHeldMs(0)).toBe(41);
    expect(start + pointsForHeldMs(HOLD_DELAY_MS)).toBe(50);
    expect(start + pointsForHeldMs(HOLD_DELAY_MS + STEP_INTERVAL_MS)).toBe(60);
    expect(start + pointsForHeldMs(HOLD_DELAY_MS + 2 * STEP_INTERVAL_MS)).toBe(
      70,
    );
  });

  it("keeps a constant rate rather than accelerating", () => {
    // The complaint about the original behaviour was that it ran away from you.
    // Every second must be worth exactly the same as the one before it.
    const at = (seconds: number) =>
      pointsForHeldMs(HOLD_DELAY_MS + seconds * STEP_INTERVAL_MS);
    for (let second = 1; second <= 8; second++) {
      expect(at(second) - at(second - 1)).toBe(STEP_SIZE);
    }
  });

  it("only ever lands on multiples of ten once holding", () => {
    for (let ms = HOLD_DELAY_MS; ms <= 8000; ms += 37) {
      expect(pointsForHeldMs(ms) % STEP_SIZE).toBe(0);
    }
  });

  it("never goes backwards as the hold gets longer", () => {
    let previous = 0;
    for (let ms = 0; ms <= 8000; ms += 17) {
      const points = pointsForHeldMs(ms);
      expect(points).toBeGreaterThanOrEqual(previous);
      previous = points;
    }
  });

  it("catches up rather than undercounting when a tick arrives late", () => {
    // A backgrounded tab throttles timers to about a second. Deriving from
    // elapsed time means a late tick still owes the full amount.
    expect(pointsForHeldMs(HOLD_DELAY_MS + 3 * STEP_INTERVAL_MS)).toBe(40);
  });

  it("shrugs off nonsense input", () => {
    expect(pointsForHeldMs(-1000)).toBe(1);
    expect(pointsForHeldMs(Number.NaN)).toBe(1);
  });
});
