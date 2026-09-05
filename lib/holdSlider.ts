/**
 * What a press is worth. One rule for life totals and for commander damage, so
 * a press behaves the same wherever you put your thumb.
 *
 * A press is one of two things. Lift without going anywhere and it was a tap,
 * worth a single point however long it was held. Travel far enough and it
 * becomes a slider: the total then moves only as far as the finger does, five
 * points for every notch, at a rate that never changes however far it runs.
 *
 * No clock comes into this. Distance alone decides which of the two a press
 * was, and the first stretch of travel is free — it is what a press spends
 * proving it is a slide. Without it a thumb rolling a few millimetres on its
 * way up would turn a tap worth one into a slide worth five.
 *
 * The slide sets how much and never which way — the half of the panel that was
 * pressed already decided that (LIFE-1). So travel counts the same in either
 * direction along the axis, and a press that began on "−" can never leave the
 * total higher than it found it.
 */

import { upVectorFor, type Rotation } from "./seatLayout";

/** What a tap is worth. */
export const TAP_POINTS = 1;

/** What one notch of the slider is worth. */
export const NOTCH_POINTS = 5;

/** How far the finger travels for one notch. About a fingertip's width. */
export const NOTCH_PX = 32;

/**
 * How much travel is swallowed before a slide starts counting notches at all.
 *
 * This is the whole of what separates a tap from a slide, now that no clock
 * does. Big enough that a thumb rolling off a button cannot spend it by
 * accident, small enough that a deliberate slide starts paying quickly: at
 * 16 px a tap survives 47 px of drift, and the first 5 lands at 48 px.
 *
 * Its own distance rather than a whole notch, so it can be tuned by feel
 * without moving what a notch is worth.
 */
export const FREE_PX = 16;

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
 * How many notches this much travel actually pays for, the free stretch
 * already taken off. Zero means the press is still a tap.
 *
 * Distance only. Which way along the axis the finger went does not reach this
 * function, because it is not allowed to change anything (HOLD-9).
 */
export function notchesForTravel(travelPx: number): number {
  if (!Number.isFinite(travelPx)) return 0;
  const paying = Math.abs(travelPx) - FREE_PX;
  if (paying < 0) return 0;
  return Math.floor(paying / NOTCH_PX);
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
