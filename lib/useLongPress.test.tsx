import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LONG_PRESS_MS, useLongPress } from "./useLongPress";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/** Everything the hook can report, as spies. */
function callbacks() {
  return {
    onTap: vi.fn(),
    onLongPress: vi.fn(),
    onDrag: vi.fn(),
    onRelease: vi.fn(),
  };
}

type Callbacks = ReturnType<typeof callbacks>;

/**
 * A plain button wearing the hook. Driven through the DOM rather than
 * renderHook because the whole question is which events land where, and in
 * what order — a browser sends a click after the pointer lifts, and that click
 * is the part that has to be told apart.
 */
function Pressable({ on }: { on: Callbacks }) {
  const { handlers } = useLongPress(on);
  return (
    <button type="button" {...handlers}>
      Throw
    </button>
  );
}

function mount() {
  const on = callbacks();
  const view = render(<Pressable on={on} />);
  return { on, button: screen.getByRole("button"), ...view };
}

/** What a browser sends for a finger that lands and lifts, click included. */
function lift(button: HTMLElement, x = 0, y = 0) {
  fireEvent.pointerUp(button, { clientX: x, clientY: y });
  fireEvent.click(button);
}

describe("a tap (ROLL-2)", () => {
  it("is a press that lifts before the wait is up", () => {
    const { on, button } = mount();

    fireEvent.pointerDown(button, { clientX: 5, clientY: 5 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS - 1));
    lift(button);

    expect(on.onTap).toHaveBeenCalledTimes(1);
    expect(on.onLongPress).not.toHaveBeenCalled();
    expect(on.onRelease).not.toHaveBeenCalled();
  });

  it("is also a click with no pointer at all, from a keyboard or a screen reader", () => {
    const { on, button } = mount();

    fireEvent.click(button);

    expect(on.onTap).toHaveBeenCalledTimes(1);
  });

  it("does not wait for the timer to settle before counting", () => {
    // A tap is decided when the finger lifts, not LONG_PRESS_MS later.
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    lift(button);

    expect(on.onTap).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 3));
    expect(on.onLongPress).not.toHaveBeenCalled();
  });
});

describe("a long press (ROLL-2)", () => {
  it("fires once the wait is up, with the finger still down", () => {
    // Firing on the lift would be too late: the picker has to be up and under
    // the finger while it can still slide onto an option.
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));

    expect(on.onLongPress).toHaveBeenCalledTimes(1);
    expect(on.onTap).not.toHaveBeenCalled();
  });

  it("reports where the finger goes once it has fired, and not before", () => {
    const { on, button } = mount();

    fireEvent.pointerDown(button, { clientX: 0, clientY: 0 });
    fireEvent.pointerMove(button, { clientX: 3, clientY: 4 });
    expect(on.onDrag).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerMove(button, { clientX: 40, clientY: -120 });

    expect(on.onDrag).toHaveBeenCalledWith({ x: 40, y: -120 });
  });

  it("ends in a release where the finger lifts, and never in a tap as well", () => {
    // The browser still sends a click after the lift. Counting it would open
    // the picker a second time on top of whatever the release just did.
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    lift(button, 60, -90);

    expect(on.onRelease).toHaveBeenCalledWith({ x: 60, y: -90 });
    expect(on.onRelease).toHaveBeenCalledTimes(1);
    expect(on.onTap).not.toHaveBeenCalled();
  });

  it("releases with nowhere in particular when the browser takes the pointer", () => {
    // A cancelled pointer has no honest position to report, so none is
    // invented — the picker stays open rather than guessing (ROLL-3).
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerCancel(button, { clientX: 60, clientY: -90 });

    expect(on.onRelease).toHaveBeenCalledWith(null);
  });

  it("releases only once, whichever of the ending events arrive", () => {
    // A lift is followed by lostpointercapture. One gesture, one release.
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerUp(button, { clientX: 1, clientY: 2 });
    fireEvent.lostPointerCapture(button);
    fireEvent.pointerCancel(button);

    expect(on.onRelease).toHaveBeenCalledTimes(1);
  });

  it("does not swallow the next real tap when no click followed it", () => {
    // Some phones send no click after a long touch at all. The flag that
    // swallows the long press's click must not be left waiting to swallow the
    // next honest tap instead.
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerUp(button);
    act(() => vi.advanceTimersByTime(0));

    fireEvent.click(button);

    expect(on.onTap).toHaveBeenCalledTimes(1);
  });
});

describe("a press that goes nowhere", () => {
  it("does nothing when the browser takes the pointer before the wait is up", () => {
    const { on, button } = mount();

    fireEvent.pointerDown(button);
    fireEvent.pointerCancel(button);
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 3));

    expect(on.onTap).not.toHaveBeenCalled();
    expect(on.onLongPress).not.toHaveBeenCalled();
    expect(on.onRelease).not.toHaveBeenCalled();
  });

  it("does not fire after the button has gone", () => {
    const { on, button, unmount } = mount();

    fireEvent.pointerDown(button);
    unmount();
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 3));

    expect(on.onLongPress).not.toHaveBeenCalled();
  });

  it("keeps the phone's own long-press menu out of it", () => {
    const { button } = mount();

    const menu = fireEvent.contextMenu(button);

    // fireEvent returns false when the event's default was prevented.
    expect(menu).toBe(false);
  });
});

describe("a hold that outlives its element's grip on the pointer (ROSTER-9)", () => {
  /**
   * Somewhere on the page that is not the button. Once a real browser takes
   * capture away, moves target whatever is under the finger, not the button.
   */
  const elsewhere = () => document.body;

  /** A press held until the long press has fired. */
  function hold(button: HTMLElement, pointerId = 1) {
    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
  }

  it("keeps going when the browser takes the pointer's capture away", () => {
    // A seat row dragged downwards is moved in the DOM to reorder it, and a
    // browser takes capture from an element that moves. Ending the gesture
    // there is what stopped every downward drag after one seat.
    const { on, button } = mount();
    hold(button);

    fireEvent.lostPointerCapture(button, { pointerId: 1 });
    expect(on.onRelease).not.toHaveBeenCalled();

    fireEvent.pointerMove(elsewhere(), { clientX: 5, clientY: 80, pointerId: 1 });
    expect(on.onDrag).toHaveBeenCalledWith({ x: 5, y: 80 });
  });

  it("still ends a press that loses capture before the hold has taken", () => {
    const { on, button } = mount();

    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.lostPointerCapture(button, { pointerId: 1 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS * 3));

    expect(on.onLongPress).not.toHaveBeenCalled();
  });

  it("follows the finger anywhere on the page once held, and not before", () => {
    const { on, button } = mount();

    fireEvent.pointerDown(button, { clientX: 0, clientY: 0, pointerId: 1 });
    fireEvent.pointerMove(elsewhere(), { clientX: 3, clientY: 4, pointerId: 1 });
    expect(on.onDrag).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerMove(elsewhere(), { clientX: 30, clientY: 40, pointerId: 1 });

    expect(on.onDrag).toHaveBeenCalledTimes(1);
    expect(on.onDrag).toHaveBeenCalledWith({ x: 30, y: 40 });
  });

  it("reports a move over the button itself once, not twice", () => {
    // The button's own handler and the page-wide one both see an event that
    // lands on the button. Only one of them may answer it.
    const { on, button } = mount();
    hold(button);

    fireEvent.pointerMove(button, { clientX: 9, clientY: 9, pointerId: 1 });

    expect(on.onDrag).toHaveBeenCalledTimes(1);
  });

  it("releases on a lift anywhere on the page, once", () => {
    const { on, button } = mount();
    hold(button);
    fireEvent.lostPointerCapture(button, { pointerId: 1 });

    fireEvent.pointerUp(elsewhere(), { clientX: 7, clientY: 9, pointerId: 1 });
    fireEvent.pointerUp(elsewhere(), { clientX: 7, clientY: 9, pointerId: 1 });

    expect(on.onRelease).toHaveBeenCalledTimes(1);
    expect(on.onRelease).toHaveBeenCalledWith({ x: 7, y: 9 });
  });

  it("ignores another finger", () => {
    const { on, button } = mount();
    hold(button, 1);

    fireEvent.pointerMove(elsewhere(), { clientX: 1, clientY: 1, pointerId: 2 });
    fireEvent.pointerUp(elsewhere(), { clientX: 1, clientY: 1, pointerId: 2 });

    expect(on.onDrag).not.toHaveBeenCalled();
    expect(on.onRelease).not.toHaveBeenCalled();
  });

  it("stops listening once the press is over", () => {
    const { on, button } = mount();
    hold(button);
    fireEvent.pointerUp(elsewhere(), { clientX: 0, clientY: 0, pointerId: 1 });

    fireEvent.pointerMove(elsewhere(), { clientX: 2, clientY: 2, pointerId: 1 });

    expect(on.onDrag).not.toHaveBeenCalled();
  });

  it("stops listening when the button goes mid-hold", () => {
    const { on, button, unmount } = mount();
    hold(button);
    unmount();

    fireEvent.pointerMove(elsewhere(), { clientX: 2, clientY: 2, pointerId: 1 });
    fireEvent.pointerUp(elsewhere(), { clientX: 2, clientY: 2, pointerId: 1 });

    expect(on.onDrag).not.toHaveBeenCalled();
    expect(on.onRelease).not.toHaveBeenCalled();
  });
});
