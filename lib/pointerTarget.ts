/**
 * What is under a point on the screen, walked up to the nearest thing that
 * matters.
 *
 * Asks the browser rather than working it out from any component's own
 * geometry, which would have to be kept in step with every change to its
 * layout. What is under a finger is usually a label or an icon inside the
 * thing being aimed at, hence the walk up.
 *
 * jsdom has no `elementFromPoint` at all, so the guard is not paranoia: it is
 * the difference between a test that cannot exercise a drag and a test that
 * crashes. Tests stand one in when they need to say what the finger is over.
 */
export function targetUnder(
  x: number,
  y: number,
  selector: string,
): HTMLElement | null {
  if (typeof document.elementFromPoint !== "function") return null;
  return document.elementFromPoint(x, y)?.closest<HTMLElement>(selector) ?? null;
}
