import { act, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "@/lib/gameReducer";
import { HOLD_DELAY_MS, STEP_SIZE } from "@/lib/holdRate";
import { LETHAL_COMMANDER_DAMAGE } from "@/lib/rules";
import type { Action, GameState } from "@/lib/types";
import {
  deltaChipOn,
  hold,
  lifeOn,
  minusZone,
  panelFor,
  plusZone,
  renderBoard,
  tap,
  tapTimes,
} from "../test/harness";

const T0 = 1_700_000_000_000;

const build = (base: GameState, ...actions: Action[]): GameState =>
  actions.reduce(gameReducer, base);

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

  it("jumps by ten when the press is held", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    hold(minusZone(panel), HOLD_DELAY_MS, (ms) => vi.advanceTimersByTime(ms));

    // 40 passes through 39 while pressing and lands on 30, not 29.
    expect(lifeOn(panel)).toBe(40 - STEP_SIZE);
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

describe("the running delta chip", () => {
  it("shows what the press has added up to so far", () => {
    renderBoard();
    const panel = panelFor("Player 1");

    tapTimes(minusZone(panel), 3);

    expect(deltaChipOn(panel)).toHaveTextContent("-3");
    expect(deltaChipOn(panel)).toBeVisible();
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
