import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOLD_DELAY_MS, STEP_INTERVAL_MS, STEP_SIZE } from "./holdRate";
import { useSteadyHold } from "./useSteadyHold";
import type { PointerEvent } from "react";

const T0 = 1_700_000_000_000;

/**
 * jsdom has no PointerEvent and no setPointerCapture, and the hook only ever
 * touches these three things. The hook already guards the capture call, so a
 * stub that simply works keeps this test about the counting.
 */
const press = () =>
  ({
    preventDefault: () => {},
    pointerId: 1,
    currentTarget: { setPointerCapture: () => {} },
  }) as unknown as PointerEvent<HTMLElement>;

/** Total points sent so far — the number the life total would have moved by. */
const total = (onStep: { mock: { calls: unknown[][] } }) =>
  onStep.mock.calls.reduce((sum, [points]) => sum + (points as number), 0);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a tap", () => {
  it("is worth exactly one point", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => result.current.onPointerUp());

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("counts immediately on press, not on release", () => {
    // The number has to move under the thumb. Waiting for release would make
    // every tap feel late.
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));

    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("starts a fresh count on the next press", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    for (let i = 0; i < 3; i++) {
      act(() => result.current.onPointerDown(press()));
      act(() => result.current.onPointerUp());
    }

    expect(total(onStep)).toBe(3);
  });
});

describe("a hold", () => {
  it("jumps to ten the moment the delay passes", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS));

    // From 40 life this is the walk through 41 to 50, not to 51.
    expect(total(onStep)).toBe(STEP_SIZE);
  });

  it("adds another ten every second after that", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS));
    expect(total(onStep)).toBe(10);

    act(() => vi.advanceTimersByTime(STEP_INTERVAL_MS));
    expect(total(onStep)).toBe(20);

    act(() => vi.advanceTimersByTime(STEP_INTERVAL_MS));
    expect(total(onStep)).toBe(30);
  });

  it("only ever sends what is still owed, never the running total again", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS + STEP_INTERVAL_MS));

    // 1 on press, 9 to reach the first jump, then 10. A tick that re-sent the
    // whole total would show 1, 10, 20 here and triple the damage.
    expect(onStep.mock.calls.flat()).toEqual([1, 9, 10]);
  });

  it("never sends a zero-point step between jumps", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS + 3 * STEP_INTERVAL_MS));

    // The hold is re-checked ten times a second but only counts once a second.
    expect(onStep.mock.calls.every(([points]) => points > 0)).toBe(true);
    expect(onStep).toHaveBeenCalledTimes(5);
  });
});

describe("releasing", () => {
  it("pays out what a late tick never delivered", () => {
    // A backgrounded tab throttles intervals to about a second. Advancing the
    // clock without running timers is exactly that: the hold really lasted
    // three seconds, but no tick arrived to count it.
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    vi.setSystemTime(T0 + 3_000);
    act(() => result.current.onPointerUp());

    expect(total(onStep)).toBe(30);
  });

  it("stops counting once the thumb is up", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS));
    act(() => result.current.onPointerUp());
    const settled = total(onStep);

    act(() => vi.advanceTimersByTime(10 * STEP_INTERVAL_MS));

    expect(total(onStep)).toBe(settled);
  });

  it("counts a cancelled or captured-away press the same as a normal one", () => {
    // A thumb sliding off the button, a phone call arriving, the browser
    // taking the pointer back: all of them must settle up, not drop the hold.
    for (const end of ["onPointerCancel", "onLostPointerCapture"] as const) {
      const onStep = vi.fn();
      const { result } = renderHook(() => useSteadyHold(onStep));

      act(() => result.current.onPointerDown(press()));
      act(() => vi.advanceTimersByTime(HOLD_DELAY_MS));
      act(() => result.current[end]());

      expect(total(onStep)).toBe(10);

      act(() => vi.advanceTimersByTime(5 * STEP_INTERVAL_MS));
      expect(total(onStep)).toBe(10);
    }
  });

  it("does nothing at all when there was no press", () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerUp());
    act(() => result.current.onPointerUp());

    expect(onStep).not.toHaveBeenCalled();
  });
});

describe("lifecycle", () => {
  it("stops counting when the panel unmounts mid-hold", () => {
    // A player removed from the game while their button is held must not keep
    // dispatching into a state that no longer has them.
    const onStep = vi.fn();
    const { result, unmount } = renderHook(() => useSteadyHold(onStep));

    act(() => result.current.onPointerDown(press()));
    unmount();
    act(() => vi.advanceTimersByTime(10 * STEP_INTERVAL_MS));

    expect(total(onStep)).toBe(1);
  });

  it("always counts into the newest callback", () => {
    // The callback closes over the current player and dispatch. A hold that
    // outlived a re-render used to keep paying into the stale one.
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onStep }) => useSteadyHold(onStep),
      { initialProps: { onStep: first } },
    );

    act(() => result.current.onPointerDown(press()));
    rerender({ onStep: second });
    act(() => vi.advanceTimersByTime(HOLD_DELAY_MS));

    expect(total(first)).toBe(1);
    expect(total(second)).toBe(9);
  });

  it("prevents the default on press and on the context menu", () => {
    // Without these a long press on a phone selects text or opens the callout
    // menu, and the hold is interrupted by the OS.
    const { result } = renderHook(() => useSteadyHold(vi.fn()));

    const down = { ...press(), preventDefault: vi.fn() };
    act(() =>
      result.current.onPointerDown(down as unknown as PointerEvent<HTMLElement>),
    );
    expect(down.preventDefault).toHaveBeenCalled();

    const menu = { preventDefault: vi.fn() };
    result.current.onContextMenu(menu);
    expect(menu.preventDefault).toHaveBeenCalled();
  });
});
