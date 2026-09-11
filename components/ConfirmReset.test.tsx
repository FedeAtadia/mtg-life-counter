import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/rules";
import { startedTimerAt } from "@/lib/timer";
import {
  answerReset,
  hub,
  lifeOn,
  panelFor,
  renderBoard,
  resetButton,
  resetPanel,
  tap,
  minusZone,
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
});

/** Player 1, knocked down a point, so there is something for a reset to undo. */
function hurtPlayerOne() {
  tap(minusZone(panelFor("Player 1")));
  expect(lifeOn(panelFor("Player 1"))).toBe(39);
}

describe("reset in the hub's row (RESET-5)", () => {
  it.each(counts)("is there at %i players", (count) => {
    renderBoard(createGame("commander", count));

    expect(resetButton()).toBeInTheDocument();
  });

  it("stays there once the game is under way", () => {
    // Start leaves the row when the clock starts. Reset does not: a game gone
    // wrong halfway through is exactly when it is wanted.
    renderBoard(createGame("commander", 4, startedTimerAt(T0)));

    expect(resetButton()).toBeInTheDocument();
  });

  it("sits on the far side of the clock from Start, leaving the clock centred", () => {
    // TIMER-9: the clock's column does not move for anything the row holds.
    renderBoard();
    const row = hub().parentElement as HTMLElement;

    expect(row.children[1]).toBe(hub());
    expect(row.children[2]).toContainElement(resetButton());
  });
});

describe("asking first (RESET-1)", () => {
  it("wipes nothing on the first press, only asks", () => {
    renderBoard(createGame("commander", 2));
    hurtPlayerOne();

    fireEvent.click(resetButton());

    expect(resetPanel()).toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(39);
  });

  it("starts the game over when the panel is answered (RESET-2)", () => {
    renderBoard(createGame("commander", 2, startedTimerAt(T0)));
    act(() => vi.advanceTimersByTime(90_000));
    hurtPlayerOne();

    fireEvent.click(resetButton());
    answerReset("Reset");

    expect(resetPanel()).not.toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(40);
    // The clock goes back to zero and waits to be started again (TIMER-5).
    expect(hub()).toHaveAccessibleName(
      "Game settings. Elapsed 0:00, not started",
    );
  });

  it("changes nothing on Cancel", () => {
    renderBoard(createGame("commander", 2));
    hurtPlayerOne();

    fireEvent.click(resetButton());
    answerReset("Cancel");

    expect(resetPanel()).not.toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(39);
  });

  it("changes nothing on a press outside the panel", () => {
    // A phone in the middle of a table gets pressed by accident. Missing the
    // panel must never be the same as agreeing to it.
    renderBoard(createGame("commander", 2));
    hurtPlayerOne();

    fireEvent.click(resetButton());
    fireEvent.click(screen.getByLabelText("Cancel the reset"));

    expect(resetPanel()).not.toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(39);
  });

  it("says what it will do, in the format being played", () => {
    // The panel names the life everyone goes back to, and mentions commander
    // damage only where there is any to clear.
    renderBoard(createGame("commander", 2));
    fireEvent.click(resetButton());
    const commander = within(resetPanel()!);
    expect(commander.getByText(/back to 40/)).toBeInTheDocument();
    expect(commander.getByText(/commander damage/)).toBeInTheDocument();
    answerReset("Cancel");
  });

  it("does not mention commander damage in Standard", () => {
    renderBoard(createGame("standard", 2));
    fireEvent.click(resetButton());
    const standard = within(resetPanel()!);

    expect(standard.getByText(/back to 20/)).toBeInTheDocument();
    expect(standard.queryByText(/commander damage/)).not.toBeInTheDocument();
  });
});
