"use client";

import { useEffect, useRef, type PointerEvent } from "react";

/**
 * How long a press has to be held before it means something else (ROLL-2).
 *
 * Long enough that a deliberate tap never reaches it, short enough that a
 * press meant as a hold does not feel like waiting.
 */
export const LONG_PRESS_MS = 350;

/** Long enough to feel through a phone case — the same buzz a slide arms with. */
const HOLD_BUZZ_MS = 12;

export interface Point {
  x: number;
  y: number;
}

export interface LongPressCallbacks {
  /** A press that lifted before the wait was up — or a click with no pointer. */
  onTap: () => void;
  /** The wait is up and the finger is still down. */
  onLongPress: () => void;
  /** Where the finger is, for every move after the long press has fired. */
  onDrag?: (at: Point) => void;
  /**
   * The end of a long press: where the finger lifted, or null when the browser
   * took the pointer away and there is no honest position to report.
   */
  onRelease?: (at: Point | null) => void;
}

/**
 * A button that means one thing tapped and another held.
 *
 * The only timed press in the app. The life and damage sliders are told apart
 * from a tap by distance alone (HOLD-2), because there travel *is* the input.
 * On a button with nothing to slide along, waiting is the only other signal
 * there is.
 *
 * A tap is counted on the click rather than on the lift, so a keyboard or a
 * screen reader — which send a click and no pointer at all — can use it. The
 * cost is that a long press is also followed by a click, which has to be
 * swallowed rather than counted as a tap on top of the release.
 *
 * Give the element `touch-action: none`, or a finger sliding off it after a
 * long press turns into a scroll.
 */
export function useLongPress(callbacks: LongPressCallbacks) {
  const latest = useRef(callbacks);
  const pressed = useRef(false);
  /** Whether this press has become a long press. Once true, the click is not a tap. */
  const held = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    latest.current = callbacks;
  });

  const clearTimer = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };

  // A press still waiting when the button goes must not fire into nothing.
  useEffect(() => clearTimer, []);

  const end = (at: Point | null) => {
    if (!pressed.current) return;
    pressed.current = false;
    clearTimer();
    if (!held.current) return;
    latest.current.onRelease?.(at);
    // The click that follows this lift, if the browser sends one, arrives in
    // the same task; after that the flag has nothing left to swallow. Some
    // phones send no click after a long touch at all, and a flag left standing
    // would eat the next honest tap instead.
    window.setTimeout(() => {
      held.current = false;
    }, 0);
  };

  return {
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        try {
          // Keeps the moves coming to this button once the finger slides off
          // it onto the picker. Throws when the pointer is already gone, and
          // does not exist in jsdom; neither must break the press.
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Ignored on purpose.
        }
        pressed.current = true;
        held.current = false;
        clearTimer();
        timer.current = window.setTimeout(() => {
          timer.current = null;
          held.current = true;
          latest.current.onLongPress();
          // Absent on iOS Safari and in jsdom: a bonus, never the signal.
          if (
            typeof navigator !== "undefined" &&
            typeof navigator.vibrate === "function"
          ) {
            navigator.vibrate(HOLD_BUZZ_MS);
          }
        }, LONG_PRESS_MS);
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) => {
        if (!pressed.current || !held.current) return;
        latest.current.onDrag?.({ x: event.clientX, y: event.clientY });
      },
      onPointerUp: (event: PointerEvent<HTMLElement>) =>
        end({ x: event.clientX, y: event.clientY }),
      onPointerCancel: () => end(null),
      onLostPointerCapture: () => end(null),
      onClick: () => {
        if (held.current) {
          held.current = false;
          return;
        }
        latest.current.onTap();
      },
      onContextMenu: (event: { preventDefault: () => void }) =>
        event.preventDefault(),
    },
  };
}
