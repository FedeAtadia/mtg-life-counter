import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useElapsed } from "./useElapsed";
import type { TimerState } from "./types";

const T0 = 1_700_000_000_000;
const SECOND = 1_000;
const HOUR = 60 * 60 * SECOND;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Renders the hook and counts how often it produced a value. */
function track(timer: TimerState) {
  let renders = 0;
  const view = renderHook(() => {
    renders++;
    return useElapsed(timer);
  });
  return { view, renderCount: () => renders };
}

describe("a running clock", () => {
  it("starts at the time already on it", () => {
    const { view } = track({ startedAt: T0 - 30 * SECOND, elapsedMs: 0 });
    expect(view.result.current).toBe(30 * SECOND);
  });

  it("counts the running segment on top of banked time", () => {
    const { view } = track({ startedAt: T0, elapsedMs: 90 * SECOND });

    act(() => vi.advanceTimersByTime(2 * SECOND));

    expect(view.result.current).toBe(92 * SECOND);
  });

  it("repaints once a second while the seconds are showing", () => {
    const { view, renderCount } = track({ startedAt: T0, elapsedMs: 0 });
    const before = renderCount();

    // One second per act, because React batches everything inside a single one
    // — five ticks in one block would repaint once and prove nothing.
    for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(SECOND));

    expect(view.result.current).toBe(5 * SECOND);
    expect(renderCount() - before).toBe(5);
  });
});

describe("a paused clock", () => {
  const paused: TimerState = { startedAt: null, elapsedMs: 7 * SECOND };

  it("shows the banked total", () => {
    const { view } = track(paused);
    expect(view.result.current).toBe(7 * SECOND);
  });

  it("holds still and schedules nothing", () => {
    // A paused readout that still repainted every second would keep the whole
    // settings sheet re-rendering for no reason.
    const { view, renderCount } = track(paused);
    const before = renderCount();

    expect(vi.getTimerCount()).toBe(0);

    act(() => vi.advanceTimersByTime(30 * SECOND));

    expect(view.result.current).toBe(7 * SECOND);
    expect(renderCount()).toBe(before);
  });
});

describe("past an hour", () => {
  it("stops repainting every second once the seconds are hidden", () => {
    // The readout switches to hours and minutes at an hour, so there is
    // nothing to show until the minute rolls over.
    const { view, renderCount } = track({ startedAt: T0 - HOUR, elapsedMs: 0 });
    const before = renderCount();

    act(() => vi.advanceTimersByTime(SECOND));
    expect(renderCount()).toBe(before);

    act(() => vi.advanceTimersByTime(14 * SECOND));
    expect(renderCount()).toBeGreaterThan(before);
    expect(view.result.current).toBe(HOUR + 15 * SECOND);
  });

  it("still repaints every second just below the hour", () => {
    const { renderCount } = track({
      startedAt: T0 - (HOUR - 10 * SECOND),
      elapsedMs: 0,
    });
    const before = renderCount();

    act(() => vi.advanceTimersByTime(SECOND));

    expect(renderCount()).toBeGreaterThan(before);
  });
});

describe("lifecycle", () => {
  it("leaves no interval behind when the readout goes away", () => {
    // The settings sheet unmounts every time it is closed.
    const { view } = track({ startedAt: T0, elapsedMs: 0 });
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("stops ticking when the clock is paused", () => {
    const { rerender } = renderHook(
      ({ timer }: { timer: TimerState }) => useElapsed(timer),
      {
        initialProps: {
          timer: { startedAt: T0, elapsedMs: 0 } as TimerState,
        },
      },
    );
    expect(vi.getTimerCount()).toBe(1);

    rerender({ timer: { startedAt: null, elapsedMs: 3 * SECOND } });

    expect(vi.getTimerCount()).toBe(0);
  });
});
