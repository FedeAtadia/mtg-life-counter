"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  ARM_DELAY_MS,
  TAP_POINTS,
  isArmed,
  pointsForTravel,
  travelAlongAxis,
} from "./holdSlider";
import type { Rotation } from "./seatLayout";

/** Long enough to feel through a phone case, short enough not to be a rattle. */
const ARM_BUZZ_MS = 12;

interface Point {
  x: number;
  y: number;
}

/**
 * A button that is worth one point per tap, and becomes a slider when held.
 *
 * Returns `armed` — whether the slider has engaged, for the panel to show — and
 * the handlers to spread onto the pressable element. Give that element
 * `touch-action: none`, or the slide turns into a page scroll.
 *
 * `rotation` is the seat's, and is what tells a slide which way is up for the
 * player doing it. Everything else about the press is direction-blind: the
 * caller applies the sign, so this hook only ever reports magnitudes.
 *
 * Only one gesture lives on a press, and a clock decides which. An earlier
 * version chose between a tap and a drag by whether the finger moved first,
 * which does not survive a real thumb — a thumb always drifts. Holding still
 * for a second is something you can only do on purpose.
 */
export function useHoldSlider(
  rotation: Rotation,
  onStep: (points: number) => void,
  /**
   * The most a slide here can ever be worth, for a counter with a floor under
   * it. Read once, when the slider arms — it drops as the slide spends it, and
   * a limit that moved underneath the gesture would refund itself (HOLD-13).
   */
  limit = Number.POSITIVE_INFINITY,
) {
  const onStepRef = useRef(onStep);
  const latestLimit = useRef(limit);
  /** The limit as it stood when this gesture armed. */
  const armedLimit = useRef(Number.POSITIVE_INFINITY);
  const pressed = useRef(false);
  const pressedAt = useRef(0);
  /** Where the finger was when the slider armed. Null until it has. */
  const origin = useRef<Point | null>(null);
  /** Where the finger is now, so arming can take its origin from it. */
  const at = useRef<Point>({ x: 0, y: 0 });
  /** Points already sent this press, so a move only sends the difference. */
  const sent = useRef(0);
  const timer = useRef<number | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    onStepRef.current = onStep;
    latestLimit.current = limit;
  });

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  /** Moves the total to what the gesture is worth, by sending the difference. */
  const settle = useCallback((due: number) => {
    const owed = due - sent.current;
    // Zero between notches, and negative when the finger comes back — sliding
    // back has to give the points back, or a slide could only ever overshoot.
    if (owed === 0) return;
    sent.current = due;
    onStepRef.current(owed);
  }, []);

  /** What the slider is worth right now. Nothing until it has armed. */
  const due = useCallback(() => {
    const from = origin.current;
    if (from === null) return 0;
    return pointsForTravel(
      travelAlongAxis(rotation, at.current.x - from.x, at.current.y - from.y),
      armedLimit.current,
    );
  }, [rotation]);

  const arm = useCallback(() => {
    if (!pressed.current || origin.current !== null) return;
    clearTimer();
    // Where the finger is now, not where it landed a second ago. A thumb wanders
    // while it waits, and that wandering is not a slide.
    origin.current = { ...at.current };
    armedLimit.current = latestLimit.current;
    setArmed(true);
    // Absent on iOS Safari and in jsdom, so it can only ever be a bonus on top
    // of the panel lighting up.
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ARM_BUZZ_MS);
    }
  }, [clearTimer]);

  const start = useCallback(
    (point: Point) => {
      clearTimer();
      pressed.current = true;
      pressedAt.current = Date.now();
      origin.current = null;
      sent.current = 0;
      at.current = point;
      setArmed(false);
      // Arms a press that never moves, so the cue lands on time rather than
      // waiting for a finger that is already still.
      timer.current = window.setTimeout(arm, ARM_DELAY_MS);
    },
    [arm, clearTimer],
  );

  const move = useCallback(
    (point: Point) => {
      if (!pressed.current) return;
      at.current = point;
      if (origin.current === null) {
        // Asked of the clock rather than of the timer: a throttled tab fires
        // timeouts late, and the press is however long it really was.
        if (!isArmed(Date.now() - pressedAt.current)) return;
        arm();
      }
      settle(due());
    },
    [arm, due, settle],
  );

  /**
   * Lifting settles the gesture: the tap's point if it never armed, and
   * whatever the slide came to if it did — which is nothing at all when the
   * finger came back to where it started, and that is how a slide is called off.
   */
  const release = useCallback(() => {
    if (!pressed.current) return;
    pressed.current = false;
    clearTimer();
    settle(origin.current === null ? TAP_POINTS : due());
    origin.current = null;
    setArmed(false);
  }, [clearTimer, due, settle]);

  return {
    armed,
    handlers: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => {
        event.preventDefault();
        try {
          // Keeps the moves coming once the finger leaves the button, which
          // every slide worth much does. Throws when the pointer is already
          // gone, which must not break the press.
          event.currentTarget.setPointerCapture(event.pointerId);
        } catch {
          // Ignored on purpose.
        }
        start({ x: event.clientX, y: event.clientY });
      },
      onPointerMove: (event: PointerEvent<HTMLElement>) =>
        move({ x: event.clientX, y: event.clientY }),
      onPointerUp: release,
      onPointerCancel: release,
      onLostPointerCapture: release,
      onContextMenu: (event: { preventDefault: () => void }) =>
        event.preventDefault(),
    },
  };
}
