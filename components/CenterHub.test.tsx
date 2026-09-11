import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import { HUB_TRACK, SEAT_LAYOUTS } from "@/lib/seatLayout";
import { startedTimerAt } from "@/lib/timer";
import { hub, openSettings, renderBoard } from "../test/harness";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

const startButton = () =>
  screen.queryByRole("button", { name: "Start the game clock" });

describe("starting the game (TIMER-7)", () => {
  it("holds the clock at zero until it is pressed", () => {
    renderBoard();
    expect(startButton()).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(65_000));

    expect(hub()).toHaveAccessibleName(
      "Game settings. Elapsed 0:00, not started",
    );
  });

  it("starts the clock and takes itself away", () => {
    renderBoard();

    fireEvent.click(startButton()!);
    act(() => vi.advanceTimersByTime(65_000));

    expect(startButton()).not.toBeInTheDocument();
    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 1:05");
  });

  it("is not offered on a game already under way", () => {
    renderBoard(createGame("commander", 4, startedTimerAt(T0)));

    expect(startButton()).not.toBeInTheDocument();
  });

  it("stays away from a game paused with time on it", () => {
    // A pause is not a game waiting to start. Offering Start here would offer
    // to throw the banked time away; resuming is settings' job (TIMER-8).
    renderBoard(
      createGame("commander", 4, { startedAt: null, elapsedMs: 90_000 }),
    );

    expect(startButton()).not.toBeInTheDocument();
    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 1:30, paused");
  });

  it("comes back after a reset, with the clock waiting again", () => {
    renderBoard(createGame("commander", 2, startedTimerAt(T0)));
    act(() => vi.advanceTimersByTime(90_000));

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText(/Reset game/));
    fireEvent.click(within(sheet).getByText(/Tap again to reset/));

    expect(startButton()).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(30_000));
    expect(hub()).toHaveAccessibleName(
      "Game settings. Elapsed 0:00, not started",
    );
  });

});

describe("where the hub sits (SEAT-7, TIMER-9)", () => {
  const row = () => hub().parentElement as HTMLElement;

  it("holds the clock in the middle of three columns with equal sides", () => {
    // Equal sides are what put the middle column at the exact centre of the
    // board, whatever either side is holding. The clock stays centred by
    // construction rather than by an offset somebody has to keep in step.
    renderBoard();

    expect(row()).toHaveStyle({ gridTemplateColumns: "1fr auto 1fr" });
    expect(row().children[1]).toBe(hub());
  });

  it("leaves the clock in the same column when Start goes away", () => {
    // The clock is on the board for the whole game and Start for the first few
    // seconds of it. If starting a game shifted the clock, the one control
    // anybody reaches for all night would move the moment play began.
    renderBoard();
    expect(startButton()).toBeInTheDocument();

    fireEvent.click(startButton()!);

    expect(startButton()).not.toBeInTheDocument();
    expect(row().children[1]).toBe(hub());
  });

  it("puts Start in the row beside the clock, never across it", () => {
    // The row is only deep enough for one pill (SEAT-7). Anything stacked
    // across it would be back over a card.
    renderBoard();

    expect(row().children[0]).toContainElement(startButton());
  });

  it("gives the hub a cell of the board rather than floating it over one", () => {
    renderBoard(createGame("commander", 6));

    // Its own grid area, and the seats never claim it — the tiling test in
    // lib/seatLayout.test.ts is what holds the other half of that up.
    expect(hub().parentElement).toHaveStyle({
      gridArea: SEAT_LAYOUTS[6].hubArea,
    });
  });
});

describe("one depth for the whole game (SEAT-9)", () => {
  const board = () => document.querySelector("main") as HTMLElement;
  const rows = () => board().style.gridTemplateRows;

  it("names the hub's depth outright rather than through a variable", () => {
    // A template that reads a custom property looks identical in every state
    // while the depth behind it changes — which is exactly how the band used
    // to close up. Naming the value is what makes "unchanged" mean unchanged.
    renderBoard();

    expect(rows()).toContain(HUB_TRACK);
    expect(rows()).not.toContain("var(");
  });

  it("keeps the board's rows exactly as they were when the clock starts", () => {
    // Every card, and every control in the hub's row, stays where a hand last
    // found it. A board that re-flowed at the moment play began would move
    // six life totals at once.
    renderBoard();
    const before = rows();

    fireEvent.click(startButton()!);

    expect(startButton()).not.toBeInTheDocument();
    expect(rows()).toBe(before);
  });

  it("keeps them through a pause and a reset", () => {
    renderBoard();
    const before = rows();
    fireEvent.click(startButton()!);
    act(() => vi.advanceTimersByTime(30_000));

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText("Pause"));
    expect(rows()).toBe(before);

    fireEvent.click(within(sheet).getByText(/Reset game/));
    fireEvent.click(within(sheet).getByText(/Tap again to reset/));
    expect(startButton()).toBeInTheDocument();
    expect(rows()).toBe(before);
  });
});
