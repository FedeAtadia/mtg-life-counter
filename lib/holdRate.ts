/**
 * How fast a held button counts. One rule for life totals and for commander
 * damage, so a press behaves the same wherever you put your thumb.
 *
 * A tap is worth one point. Keep holding and, after a short delay, the number
 * climbs at a constant ten points per second until you let go — constant, not
 * accelerating, so it never runs away from the value you were aiming at and you
 * can release on 7 or 13 rather than only on multiples of ten.
 */

/** How long a press must be held before it starts counting on its own. */
export const HOLD_DELAY_MS = 500;

/** One point per tick; ten ticks a second. */
export const TICK_MS = 100;

export const POINTS_PER_SECOND = 1000 / TICK_MS;

/**
 * Points a hold of this duration should have applied, not counting the one the
 * initial press is always worth.
 *
 * Derived from elapsed time rather than by counting ticks on purpose. A timer
 * that fires late — a backgrounded tab throttles them to about a second — would
 * otherwise silently undercount, and the total would depend on how reliably the
 * browser scheduled the interval rather than on how long the button was held.
 */
export function pointsForHeldMs(heldMs: number): number {
  if (!Number.isFinite(heldMs) || heldMs < HOLD_DELAY_MS) return 0;
  return Math.floor((heldMs - HOLD_DELAY_MS) / TICK_MS) + 1;
}
