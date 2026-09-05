import { describe, expect, it } from "vitest";
import {
  DRAG_THRESHOLD_PX,
  LIFE_STEP,
  MAX_STEPS,
  STEP_DISTANCE_PX,
  deltaForSteps,
  dragDistanceAlongUp,
  stepsForDrag,
} from "./lifeGesture";
import type { Rotation } from "./seatLayout";

/** A drag of `px` in the direction that means "more" for a seat. */
function awayBy(px: number, rotation: Rotation): [number, number] {
  switch (rotation) {
    case 0:
      return [0, -px]; // near edge: up the screen
    case 180:
      return [0, px]; // far edge: down the screen
    case 90:
      return [px, 0]; // left edge: rightwards
    case -90:
      return [-px, 0]; // right edge: leftwards
  }
}

const ROTATIONS: Rotation[] = [0, 90, 180, -90];

describe("dragDistanceAlongUp", () => {
  it.each(ROTATIONS)(
    "measures a drag on the player's own axis (%i degrees)",
    (rotation) => {
      const [dx, dy] = awayBy(100, rotation);
      expect(dragDistanceAlongUp(dx, dy, rotation)).toBe(100);
      // Dragging back toward the player is negative, not just smaller.
      expect(dragDistanceAlongUp(-dx, -dy, rotation)).toBe(-100);
    },
  );

  it("ignores movement across the player's axis", () => {
    // A left-edge seat reads horizontal drag, so vertical drift is nothing.
    expect(dragDistanceAlongUp(0, 200, 90)).toBe(0);
    // And a near-edge seat is the other way round.
    expect(dragDistanceAlongUp(200, 0, 0)).toBe(0);
  });

  it("a quarter-turned seat responds to horizontal drag, not vertical", () => {
    expect(dragDistanceAlongUp(80, 0, 90)).toBe(80);
    expect(dragDistanceAlongUp(80, 0, -90)).toBe(-80);
    expect(dragDistanceAlongUp(0, 80, 90)).toBe(0);
  });
});

describe("stepsForDrag", () => {
  it.each(ROTATIONS)("stays at zero until the threshold (%i degrees)", (r) => {
    expect(stepsForDrag(...awayBy(0, r), r)).toBe(0);
    expect(stepsForDrag(...awayBy(DRAG_THRESHOLD_PX, r), r)).toBe(0);
    // Crossing the threshold is worth a whole step straight away.
    expect(stepsForDrag(...awayBy(DRAG_THRESHOLD_PX + 1, r), r)).toBe(1);
  });

  it.each(ROTATIONS)("adds a step every step distance (%i degrees)", (r) => {
    const at = (px: number) => stepsForDrag(...awayBy(px, r), r);
    expect(at(DRAG_THRESHOLD_PX + STEP_DISTANCE_PX)).toBe(2);
    expect(at(DRAG_THRESHOLD_PX + 2 * STEP_DISTANCE_PX)).toBe(3);
    expect(at(DRAG_THRESHOLD_PX + 5 * STEP_DISTANCE_PX)).toBe(6);
  });

  it.each(ROTATIONS)(
    "gives nothing for a drag back toward the player (%i degrees)",
    (r) => {
      const [dx, dy] = awayBy(-500, r);
      expect(stepsForDrag(dx, dy, r)).toBe(0);
    },
  );

  it("clamps a very long drag", () => {
    expect(stepsForDrag(0, -100_000, 0)).toBe(MAX_STEPS);
  });

  it("winds back down as the drag returns toward the player", () => {
    const at = (px: number) => stepsForDrag(0, -px, 0);
    expect(at(DRAG_THRESHOLD_PX + 3 * STEP_DISTANCE_PX)).toBe(4);
    expect(at(DRAG_THRESHOLD_PX + STEP_DISTANCE_PX)).toBe(2);
    expect(at(0)).toBe(0);
  });
});

describe("deltaForSteps", () => {
  it("takes its sign from the pressed half, never from the drag", () => {
    expect(deltaForSteps(-1, 3)).toBe(-15);
    expect(deltaForSteps(1, 3)).toBe(15);
    expect(deltaForSteps(-1, 1)).toBe(-LIFE_STEP);
  });

  it("is worth the press's single point at zero steps", () => {
    // Winding a drag all the way back leaves a plain tap, not nothing.
    expect(deltaForSteps(1, 0)).toBe(1);
    expect(deltaForSteps(-1, 0)).toBe(-1);
  });

  it("caps out at the step ceiling", () => {
    expect(deltaForSteps(-1, MAX_STEPS)).toBe(-LIFE_STEP * MAX_STEPS);
  });

  it("moves in fives once dragging", () => {
    for (let steps = 1; steps <= 6; steps++) {
      expect(deltaForSteps(1, steps) % LIFE_STEP).toBe(0);
    }
  });
});
