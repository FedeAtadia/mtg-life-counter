import { clamp } from "./rules";
import { upVectorFor } from "./seatLayout";
import type { Rotation } from "./seatLayout";

/** Life per step once a press turns into a drag. */
export const LIFE_STEP = 5;

/** How far you drag to add one more step. */
export const STEP_DISTANCE_PX = 30;

/**
 * Movement before a press counts as a drag rather than a tap. Measured along
 * the player's own axis, not as raw distance, so that a finger sliding a little
 * as it lifts stays a tap.
 */
export const DRAG_THRESHOLD_PX = 14;

/** Ceiling on one gesture: 20 steps is +/-100 life. */
export const MAX_STEPS = 20;

/**
 * How far a drag has travelled in the direction that means "more" for this
 * player: away from the edge they are sitting at. On a quarter-turned seat that
 * is a horizontal drag on screen, which is why this goes through the seat's own
 * up vector rather than just using dy.
 */
export function dragDistanceAlongUp(
  dx: number,
  dy: number,
  rotation: Rotation,
): number {
  const [ux, uy] = upVectorFor(rotation);
  return dx * ux + dy * uy;
}

/**
 * Steps of 5 for a drag. Zero until the drag threshold is crossed, then one
 * step immediately, and another every STEP_DISTANCE_PX after that.
 *
 * Only the distance matters — never the direction. The half of the panel that
 * was pressed decides whether the total is added or subtracted, so pulling away
 * from yourself always means "more of what I already chose", and pulling back
 * toward yourself winds the gesture back down to nothing.
 */
export function stepsForDrag(
  dx: number,
  dy: number,
  rotation: Rotation,
): number {
  const along = dragDistanceAlongUp(dx, dy, rotation);
  if (along <= DRAG_THRESHOLD_PX) return 0;
  const past = along - DRAG_THRESHOLD_PX;
  return clamp(Math.floor(past / STEP_DISTANCE_PX) + 1, 1, MAX_STEPS);
}

/**
 * What the gesture currently means, in life.
 *
 * At zero steps it is still worth the single point the press already applied,
 * so winding a drag all the way back leaves a plain tap rather than nothing —
 * a gesture can never silently amount to no change at all.
 */
export function deltaForSteps(sign: 1 | -1, steps: number): number {
  return steps === 0 ? sign : sign * LIFE_STEP * steps;
}
