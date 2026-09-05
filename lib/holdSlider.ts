/**
 * What a press is worth. One rule for life totals and for commander damage, so
 * a press behaves the same wherever you put your thumb.
 *
 * A press is one of two things. Lift within a second and it was a tap, worth a
 * single point. Keep holding and it becomes a slider: the total then moves only
 * as far as the finger does, five points for every notch of travel, at a rate
 * that never changes however long the slide runs.
 *
 * The slide sets how much and never which way — the half of the panel that was
 * pressed already decided that (LIFE-1). So travel counts the same in either
 * direction along the axis, and a press that began on "−" can never leave the
 * total higher than it found it.
 */

import { upVectorFor, type Rotation } from "./seatLayout";

/** How long a press is held before it stops being a tap and becomes a slider. */
export const ARM_DELAY_MS = 1000;

/** What a tap is worth. */
export const TAP_POINTS = 1;

/** What one notch of the slider is worth. */
export const NOTCH_POINTS = 5;

/** How far the finger travels for one notch. About a fingertip's width. */
export const NOTCH_PX = 32;

/** Whether a press held this long has become a slider. */
export function isArmed(heldMs: number): boolean {
  return Number.isFinite(heldMs) && heldMs >= ARM_DELAY_MS;
}

/**
 * How far a drag of (dx, dy) screen pixels has carried along the axis the
 * player at this seat reads as up and down.
 *
 * Screen coordinates, because that is what a pointer event reports — a CSS
 * rotation turns the panel, not the pointer. The seat's own sense of up comes
 * from `upVectorFor`, which is also what rotates the panel, so a gesture and a
 * seat cannot disagree about which way a player is facing (SEAT-6).
 *
 * Only movement along that one axis counts; the perpendicular component is
 * thrown away. A thumb drifts sideways whether you mean it to or not, and at
 * 32 px a notch that drift would otherwise be worth 5 life.
 */
export function travelAlongAxis(
  rotation: Rotation,
  dx: number,
  dy: number,
): number {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  const [ux, uy] = upVectorFor(rotation);
  return dx * ux + dy * uy;
}

/**
 * How many whole notches this much travel is worth.
 *
 * Distance only. Which way along the axis the finger went does not reach this
 * function, because it is not allowed to change anything (HOLD-9).
 */
export function notchesForTravel(travelPx: number): number {
  if (!Number.isFinite(travelPx)) return 0;
  return Math.floor(Math.abs(travelPx) / NOTCH_PX);
}

/**
 * What a slider carried this far is worth, unsigned, and never more than there
 * is to take.
 *
 * Derived from the distance the finger has covered rather than by counting the
 * moves that got it there, on purpose. A pointer stream that coalesces or drops
 * moves — every phone does under load — would otherwise silently undercount,
 * and the total would depend on how many events the browser felt like sending
 * rather than on how far the thumb actually went.
 *
 * The limit is what stops a slide running past a counter that has a floor.
 * Slide three notches off a commander damage counter holding 5 and only 5 can
 * land; without the cap the gesture would still believe it was owed 15, and
 * sliding part of the way back would pay the difference out in the opposite
 * direction — dealing damage on the half of the tile that removes it (HOLD-13).
 */
export function pointsForTravel(
  travelPx: number,
  limit = Number.POSITIVE_INFINITY,
): number {
  const wanted = notchesForTravel(travelPx) * NOTCH_POINTS;
  return Math.min(wanted, Number.isFinite(limit) ? Math.max(0, limit) : wanted);
}
