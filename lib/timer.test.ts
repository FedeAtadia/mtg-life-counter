import { describe, expect, it } from "vitest";
import {
  STOPPED_TIMER,
  elapsedMsOf,
  formatElapsed,
  hasStarted,
  isRunning,
  showsSeconds,
} from "./timer";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatElapsed", () => {
  it("shows minutes and seconds below an hour", () => {
    expect(formatElapsed(0)).toBe("0:00");
    expect(formatElapsed(9 * SECOND)).toBe("0:09");
    expect(formatElapsed(7 * MINUTE + 32 * SECOND)).toBe("7:32");
    expect(formatElapsed(59 * MINUTE + 59 * SECOND)).toBe("59:59");
  });

  it("switches to hours and minutes exactly at one hour", () => {
    // The boundary: one millisecond either side changes the whole format.
    expect(formatElapsed(HOUR - 1)).toBe("59:59");
    expect(formatElapsed(HOUR)).toBe("1:00");
    expect(formatElapsed(HOUR + 5 * MINUTE)).toBe("1:05");
    expect(formatElapsed(HOUR + 59 * MINUTE + 59 * SECOND)).toBe("1:59");
    expect(formatElapsed(2 * HOUR)).toBe("2:00");
    expect(formatElapsed(12 * HOUR + 34 * MINUTE)).toBe("12:34");
  });

  it("never renders a negative clock", () => {
    expect(formatElapsed(-1)).toBe("0:00");
    expect(formatElapsed(-HOUR)).toBe("0:00");
  });
});

describe("elapsedMsOf", () => {
  const T0 = 1_700_000_000_000;

  it("counts the running segment on top of banked time", () => {
    expect(
      elapsedMsOf({ startedAt: T0, elapsedMs: 90 * SECOND }, T0 + 30 * SECOND),
    ).toBe(2 * MINUTE);
  });

  it("holds still while paused", () => {
    const paused = { startedAt: null, elapsedMs: 5 * MINUTE };
    expect(elapsedMsOf(paused, T0)).toBe(5 * MINUTE);
    expect(elapsedMsOf(paused, T0 + 10 * HOUR)).toBe(5 * MINUTE);
  });

  it("does not let a lagging clock eat into banked time", () => {
    // `now` can trail a freshly set `startedAt` by a frame after a resume.
    expect(
      elapsedMsOf({ startedAt: T0 + 500, elapsedMs: 10 * MINUTE }, T0),
    ).toBe(10 * MINUTE);
  });
});

describe("isRunning / showsSeconds", () => {
  it("reads the running state off startedAt", () => {
    expect(isRunning({ startedAt: 1, elapsedMs: 0 })).toBe(true);
    expect(isRunning({ startedAt: null, elapsedMs: 99 })).toBe(false);
  });

  it("stops needing a per-second tick once the seconds are hidden", () => {
    expect(showsSeconds(HOUR - 1)).toBe(true);
    expect(showsSeconds(HOUR)).toBe(false);
  });
});

describe("hasStarted", () => {
  const T0 = 1_700_000_000_000;

  it("is false on a clock nobody has started yet", () => {
    // What tells a game waiting to be started from one in progress: no flag is
    // stored for it, so a save written before the Start button existed reads
    // correctly too.
    expect(hasStarted(STOPPED_TIMER)).toBe(false);
  });

  it("is true while the clock is running", () => {
    expect(hasStarted({ startedAt: T0, elapsedMs: 0 })).toBe(true);
  });

  it("is true for a game paused with time on it", () => {
    expect(hasStarted({ startedAt: null, elapsedMs: 5 * MINUTE })).toBe(true);
  });
});
