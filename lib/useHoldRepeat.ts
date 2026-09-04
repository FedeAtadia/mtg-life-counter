"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

const INITIAL_DELAY = 420;
const MIN_DELAY = 45;
const ACCELERATION = 0.72;

/**
 * Fires once on press, then repeats at an accelerating rate while held.
 * Returns handlers to spread onto the pressable element; give that element
 * `touch-action: none` so a hold doesn't turn into a scroll gesture.
 */
export function useHoldRepeat(onStep: () => void) {
  const stepRef = useRef(onStep);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    stepRef.current = onStep;
  });

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    stop();
    stepRef.current();
    let delay = INITIAL_DELAY;
    const tick = () => {
      stepRef.current();
      delay = Math.max(MIN_DELAY, delay * ACCELERATION);
      timerRef.current = window.setTimeout(tick, delay);
    };
    timerRef.current = window.setTimeout(tick, delay);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      try {
        // Keeps the repeat running if the finger drifts off the button. Throws
        // if the pointer is already gone, which must not break the tap.
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignored on purpose.
      }
      start();
    },
    onPointerUp: stop,
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onContextMenu: (event: { preventDefault: () => void }) =>
      event.preventDefault(),
  };
}
