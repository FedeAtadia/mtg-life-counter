import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "@/lib/gameReducer";
import { NOTCH_POINTS } from "@/lib/holdSlider";
import { LETHAL_COMMANDER_DAMAGE } from "@/lib/rules";
import type { Action, GameState } from "@/lib/types";
import {
  ARM_DELAY_MS,
  deltaChipOn,
  hintOn,
  holdStill,
  isArmed,
  lifeOn,
  minusZone,
  panelFor,
  plusZone,
  pressAndArm,
  renderBoard,
  rotationOf,
  slide,
  tap,
  tapTimes,
} from "../test/harness";

const T0 = 1_700_000_000_000;

const build = (base: GameState, ...actions: Action[]): GameState =>
  actions.reduce(gameReducer, base);

const advance = (ms: number) => vi.advanceTimersByTime(ms);

/** The rotation of Player 1 seat on the four-player board these tests deal. */
const seatOne = () => rotationOf(4, 0);

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("what a seat shows", () => {
  it("gives every seat a numbered name and the starting life", () => {
    renderBoard();

    for (const name of ["Player 1", "Player 2", "Player 3", "Player 4"]) {
      expect(lifeOn(panelFor(name))).toBe(40);
    }
  });

  it("shows the name the player typed instead of the default", () => {
    renderBoard(
      build(createGame("commander", 2), {
        type: "RENAME_PLAYER",
        id: "p1",
        name: "Fede",
      }),
    );

    expect(screen.getByText("Fede")).toBeInTheDocument();
    expect(screen.queryByText("Player 1")).not.toBeInTheDocument();
  });

  it("shows one pip per colour, and a single pip for colourless", () => {
    renderBoard(
      build(
        createGame("commander", 2),
        { type: "SET_PLAYER_COLORS", id: "p1", colors: ["u", "r", "g"] },
        { type: "SET_PLAYER_COLORS", id: "p2", colors: [] },
      ),
    );

    // Counted in the DOM because the pips are aria-hidden: they are decoration,
    // and the identity is read out in words in the settings sheet instead.
    // Colourless is a real identity, so that seat still gets a pip rather than
    // an empty gap where the others have theirs.
    expect(panelFor("Player 1").querySelectorAll("svg")).toHaveLength(3);
    expect(panelFor("Player 2").querySelectorAll("svg")).toHaveLength(1);
  });
});

describe("counting life", () => {
  it("loses a life on the left and gains one on the right", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tap(minusZone(panel));
    expect(lifeOn(panel)).toBe(39);

    tap(plusZone(panel));
    expect(lifeOn(panel)).toBe(40);
  });

  it("only moves the seat that was tapped", () => {
    renderBoard();

    tapTimes(minusZone(panelFor("Player 2")), 3);

    expect(lifeOn(panelFor("Player 2"))).toBe(37);
    for (const name of ["Player 1", "Player 3", "Player 4"]) {
      expect(lifeOn(panelFor(name))).toBe(40);
    }
  });

  it("counts nothing for a press that is held and never slid (HOLD-2)", () => {
    // Holding is what arms the slider, not what counts. A press that goes
    // nowhere is not even worth the point a tap would have been.
    renderBoard();
    const panel = panelFor("Player 1");

    holdStill(minusZone(panel), advance);

    expect(lifeOn(panel)).toBe(40);
  });

  it("takes five a notch once the press has become a slider (HOLD-8)", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    slide(minusZone(panel), { notches: 3, rotation: seatOne(), advance });

    expect(lifeOn(panel)).toBe(40 - 3 * NOTCH_POINTS);
  });

  it("subtracts on the left half whichever way the finger goes (HOLD-9)", () => {
    // The half that was pressed is still the only thing setting the direction
    // (LIFE-1). A thumb that slides the other way must not start giving life
    // back to the player being burned.
    renderBoard();
    const panel = panelFor("Player 1");

    slide(minusZone(panel), { notches: -3, rotation: seatOne(), advance });

    expect(lifeOn(panel)).toBe(40 - 3 * NOTCH_POINTS);
  });

  it("gains on the right half whichever way the finger goes (HOLD-9)", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    slide(plusZone(panel), { notches: -2, rotation: seatOne(), advance });

    expect(lifeOn(panel)).toBe(40 + 2 * NOTCH_POINTS);
  });

  it("turns the slide to face the seat it was made in (SEAT-6)", () => {
    // Player 1 and Player 3 sit on opposite edges, so the same drag across the
    // glass runs opposite ways in their two frames. Both must lose 10.
    renderBoard();

    for (const [index, name] of [
      [0, "Player 1"],
      [2, "Player 3"],
    ] as const) {
      const panel = panelFor(name);
      slide(minusZone(panel), {
        notches: 2,
        rotation: rotationOf(4, index),
        advance,
      });
      expect(lifeOn(panel)).toBe(40 - 2 * NOTCH_POINTS);
    }
  });

  it("goes below zero and comes back", () => {
    // Life is never clamped: a player can be at −6 and be gained back up, which
    // is how a misclick gets corrected.
    renderBoard(createGame("standard", 2));
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 22);
    expect(lifeOn(panel)).toBe(-2);

    tapTimes(plusZone(panel), 5);
    expect(lifeOn(panel)).toBe(3);
  });
});

describe("the arming cue (HOLD-12)", () => {
  it("lights the hint on the side being pressed, once the slider arms", () => {
    // Nothing else on screen has moved yet, so this light is the only thing
    // telling a player their press has stopped being a tap.
    renderBoard();
    const panel = panelFor("Player 1");

    expect(isArmed(hintOn(panel, "minus"))).toBe(false);

    pressAndArm(minusZone(panel), advance);

    expect(isArmed(hintOn(panel, "minus"))).toBe(true);
    // The other side stays dark: the lit one is also saying which way it will go.
    expect(isArmed(hintOn(panel, "plus"))).toBe(false);
  });

  it("stays dark while the press is still short enough to be a tap", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    fireEvent.pointerDown(minusZone(panel), { clientX: 0, clientY: 0 });
    act(() => advance(ARM_DELAY_MS - 1));

    expect(isArmed(hintOn(panel, "minus"))).toBe(false);
  });

  it("puts the light out when the finger lifts", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    pressAndArm(minusZone(panel), advance);
    fireEvent.pointerUp(minusZone(panel));

    expect(isArmed(hintOn(panel, "minus"))).toBe(false);
  });

  it("leaves every other seat alone", () => {
    // The cue is per press, not per board: arming one seat must not light up
    // the panel of the player sitting opposite.
    renderBoard();

    pressAndArm(minusZone(panelFor("Player 1")), advance);

    expect(isArmed(hintOn(panelFor("Player 2"), "minus"))).toBe(false);
  });
});

describe("the running delta chip", () => {
  it("shows what the press has added up to so far", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 3);

    expect(deltaChipOn(panel)).toHaveTextContent("-3");
    expect(deltaChipOn(panel)).toBeVisible();
  });

  it("counts a slide notch by notch (LIFE-4)", () => {
    // What makes the slider usable is watching the number you are dialling in
    // arrive before you commit to it.
    renderBoard();
    const panel = panelFor("Player 1");

    slide(minusZone(panel), { notches: 4, rotation: seatOne(), advance });

    expect(deltaChipOn(panel)).toHaveTextContent("-20");
  });

  it("signs a gain so it cannot be read as a loss", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tapTimes(plusZone(panel), 2);

    expect(deltaChipOn(panel)).toHaveTextContent("+2");
  });

  it("nets out taps in both directions within one exchange", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 5);
    tapTimes(plusZone(panel), 2);

    expect(deltaChipOn(panel)).toHaveTextContent("-3");
    expect(lifeOn(panel)).toBe(37);
  });

  it("fades away once the exchange is over", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tap(minusZone(panel));
    expect(deltaChipOn(panel)).toHaveStyle({ opacity: "1" });

    act(() => vi.advanceTimersByTime(1_600));

    expect(deltaChipOn(panel)).toHaveStyle({ opacity: "0" });
    // The life total itself does not roll back — only the chip goes.
    expect(lifeOn(panel)).toBe(39);
  });
});

describe("being knocked out", () => {
  it("marks a seat out at zero life, and says why", () => {
    renderBoard(createGame("standard", 2));
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 20);

    expect(within(panel).getByText(/Out/)).toHaveTextContent("0 life");
  });

  it("marks a seat out at lethal commander damage with life to spare", () => {
    // The case worth remembering: 21 commander damage from 40 life leaves them
    // on 19 and still out.
    renderBoard(
      build(createGame("commander", 4), {
        type: "ADJUST_COMMANDER_DAMAGE",
        targetId: "p1",
        sourceId: "p2",
        delta: LETHAL_COMMANDER_DAMAGE,
      }),
    );
    const panel = panelFor("Player 1");

    expect(lifeOn(panel)).toBe(40 - LETHAL_COMMANDER_DAMAGE);
    expect(within(panel).getByText(/Out/)).toHaveTextContent("21 cmdr damage");
  });

  it("leaves a living seat unmarked", () => {
    renderBoard();

    expect(within(panelFor("Player 1")).queryByText(/Out/)).toBeNull();
  });

  it("clears the mark when the mistake is corrected", () => {
    // Elimination is derived, not destructive. An eliminated player stays on
    // the board precisely so this works.
    renderBoard(createGame("standard", 2));
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 20);
    expect(within(panel).getByText(/Out/)).toBeInTheDocument();

    tap(plusZone(panel));

    expect(within(panel).queryByText(/Out/)).toBeNull();
  });

  it("keeps counting a seat that is already out", () => {
    renderBoard(createGame("standard", 2));
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 20);
    tapTimes(minusZone(panel), 3);

    expect(lifeOn(panel)).toBe(-3);
  });
});

describe("the commander damage button", () => {
  it("is there in Commander", () => {
    renderBoard(createGame("commander", 4));

    expect(
      within(panelFor("Player 1")).getByLabelText("Player 1: commander damage"),
    ).toBeInTheDocument();
  });

  it("is gone in Standard, where commander damage is not a thing", () => {
    renderBoard(createGame("standard", 4));

    expect(
      within(panelFor("Player 1")).queryByLabelText(
        "Player 1: commander damage",
      ),
    ).toBeNull();
  });
});
