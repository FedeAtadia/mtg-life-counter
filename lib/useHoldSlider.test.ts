import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FREE_NOTCHES, NOTCH_PX } from "./holdSlider";
import { upVectorFor } from "./seatLayout";
import { useHoldSlider } from "./useHoldSlider";
import type { Rotation } from "./seatLayout";
import type { PointerEvent } from "react";

const T0 = 1_700_000_000_000;

const ROTATIONS: Rotation[] = [0, 90, 180, -90];

/**
 * jsdom has no `setPointerCapture`, and the hook only ever touches these few
 * things on an event. The hook already guards the capture call, so a stub that
 * simply works keeps this test about the counting.
 */
const pointerAt = (x: number, y: number) =>
  ({
    preventDefault: () => {},
    pointerId: 1,
    clientX: x,
    clientY: y,
    currentTarget: { setPointerCapture: () => {} },
  }) as unknown as PointerEvent<HTMLElement>;

/** Total points sent so far — the number the life total would have moved by. */
const total = (onStep: { mock: { calls: unknown[][] } }) =>
  onStep.mock.calls.reduce((sum, [points]) => sum + (points as number), 0);

/** Travel worth this many paying notches, the free one included. */
const travelFor = (payingNotches: number) =>
  payingNotches === 0
    ? 0
    : Math.sign(payingNotches) *
      (Math.abs(payingNotches) + FREE_NOTCHES) *
      NOTCH_PX;

/**
 * A screen offset that reads as this far away from the player at this seat.
 * Taken from the seat own up vector so no test has to hard-code which way a
 * rotation points.
 */
const awayBy = (rotation: Rotation, px: number) => {
  const [ux, uy] = upVectorFor(rotation);
  return { x: px * ux, y: px * uy };
};

/** A hook under test, with the shorthand for driving it. */
function slider(
  onStep: (points: number) => void,
  rotation: Rotation = 0,
  limit?: number,
) {
  const rendered = renderHook(() => useHoldSlider(rotation, onStep, limit));
  const { result } = rendered;
  const moveTo = (px: number) => {
    const { x, y } = awayBy(rotation, px);
    act(() => result.current.handlers.onPointerMove(pointerAt(x, y)));
  };
  return {
    ...rendered,
    armed: () => result.current.armed,
    down: (x = 0, y = 0) =>
      act(() => result.current.handlers.onPointerDown(pointerAt(x, y))),
    /** Moves to a raw pixel distance away from the player. */
    driftTo: moveTo,
    /** Moves to wherever this many paying notches lives. */
    slideTo: (payingNotches: number) => moveTo(travelFor(payingNotches)),
    across: (px: number) => {
      // Straight across the axis this seat counts along, which pays nothing.
      const [ux, uy] = upVectorFor(rotation);
      act(() =>
        result.current.handlers.onPointerMove(pointerAt(px * -uy, px * ux)),
      );
    },
    endWith: (end: "onPointerUp" | "onPointerCancel" | "onLostPointerCapture") =>
      act(() => result.current.handlers[end]()),
    up: () => act(() => result.current.handlers.onPointerUp()),
    wait: (ms: number) => act(() => vi.advanceTimersByTime(ms)),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a tap (HOLD-1)", () => {
  it("counts nothing while the finger is still down", () => {
    // Until the finger lifts there is no telling a tap from the beginning of a
    // slide, so nothing can be paid out yet.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();

    expect(onStep).not.toHaveBeenCalled();
  });

  it("is worth exactly one point, paid when the finger lifts", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.up();

    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(1);
  });

  it("starts a fresh count on the next press", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    for (let i = 0; i < 3; i++) {
      s.down();
      s.up();
    }

    expect(total(onStep)).toBe(3);
  });
});

describe("nothing here is timed (HOLD-2)", () => {
  it("is still a tap however long the finger stays down", () => {
    // The old rule armed a slider after a second and then counted on its own.
    // A press that goes nowhere is now a tap and nothing else, and no amount
    // of waiting changes that.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.wait(10_000);

    expect(s.armed()).toBe(false);
    expect(onStep).not.toHaveBeenCalled();

    s.up();

    expect(total(onStep)).toBe(1);
  });

  it("schedules nothing at all while a press is held", () => {
    const s = slider(vi.fn());

    s.down();

    expect(vi.getTimerCount()).toBe(0);
  });

  it("slides on a quick flick, with no waiting first", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(3);

    expect(s.armed()).toBe(true);
    expect(total(onStep)).toBe(15);
  });
});

describe("the free notch (HOLD-8, HOLD-10)", () => {
  it("counts nothing for a press that wanders inside it", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    for (let px = 1; px < 2 * NOTCH_PX; px++) s.driftTo(px);

    expect(onStep).not.toHaveBeenCalled();
    expect(s.armed()).toBe(false);
  });

  it("still pays the tap when a drifting press is lifted", () => {
    // This is what the free notch is for. A thumb that rolls off the button on
    // its way up used to be a tap and has to stay one.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.driftTo(2 * NOTCH_PX - 1);
    s.up();

    expect(total(onStep)).toBe(1);
  });

  it("hands the press over to the slide the moment it is spent", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.driftTo(2 * NOTCH_PX);

    expect(s.armed()).toBe(true);
    expect(total(onStep)).toBe(5);
  });

  it("takes the tap away once the slide has it", () => {
    // A press cannot be worth both. Once the slide has paid, lifting settles
    // the slide and the tap is gone.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(2);
    s.up();

    expect(total(onStep)).toBe(10);
  });
});

describe("sliding (HOLD-8)", () => {
  it("is worth five for every notch past the free one", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();

    s.slideTo(1);
    expect(total(onStep)).toBe(5);

    s.slideTo(2);
    expect(total(onStep)).toBe(10);

    s.slideTo(6);
    expect(total(onStep)).toBe(30);
  });

  it("sends only what is still owed, never the running total again", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(1);
    s.slideTo(2);
    s.slideTo(3);

    // A move that re-sent the whole total would show 5, 10, 15 here and treble
    // the damage.
    expect(onStep.mock.calls.flat()).toEqual([5, 5, 5]);
  });

  it("never sends a zero-point step between notches", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    for (let px = 1; px <= 4 * NOTCH_PX; px++) s.driftTo(px);

    // The finger reports every pixel it crosses; only every thirty-second one
    // past the free notch is worth anything.
    expect(onStep.mock.calls.every(([points]) => points !== 0)).toBe(true);
    expect(onStep).toHaveBeenCalledTimes(3);
  });

  it("counts a slide either way along the axis the same (HOLD-9)", () => {
    // The half that was pressed already set the direction. Sliding back toward
    // the player must not be a dead direction under the finger.
    for (const notches of [3, -3]) {
      const onStep = vi.fn();
      const s = slider(onStep);

      s.down();
      s.slideTo(notches);

      expect(total(onStep)).toBe(15);
    }
  });
});

describe("calling a slide off (HOLD-11)", () => {
  it("gives the points back when the finger comes back", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(3);
    expect(total(onStep)).toBe(15);

    s.slideTo(1);

    expect(total(onStep)).toBe(5);
    expect(onStep).toHaveBeenLastCalledWith(-10);
  });

  it("leaves the total untouched when it comes all the way back", () => {
    // Sliding back to where the finger landed and lifting there is how you
    // change your mind, and it has to cost nothing at all — not even the tap
    // the press started out as.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(4);
    s.slideTo(0);
    s.up();

    expect(total(onStep)).toBe(0);
  });

  it("does not hand a cancelled slide back to the tap", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(4);
    s.driftTo(0);
    s.up();

    expect(onStep).not.toHaveBeenLastCalledWith(1);
    expect(total(onStep)).toBe(0);
  });
});

describe("a slide with a floor under it (HOLD-13)", () => {
  it("stops at the limit however far the finger goes", () => {
    const onStep = vi.fn();
    const s = slider(onStep, 0, 5);

    s.down();
    s.slideTo(6);

    expect(total(onStep)).toBe(5);
  });

  it("gives back only what it actually took", () => {
    // The bug this guards: a counter holding 5, slid three notches. Without the
    // cap the gesture believes it is owed 15, and coming back one notch pays
    // out the 10 it never took — as damage, on the half that removes it.
    const onStep = vi.fn();
    const s = slider(onStep, 0, 5);

    s.down();
    s.slideTo(3);
    s.slideTo(1);

    expect(total(onStep)).toBe(5);

    s.slideTo(0);
    expect(total(onStep)).toBe(0);
  });

  it("counts nothing but the tap when there is nothing to take", () => {
    // With a limit of zero the slide can never be worth anything, so the press
    // never stops being a tap.
    const onStep = vi.fn();
    const s = slider(onStep, 0, 0);

    s.down();
    s.slideTo(4);
    s.slideTo(1);

    expect(onStep).not.toHaveBeenCalled();
    expect(s.armed()).toBe(false);

    s.up();
    expect(total(onStep)).toBe(1);
  });

  it("reads the limit as it stood when the finger landed", () => {
    // It falls as the slide spends it. A limit read live would shrink to zero
    // under the gesture and then refund everything it had just taken.
    const onStep = vi.fn();
    let limit = 20;
    const rendered = renderHook(() => useHoldSlider(0, onStep, limit));

    act(() => rendered.result.current.handlers.onPointerDown(pointerAt(0, 0)));

    limit = 0;
    rendered.rerender();

    act(() =>
      rendered.result.current.handlers.onPointerMove(
        pointerAt(0, -travelFor(3)),
      ),
    );

    expect(total(onStep)).toBe(15);
  });
});

describe("which way is up (HOLD-10)", () => {
  it("measures from where the finger landed", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down(400, 400);
    act(() =>
      s.result.current.handlers.onPointerMove(
        pointerAt(400, 400 - travelFor(2)),
      ),
    );

    expect(total(onStep)).toBe(10);
  });

  it("discards drift across the axis", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.across(400);

    expect(onStep).not.toHaveBeenCalled();
    expect(s.armed()).toBe(false);
  });

  it("turns the slide with the seat", () => {
    // A player on the far edge reads up as down the screen. Sliding away from
    // yourself has to be worth the same wherever you are sitting.
    for (const rotation of ROTATIONS) {
      const onStep = vi.fn();
      const s = slider(onStep, rotation);

      s.down();
      s.slideTo(2);

      expect(total(onStep)).toBe(10);
    }
  });
});

describe("releasing (HOLD-4)", () => {
  it("stops counting once the finger is up", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.slideTo(2);
    s.up();
    const settled = total(onStep);

    s.slideTo(8);

    expect(total(onStep)).toBe(settled);
  });

  it("settles a cancelled or captured-away press the same as a normal one", () => {
    // A thumb sliding off the button, a phone call arriving, the browser taking
    // the pointer back: all of them settle, none of them drop the slide.
    for (const end of ["onPointerCancel", "onLostPointerCapture"] as const) {
      const onStep = vi.fn();
      const s = slider(onStep);

      s.down();
      s.slideTo(3);
      s.endWith(end);

      expect(total(onStep)).toBe(15);

      s.slideTo(8);
      expect(total(onStep)).toBe(15);
      s.unmount();
    }
  });

  it("pays the tap for a press cancelled before it slid", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.endWith("onPointerCancel");

    expect(total(onStep)).toBe(1);
  });

  it("does nothing at all when there was no press", () => {
    const onStep = vi.fn();
    const s = slider(onStep);

    s.up();
    s.up();
    s.slideTo(4);

    expect(onStep).not.toHaveBeenCalled();
  });
});

describe("lifecycle", () => {
  it("stops counting when the panel unmounts mid-press (HOLD-6)", () => {
    // A player removed from the game while their button is held must not keep
    // dispatching into a state that no longer has them.
    const onStep = vi.fn();
    const s = slider(onStep);

    s.down();
    s.unmount();
    act(() => vi.advanceTimersByTime(10_000));

    expect(onStep).not.toHaveBeenCalled();
  });

  it("always counts into the newest callback (HOLD-7)", () => {
    // The callback closes over the current player and dispatch. A press that
    // outlived a re-render used to keep paying into the stale one.
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(
      ({ onStep }) => useHoldSlider(0, onStep),
      { initialProps: { onStep: first } },
    );

    act(() => result.current.handlers.onPointerDown(pointerAt(0, 0)));
    rerender({ onStep: second });
    act(() =>
      result.current.handlers.onPointerMove(pointerAt(0, -travelFor(1))),
    );

    expect(first).not.toHaveBeenCalled();
    expect(total(second)).toBe(5);
  });

  it("prevents the default on press and on the context menu", () => {
    // Without these a long press on a phone selects text or opens the callout
    // menu, and the gesture is interrupted by the OS.
    const { result } = renderHook(() => useHoldSlider(0, vi.fn()));

    const down = { ...pointerAt(0, 0), preventDefault: vi.fn() };
    act(() =>
      result.current.handlers.onPointerDown(
        down as unknown as PointerEvent<HTMLElement>,
      ),
    );
    expect(down.preventDefault).toHaveBeenCalled();

    const menu = { preventDefault: vi.fn() };
    result.current.handlers.onContextMenu(menu);
    expect(menu.preventDefault).toHaveBeenCalled();
  });
});
