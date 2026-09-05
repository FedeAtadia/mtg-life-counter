/**
 * How a held button counts. One rule for life totals and for commander damage,
 * so a press behaves the same wherever you put your thumb.
 *
 * A tap is worth one point. Keep holding and, after a short delay, the total
 * jumps by ten and then by another ten every second: from 40 you pass through
 * 41 while pressing, land on 50 once the delay is up, then 60, 70, and so on.
 */

/** How long a press must be held before it stops being a tap. */
export const HOLD_DELAY_MS = 500;

/** How much each jump is worth. */
export const STEP_SIZE = 10;

/** How long between jumps once holding has begun. */
export const STEP_INTERVAL_MS = 1000;

/** How often the hold is re-checked. Not how often it counts. */
export const TICK_MS = 100;

/**
 * What a press of this duration is worth in total, counting the single point
 * the press itself is always worth.
 *
 * Derived from elapsed time rather than by counting ticks on purpose. A timer
 * that fires late — a backgrounded tab throttles them to about a second — would
 * otherwise silently undercount, and the total would depend on how reliably the
 * browser scheduled the interval rather than on how long the button was held.
 */
export function pointsForHeldMs(heldMs: number): number {
  if (!Number.isFinite(heldMs) || heldMs < HOLD_DELAY_MS) return 1;
  const jumps = 1 + Math.floor((heldMs - HOLD_DELAY_MS) / STEP_INTERVAL_MS);
  return STEP_SIZE * jumps;
}
