"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import { TAP_POINTS, pointsForTravel, travelAlongAxis } from "./holdSlider";
import type { Rotation } from "./seatLayout";

/** Long enough to feel through a phone case, short enough not to be a rattle. */
const ARM_BUZZ_MS = 12;

interface Point {
  x: number;
  y: number;
}

/**
 * A button that is worth one point per tap, and becomes a slider once the
 * finger travels far enough.
 *
 * Returns `armed` — whether the slide has taken over, for the panel to show —
 * and the handlers to spread onto the pressable element. Give that element
 * `touch-action: none`, or the slide turns into a page scroll.
 *
 * `rotation` is the seat's, and is what tells a slide which way is up for the
 * player doing it. Everything else about the press is direction-blind: the
 * caller applies the sign, so this hook only ever reports magnitudes.
 *
 * There is no clock in here. A tap and a slide are told apart by distance
 * alone, and what makes that survive a real thumb — which always drifts — is
 * that the first notch of travel is free (HOLD-8). A press stays a tap until
 * the slide is worth something, and from that moment the tap is gone and the
 * slide has it.
 */
export function useHoldSlider(
  rotation: Rotation,
  onStep: (points: number) => void,
  /**
   * The most a slide here can ever be worth, for a counter with a floor under
   * it. Read once, when the finger lands — it drops as the slide spends it, and
   * a limit that moved underneath the gesture would refund itself (HOLD-13).
   */
  limit = Number.POSITIVE_INFINITY,
) {
  const onStepRef = useRef(onStep);
  const latestLimit = useRef(limit);
  /** The limit as it stood when this press landed. */
  const pressedLimit = useRef(Number.POSITIVE_INFINITY);
  const pressed = useRef(false);
  /** Where the finger landed. Travel, and so everything, is measured from here. */
  const origin = useRef<Point>({ x: 0, y: 0 });
  /** Where the finger is now. */
  const at = useRef<Point>({ x: 0, y: 0 });
  /** Whether this press has become a slide. Once true it stays true. */
  const sliding = useRef(false);
  /** Points already sent this press, so a move only sends the difference. */
  const sent = useRef(0);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    onStepRef.current = onStep;
    latestLimit.current = limit;
  });

  /** Moves the total to what the gesture is worth, by sending the difference. */
  const settle = useCallback((due: number) => {
    const owed = due - sent.current;
    // Zero between notches, and negative when the finger comes back — sliding
    // back has to give the points back, or a slide could only ever overshoot.
    if (owed === 0) return;
    sent.current = due;
    onStepRef.current(owed);
  }, []);

  /** What the slide is worth right now. Nothing until it clears the free notch. */
  const due = useCallback(
    () =>
      pointsForTravel(
        travelAlongAxis(
          rotation,
          at.current.x - origin.current.x,
          at.current.y - origin.current.y,
        ),
        pressedLimit.current,
      ),
    [rotation],
  );

  const start = useCallback((point: Point) => {
    pressed.current = true;
    sliding.current = false;
    sent.current = 0;
    origin.current = point;
    at.current = point;
    pressedLimit.current = latestLimit.current;
    setArmed(false);
  }, []);

  const move = useCallback(
    (point: Point) => {
      if (!pressed.current) return;
      at.current = point;
      const worth = due();
      if (!sliding.current) {
        // Still inside the free notch, so still a tap. Nothing to pay and
        // nothing to announce.
        if (worth === 0) return;
        sliding.current = true;
        setArmed(true);
        // Absent on iOS Safari and in jsdom, so it can only ever be a bonus on
        // top of the panel lighting up.
        if (
          typeof navigator !== "undefined" &&
          typeof navigator.vibrate === "function"
        ) {
          navigator.vibrate(ARM_BUZZ_MS);
        }
      }
      settle(worth);
    },
    [due, settle],
  );

  /**
   * Lifting settles the gesture: the tap's point if the press never became a
   * slide, and whatever the slide came to if it did — which is nothing at all
   * when the finger came back to where it landed, and that is how a slide is
   * called off.
   */
  const release = useCallback(() => {
    if (!pressed.current) return;
    pressed.current = false;
    settle(sliding.current ? due() : TAP_POINTS);
    sliding.current = false;
    setArmed(false);
  }, [due, settle]);

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
