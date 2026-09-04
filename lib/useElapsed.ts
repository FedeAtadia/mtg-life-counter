"use client";

import { useEffect, useState } from "react";
import { elapsedMsOf, isRunning, showsSeconds } from "./timer";
import type { TimerState } from "./types";

/**
 * Elapsed game time, repainting only as often as the readout actually changes.
 *
 * Keep this in the smallest component that shows the clock: a second passing
 * should re-render that readout, not the whole board.
 */
export function useElapsed(timer: TimerState): number {
  // Safe for the static export despite reading the clock: the prerendered
  // state always has a stopped, zeroed timer, so both the build and the first
  // client render produce 0:00 regardless of what `now` is. The saved game
  // arrives later, by dispatch, after mount.
  const [now, setNow] = useState(() => Date.now());

  const elapsed = elapsedMsOf(timer, now);
  const running = isRunning(timer);
  // Past an hour the seconds are hidden, so there is nothing to repaint until
  // the minute rolls over.
  const period = showsSeconds(elapsed) ? 1000 : 15000;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), period);
    return () => window.clearInterval(id);
  }, [running, period]);

  return elapsed;
}
