import type { TimerState } from "./types";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

export const STOPPED_TIMER: TimerState = { startedAt: null, elapsedMs: 0 };

export function startedTimerAt(at: number): TimerState {
  return { startedAt: at, elapsedMs: 0 };
}

/**
 * Total elapsed time, including the segment currently running. The running
 * segment is clamped rather than the total, so a `now` that briefly lags
 * behind a just-set `startedAt` cannot eat into the banked time.
 */
export function elapsedMsOf(timer: TimerState, now: number): number {
  const running =
    timer.startedAt === null ? 0 : Math.max(0, now - timer.startedAt);
  return Math.max(0, timer.elapsedMs) + running;
}

export function isRunning(timer: TimerState): boolean {
  return timer.startedAt !== null;
}

/**
 * True once the clock has run at all, which is what tells a game in progress
 * from one still waiting to be started.
 *
 * Derived rather than stored: a stopped clock with nothing on it has never
 * run, so no flag has to be persisted and no saved game needs migrating.
 */
export function hasStarted(timer: TimerState): boolean {
  return timer.startedAt !== null || timer.elapsedMs > 0;
}

/**
 * Minutes and seconds for the first hour, then hours and minutes: a game long
 * enough to pass an hour doesn't need the seconds, and "1:05" stays as short as
 * "59:59" so the pill never changes width much.
 */
export function formatElapsed(ms: number): string {
  const total = Math.max(0, ms);
  const pad = (n: number) => String(n).padStart(2, "0");

  if (total >= HOUR) {
    const hours = Math.floor(total / HOUR);
    const minutes = Math.floor((total % HOUR) / MINUTE);
    return `${hours}:${pad(minutes)}`;
  }

  const minutes = Math.floor(total / MINUTE);
  const seconds = Math.floor((total % MINUTE) / SECOND);
  return `${minutes}:${pad(seconds)}`;
}

/** True once the readout only changes once a minute, so it can tick lazily. */
export function showsSeconds(ms: number): boolean {
  return ms < HOUR;
}
