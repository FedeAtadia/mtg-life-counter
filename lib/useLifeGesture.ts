"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { deltaForSteps, stepsForDrag } from "./lifeGesture";
import type { Rotation } from "./seatLayout";

const HOLD_DELAY_MS = 420;
const REPEAT_MIN_DELAY_MS = 45;
const REPEAT_ACCELERATION = 0.72;

type Mode = "idle" | "pressed" | "repeating" | "dragging";

interface Options {
  /** Which way this panel faces, so a drag is measured on the player's axis. */
  rotation: Rotation;
  /** +1 for the gain half, -1 for the lose half. */
  sign: 1 | -1;
  /** Applies a change to the life total. Called many times per gesture. */
  onChange: (delta: number) => void;
}

/**
 * One press, three gestures, with the mode settled early and never switched
 * mid-gesture:
 *
 * - tap                -> the single point applied on press
 * - press and hold     -> that point, then an accelerating repeat
 * - press and drag out -> steps of 5, updating live as you move
 *
 * A drag is only entered from a press that has not yet started repeating, and
 * a repeat ignores movement entirely, so the two can never fight over the same
 * finger.
 */
export function useLifeGesture({ rotation, sign, onChange }: Options) {
  const onChangeRef = useRef(onChange);
  const mode = useRef<Mode>("idle");
  const origin = useRef({ x: 0, y: 0 });
  const holdTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);
  /** Life this gesture has already applied, so moves can send the difference. */
  const applied = useRef(0);
  const steps = useRef(0);

  /** Non-null while dragging: the running total, for the on-screen preview. */
  const [preview, setPreview] = useState<number | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const clearTimers = useCallback(() => {
    if (holdTimer.current !== null) window.clearTimeout(holdTimer.current);
    if (repeatTimer.current !== null) window.clearTimeout(repeatTimer.current);
    holdTimer.current = null;
    repeatTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  /** Moves the total to `next`, sending only what has not been applied yet. */
  const applyTo = useCallback((next: number) => {
    const difference = next - applied.current;
    if (difference === 0) return;
    applied.current = next;
    onChangeRef.current(difference);
  }, []);

  const startRepeating = useCallback(() => {
    mode.current = "repeating";
    let delay = HOLD_DELAY_MS;
    const tick = () => {
      applyTo(applied.current + sign);
      delay = Math.max(REPEAT_MIN_DELAY_MS, delay * REPEAT_ACCELERATION);
      repeatTimer.current = window.setTimeout(tick, delay);
    };
    tick();
  }, [applyTo, sign]);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      try {
        // Keeps the gesture alive once the finger leaves the button, which a
        // drag of any length does. Throws if the pointer is already gone.
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Ignored on purpose.
      }

      clearTimers();
      mode.current = "pressed";
      origin.current = { x: event.clientX, y: event.clientY };
      applied.current = 0;
      steps.current = 0;

      // Immediate feedback, and the floor of whatever this gesture becomes.
      applyTo(sign);
      holdTimer.current = window.setTimeout(startRepeating, HOLD_DELAY_MS);
    },
    [applyTo, clearTimers, sign, startRepeating],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (mode.current !== "pressed" && mode.current !== "dragging") return;

      const next = stepsForDrag(
        event.clientX - origin.current.x,
        event.clientY - origin.current.y,
        rotation,
      );

      if (mode.current === "pressed") {
        if (next === 0) return; // Still just a press that hasn't moved enough.
        clearTimers(); // Committed to a drag; the hold repeat never starts.
        mode.current = "dragging";
      }

      if (next !== steps.current) {
        steps.current = next;
        // Android only; iOS Safari ignores it rather than failing.
        navigator.vibrate?.(8);
      }

      const total = deltaForSteps(sign, next);
      applyTo(total);
      setPreview(total);
    },
    [applyTo, clearTimers, rotation, sign],
  );

  const onPointerUp = useCallback(() => {
    clearTimers();
    mode.current = "idle";
    setPreview(null);
  }, [clearTimers]);

  return {
    preview,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onLostPointerCapture: onPointerUp,
      onContextMenu: (event: { preventDefault: () => void }) =>
        event.preventDefault(),
    },
  };
}
