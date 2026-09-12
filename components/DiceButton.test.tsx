import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DICE } from "@/lib/dice";
import { createGame } from "@/lib/gameReducer";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/rules";
import { startedTimerAt } from "@/lib/timer";
import { LONG_PRESS_MS } from "@/lib/useLongPress";
import {
  diceButton,
  dicePicker,
  hub,
  lifeOn,
  panelFor,
  pickerOption,
  renderBoard,
  throwResult,
} from "../test/harness";

const T0 = 1_700_000_000_000;

const counts = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
);

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  Reflect.deleteProperty(document, "elementFromPoint");
});

/**
 * Pins every draw to one value. A constant rather than a sequence, so a test
 * never depends on how many times the code happens to draw.
 */
const drawAlways = (value: number) =>
  vi.spyOn(Math, "random").mockReturnValue(value);

/**
 * Says what the browser would find under the finger. jsdom lays nothing out,
 * so it has no `elementFromPoint` of its own; standing one in is what lets the
 * slide-onto-an-option path be tested here rather than only on a phone.
 */
function fingerOver(element: Element | null) {
  Object.defineProperty(document, "elementFromPoint", {
    value: () => element,
    configurable: true,
    writable: true,
  });
}

/** A press on the dice button, held until the picker comes up under it. */
function holdDice() {
  fireEvent.pointerDown(diceButton(), { clientX: 0, clientY: 0 });
  act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
}

/** The finger, still down, sliding to a point and lifting there. */
function slideAndLift() {
  fireEvent.pointerMove(diceButton(), { clientX: 10, clientY: -150 });
  fireEvent.pointerUp(diceButton(), { clientX: 10, clientY: -150 });
  // What a browser sends after the lift. It must not count as a tap.
  fireEvent.click(diceButton());
}

describe("the dice button (ROLL-1)", () => {
  it.each(counts)("is in the hub's row at %i players", (count) => {
    renderBoard(createGame("commander", count));

    expect(diceButton()).toBeInTheDocument();
  });

  it("stays there once the game is under way", () => {
    renderBoard(createGame("commander", 4, startedTimerAt(T0)));

    expect(diceButton()).toBeInTheDocument();
  });

  it("sits on the clock's far side from Start, leaving the clock centred", () => {
    // TIMER-9: nothing the row holds moves the clock out of its column.
    renderBoard();
    const row = hub().parentElement as HTMLElement;

    expect(row.children[1]).toBe(hub());
    expect(row.children[2]).toContainElement(diceButton());
  });

  it("offers the six dice and a coin", () => {
    renderBoard();
    fireEvent.click(diceButton());

    const names = within(dicePicker()!)
      .getAllByRole("button")
      .map((b) => b.getAttribute("aria-label") ?? b.textContent);
    for (const name of ["d4", "d6", "d8", "d10", "d12", "d20", "Coin"]) {
      expect(names).toContain(name);
    }
  });
});

describe("what the options are drawn as (ROLL-9)", () => {
  /** Every option in the open picker, by kind. */
  const options = () =>
    Object.fromEntries(
      [...dicePicker()!.querySelectorAll("[data-throw]")].map((option) => [
        (option as HTMLElement).dataset.throw,
        option as HTMLElement,
      ]),
    );

  it("draws a die as a shape carrying its number, not as a word", () => {
    renderBoard();
    fireEvent.click(diceButton());
    const option = options().d20;

    expect(option.querySelector("svg")).toBeInTheDocument();
    // The number, and nothing but the number: "d20" spelled out is what this
    // replaces.
    expect(option).toHaveTextContent("20");
    expect(option.textContent).not.toContain("d");
  });

  it("gives every die the number of sides its name promises", () => {
    // A d8, d10 and d12 are nearly the same outline, so the number is the
    // thing doing the telling apart. A shape labelled wrongly is worse than
    // no shape.
    renderBoard();
    fireEvent.click(diceButton());
    const drawn = options();

    for (const [kind, sides] of Object.entries(DICE)) {
      expect(drawn[kind]).toHaveTextContent(String(sides));
      expect(drawn[kind].querySelector("svg")).toBeInTheDocument();
    }
  });

  it("keeps the coin a coin, with no number to show", () => {
    renderBoard();
    fireEvent.click(diceButton());
    const coin = options().coin;

    expect(coin.querySelector("svg")).toBeInTheDocument();
    expect(coin).toHaveTextContent("Coin");
  });

  it("still answers to its name, for anything that cannot see a shape", () => {
    // A screen reader, and every test in this file, find these by name. The
    // shapes are drawn over a label that never left.
    renderBoard();
    fireEvent.click(diceButton());

    for (const name of ["d4", "d6", "d8", "d10", "d12", "d20", "Coin"]) {
      expect(pickerOption(name)).toBeInTheDocument();
    }
  });

  it("hides the artwork from a screen reader, so it is read once", () => {
    renderBoard();
    fireEvent.click(diceButton());
    const option = options().d12;

    // The button's own name says "d12"; the shape and the 12 inside it would
    // otherwise be read out again after it.
    expect(option.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(option.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});

describe("tapping (ROLL-2)", () => {
  it("opens the picker and throws nothing yet", () => {
    renderBoard();

    fireEvent.click(diceButton());

    expect(dicePicker()).toBeInTheDocument();
    expect(throwResult()).not.toBeInTheDocument();
  });

  it("throws the die that is picked, and puts the picker away", () => {
    drawAlways(0.5);
    renderBoard();

    fireEvent.click(diceButton());
    fireEvent.click(pickerOption("d20"));

    expect(dicePicker()).not.toBeInTheDocument();
    // Half-way through a d20's range is the start of its eleventh face.
    expect(throwResult()).toHaveAccessibleName("Thrown — d20: 11");
  });

  it("flips the coin", () => {
    drawAlways(0.2);
    renderBoard();

    fireEvent.click(diceButton());
    fireEvent.click(pickerOption("Coin"));

    expect(throwResult()).toHaveAccessibleName("Thrown — Coin: heads");
  });

  it("puts the picker away on a press outside it, throwing nothing", () => {
    renderBoard();

    fireEvent.click(diceButton());
    fireEvent.click(screen.getByLabelText("Close the dice"));

    expect(dicePicker()).not.toBeInTheDocument();
    expect(throwResult()).not.toBeInTheDocument();
  });
});

describe("holding (ROLL-2)", () => {
  it("opens the picker while the finger is still down", () => {
    renderBoard();

    holdDice();

    expect(dicePicker()).toBeInTheDocument();
  });

  it("lights the option under the finger as it slides", () => {
    renderBoard();
    holdDice();

    fingerOver(pickerOption("d12"));
    fireEvent.pointerMove(diceButton(), { clientX: 10, clientY: -150 });

    expect(pickerOption("d12")).toHaveAttribute("data-armed", "true");
    expect(pickerOption("d6")).toHaveAttribute("data-armed", "false");
  });

  it("finds the option when the finger is on its label rather than its edge", () => {
    // What is under a finger is usually the text inside an option, not the
    // option itself.
    renderBoard();
    holdDice();

    fingerOver(pickerOption("d8").firstElementChild);
    fireEvent.pointerMove(diceButton(), { clientX: 10, clientY: -150 });

    expect(pickerOption("d8")).toHaveAttribute("data-armed", "true");
  });

  it("throws the option the finger lifts on, in one gesture", () => {
    drawAlways(0);
    renderBoard();
    holdDice();

    fingerOver(pickerOption("d6"));
    slideAndLift();

    expect(dicePicker()).not.toBeInTheDocument();
    expect(throwResult()).toHaveAccessibleName("Thrown — d6: 1");
  });
});

describe("lifting on nothing (ROLL-3)", () => {
  it("leaves the picker open when the finger lifts outside it", () => {
    renderBoard();
    holdDice();

    fingerOver(screen.getByLabelText("Close the dice"));
    slideAndLift();

    expect(dicePicker()).toBeInTheDocument();
    expect(throwResult()).not.toBeInTheDocument();
  });

  it("leaves it open when the finger lifts in the gap between options", () => {
    renderBoard();
    holdDice();

    fingerOver(dicePicker());
    slideAndLift();

    expect(dicePicker()).toBeInTheDocument();
    expect(throwResult()).not.toBeInTheDocument();
  });

  it("leaves it open when the browser cannot say what is under the finger", () => {
    // No elementFromPoint at all, which is jsdom — and nothing is thrown
    // rather than something being guessed at.
    renderBoard();
    holdDice();

    slideAndLift();

    expect(dicePicker()).toBeInTheDocument();
  });

  it("then works as if it had been tapped open", () => {
    drawAlways(0);
    renderBoard();
    holdDice();
    fingerOver(null);
    slideAndLift();

    fireEvent.click(pickerOption("d4"));

    expect(throwResult()).toHaveAccessibleName("Thrown — d4: 1");
  });
});

describe("the result (ROLL-5, ROLL-6)", () => {
  function throwD20() {
    drawAlways(0.5);
    fireEvent.click(diceButton());
    fireEvent.click(pickerOption("d20"));
  }

  it("stays up until it is pressed away, however long that is", () => {
    renderBoard();
    throwD20();

    act(() => vi.advanceTimersByTime(10 * 60_000));
    expect(throwResult()).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Dismiss the throw"));
    expect(throwResult()).not.toBeInTheDocument();
  });

  it("names the die it came off", () => {
    renderBoard();
    throwD20();

    expect(within(throwResult()!).getAllByText("d20").length).toBeGreaterThan(0);
  });

  it("shows the face twice, once turned for the far edge", () => {
    renderBoard();
    throwD20();

    const faces = within(throwResult()!).getAllByText("11");
    expect(faces).toHaveLength(2);
    const turns = faces.map(
      (face) =>
        (face.closest("[data-throw-face]") as HTMLElement).style.transform,
    );
    expect(turns).toContain("rotate(180deg)");
    expect(turns).toContain("rotate(0deg)");
  });
});

describe("a throw is not the game (ROLL-7, ROLL-8)", () => {
  it("changes nothing on the board and nothing that is saved", () => {
    renderBoard(createGame("commander", 2));
    act(() => vi.advanceTimersByTime(1000));
    const saved = window.localStorage.getItem("mtg-life-counter:v1");

    fireEvent.click(diceButton());
    fireEvent.click(pickerOption("d20"));
    act(() => vi.advanceTimersByTime(1000));

    expect(lifeOn(panelFor("Player 1"))).toBe(40);
    expect(window.localStorage.getItem("mtg-life-counter:v1")).toBe(saved);
  });

  it("draws nothing random until an option is chosen", () => {
    // Rendering the board, the button and the picker must all be free of it:
    // a number drawn while rendering is drawn twice, once by the static export
    // and once in the browser, and the two disagree (PLAT-3).
    const random = drawAlways(0.5);
    renderBoard();
    fireEvent.click(diceButton());
    act(() => vi.advanceTimersByTime(1000));
    expect(random).not.toHaveBeenCalled();

    fireEvent.click(pickerOption("d10"));

    expect(random).toHaveBeenCalled();
  });
});
