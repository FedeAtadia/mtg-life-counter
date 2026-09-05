"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";
import { TICK_MS, pointsForHeldMs } from "./holdRate";

/**
 * A button that is worth one point per tap, and jumps by ten while held.
 *
 * Returns handlers to spread onto the pressable element; give that element
 * `touch-action: none` so holding cannot turn into a page scroll.
 *
 * Only one gesture lives on a press, deliberately. An earlier version put a tap,
 * a hold and a drag on the same finger and chose between them by whether you
 * moved first, which does not survive a real thumb — a thumb always drifts.
 */
export function useSteadyHold(onStep: (points: number) => void) {
  const onStepRef = useRef(onStep);
  const pressedAt = useRef(0);
  const holding = useRef(false);
  /** Points already sent this press, so a tick only sends the difference. */
  const sent = useRef(0);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    onStepRef.current = onStep;
  });

  const stop = useCallback(() => {
    if (timer.current !== null) {
      window.clearInterval(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => stop, [stop]);

  /** Sends whatever the elapsed hold is owed but has not been paid yet. */
  const settleUp = useCallback(() => {
    const due = pointsForHeldMs(Date.now() - pressedAt.current);
    const owed = due - sent.current;
    if (owed <= 0) return;
    sent.current = due;
    onStepRef.current(owed);
  }, []);

  const start = useCallback(() => {
    stop();
    pressedAt.current = Date.now();
    holding.current = true;
    // The press itself is always worth exactly one point, and it counts towards
    // the hold's running total — so the first jump lands on 50 from 40, not 51.
    sent.current = 1;
    onStepRef.current(1);
    timer.current = window.setInterval(settleUp, TICK_MS);
  }, [settleUp, stop]);

  /**
   * Release pays out the rest of the hold before stopping. Without this, points
   * earned since the last tick are dropped on the floor — barely visible when
   * ticks are on time, and badly wrong when the browser is throttling them.
   */
  const release = useCallback(() => {
    if (!holding.current) return;
    holding.current = false;
    settleUp();
    stop();
  }, [settleUp, stop]);

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      try {
        // Keeps the hold alive if the thumb slides off the button. Throws when
        // the pointer is already gone, which must not break the press.
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignored on purpose.
      }
      start();
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onContextMenu: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
  };
}
