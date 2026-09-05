import { describe, expect, it } from "vitest";
import {
  FREE_NOTCHES,
  NOTCH_POINTS,
  NOTCH_PX,
  notchesForTravel,
  pointsForTravel,
  travelAlongAxis,
} from "./holdSlider";
import { SEAT_LAYOUTS, upVectorFor } from "./seatLayout";
import type { Rotation } from "./seatLayout";

const ROTATIONS: Rotation[] = [0, 90, 180, -90];

/** Travel worth this many paying notches, the free one included. */
const px = (payingNotches: number) =>
  (payingNotches + FREE_NOTCHES) * NOTCH_PX;

describe("the figures the spec names", () => {
  it("gives the first notch away, then pays five for every 32 px", () => {
    // Spelled out rather than read back from the constants. Every other test
    // here derives its numbers from them, so on their own they would follow a
    // changed constant anywhere it went and HOLD-8 would quietly stop being
    // true.
    expect(NOTCH_PX).toBe(32);
    expect(NOTCH_POINTS).toBe(5);
    expect(FREE_NOTCHES).toBe(1);

    expect(pointsForTravel(31)).toBe(0);
    expect(pointsForTravel(32)).toBe(0);
    expect(pointsForTravel(63)).toBe(0);
    expect(pointsForTravel(64)).toBe(5);
    expect(pointsForTravel(96)).toBe(10);
    expect(pointsForTravel(160)).toBe(20);
  });
});

describe("the free notch (HOLD-2, HOLD-8)", () => {
  it("is worth nothing, however far into it the finger goes", () => {
    // This is the whole of what tells a tap from a slide now that no clock
    // does. A thumb rolling off a button has to stay a tap.
    for (let travel = 0; travel < NOTCH_PX * FREE_NOTCHES + NOTCH_PX; travel++) {
      expect(pointsForTravel(travel)).toBe(0);
    }
  });

  it("hands over the moment it is spent", () => {
    expect(notchesForTravel(px(0) - 1)).toBe(0);
    expect(notchesForTravel(px(1))).toBe(1);
    expect(pointsForTravel(px(1))).toBe(NOTCH_POINTS);
  });

  it("protects a tap from drift in either direction", () => {
    for (let travel = 0; travel <= 2 * NOTCH_PX - 1; travel++) {
      expect(pointsForTravel(-travel)).toBe(0);
    }
  });
});

describe("what a slide is worth (HOLD-8)", () => {
  it("adds another five every notch after the free one", () => {
    expect(pointsForTravel(px(1))).toBe(5);
    expect(pointsForTravel(px(2))).toBe(10);
    expect(pointsForTravel(px(3))).toBe(15);
    expect(pointsForTravel(px(8))).toBe(40);
  });

  it("keeps a constant rate rather than accelerating", () => {
    // The complaint about the original behaviour was that it ran away from you:
    // it was a rate per second, so a press held a moment too long overshot by
    // ten. Every notch must be worth exactly what the one before it was.
    for (let notch = 2; notch <= 12; notch++) {
      expect(pointsForTravel(px(notch)) - pointsForTravel(px(notch - 1))).toBe(
        NOTCH_POINTS,
      );
    }
  });

  it("only ever lands on multiples of five", () => {
    for (let travel = 0; travel <= 500; travel += 7) {
      expect(pointsForTravel(travel) % NOTCH_POINTS).toBe(0);
    }
  });

  it("never goes backwards as the slide gets longer", () => {
    let previous = 0;
    for (let travel = 0; travel <= 500; travel += 3) {
      const points = pointsForTravel(travel);
      expect(points).toBeGreaterThanOrEqual(previous);
      previous = points;
    }
  });

  it("shrugs off nonsense input", () => {
    expect(notchesForTravel(Number.NaN)).toBe(0);
    expect(notchesForTravel(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe("a slide with a floor under it (HOLD-13)", () => {
  it("is worth no more than the limit allows", () => {
    expect(pointsForTravel(px(3), 5)).toBe(5);
    expect(pointsForTravel(px(10), 5)).toBe(5);
  });

  it("leaves a slide under the limit alone", () => {
    expect(pointsForTravel(px(2), 50)).toBe(10);
  });

  it("is worth nothing at all when there is nothing to take", () => {
    // A counter already at zero: sliding on the half that removes damage has
    // to stay a complete no-op however far the finger goes (CMDR-3).
    for (let travel = 0; travel <= 400; travel += 13) {
      expect(pointsForTravel(travel, 0)).toBe(0);
    }
  });

  it("is unlimited when no limit is given", () => {
    expect(pointsForTravel(px(9))).toBe(45);
  });
});

describe("which way the slide went (HOLD-9)", () => {
  it("counts travel the same in either direction along the axis", () => {
    // The half that was pressed already set the direction. A slide is only
    // ever allowed to say how far — so a thumb that goes the other way still
    // counts, rather than leaving a dead direction under the finger.
    for (let travel = 0; travel <= 300; travel += 11) {
      expect(pointsForTravel(-travel)).toBe(pointsForTravel(travel));
    }
  });
});

describe("which way is up (HOLD-10, SEAT-6)", () => {
  it("counts a drag away from the player as travel, whatever their seat", () => {
    for (const rotation of ROTATIONS) {
      const [ux, uy] = upVectorFor(rotation);
      expect(travelAlongAxis(rotation, 64 * ux, 64 * uy)).toBe(64);
    }
  });

  it("discards drift across that axis", () => {
    // A thumb wanders sideways whether you mean it to or not, and at 32 px a
    // notch that wandering would otherwise be worth 5 life.
    for (const rotation of ROTATIONS) {
      const [ux, uy] = upVectorFor(rotation);
      // The perpendicular of (ux, uy), which is the axis nothing counts along.
      expect(travelAlongAxis(rotation, 200 * -uy, 200 * ux)).toBe(0);
    }
  });

  it("keeps the sideways part of a diagonal out of the total", () => {
    for (const rotation of ROTATIONS) {
      const [ux, uy] = upVectorFor(rotation);
      const dx = 64 * ux + 200 * -uy;
      const dy = 64 * uy + 200 * ux;
      expect(travelAlongAxis(rotation, dx, dy)).toBe(64);
    }
  });

  it("takes its sense of up from the same place the seats do", () => {
    // If a gesture and a seat ever disagreed about which way a player faces,
    // sliding away from you would add life at one seat and remove it at
    // another. Checked against every rotation any layout actually uses.
    const used = new Set(
      Object.values(SEAT_LAYOUTS).flatMap((layout) =>
        layout.seats.map((seat) => seat.rotation),
      ),
    );
    for (const rotation of used) {
      const [ux, uy] = upVectorFor(rotation);
      expect(travelAlongAxis(rotation, ux, uy)).toBe(1);
    }
  });

  it("shrugs off nonsense input", () => {
    expect(travelAlongAxis(0, Number.NaN, 10)).toBe(0);
    expect(travelAlongAxis(0, 10, Number.NaN)).toBe(0);
  });
});
