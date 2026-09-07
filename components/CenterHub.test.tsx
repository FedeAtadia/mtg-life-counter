import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import {
  HUB_TRACK,
  HUB_TRACK_RUNNING,
  SEAT_LAYOUTS,
} from "@/lib/seatLayout";
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

  it("faces the same way as the hub it sits above", () => {
    // Both sit on the centre seam and take the layout's hub rotation. One
    // turned and one not would read as two unrelated things (SEAT-3).
    renderBoard(createGame("commander", 6));

    expect(startButton()!.style.transform).toContain("rotate(90deg)");
    expect(hub().style.transform).toContain("rotate(90deg)");
  });
});

describe("where the hub sits (SEAT-7, TIMER-9)", () => {
  it("leaves the clock in the same place when Start goes away", () => {
    // The clock is on the board for the whole game and Start for the first few
    // seconds of it. If starting a game shifted the clock, the one control
    // anybody reaches for all night would move the moment play began.
    renderBoard();
    expect(startButton()).toBeInTheDocument();
    const before = hub().style.transform;

    fireEvent.click(startButton()!);

    expect(startButton()).not.toBeInTheDocument();
    expect(hub().style.transform).toBe(before);
  });

  it("moves Start along the hub's band, never across it", () => {
    // The band is only deep enough for one pill (SEAT-7), so an offset across
    // it would put Start back over a card — which is what the band exists to
    // stop. In the hub's own frame that is translateX either way.
    renderBoard();

    const moved = startButton()!.style.transform;
    expect(moved).toContain("translateX");
    expect(moved).not.toContain("translateY");
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

describe("the band closing up when a game starts (SEAT-9)", () => {
  const board = () => document.querySelector("main") as HTMLElement;
  const track = () => board().style.getPropertyValue("--hub-track");

  it("holds the deeper band while Start is still there", () => {
    renderBoard();

    expect(startButton()).toBeInTheDocument();
    expect(track()).toBe(HUB_TRACK);
  });

  it("gives the room back to the seats once the clock is running", () => {
    renderBoard();

    fireEvent.click(startButton()!);

    expect(startButton()).not.toBeInTheDocument();
    expect(track()).toBe(HUB_TRACK_RUNNING);
  });

  it("stays shallow while a game is paused, because Start does not come back", () => {
    // Pausing banks the time; it does not un-start the game (TIMER-3), so the
    // Start button stays gone and the band has no reason to reopen.
    renderBoard();
    fireEvent.click(startButton()!);
    // Let some clock run first. A game paused the same instant it began has
    // nothing banked and is genuinely a fresh board again — Start returns and
    // the band reopens, which is the next test, not this one.
    act(() => vi.advanceTimersByTime(30_000));

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText("Pause"));

    expect(startButton()).not.toBeInTheDocument();
    expect(track()).toBe(HUB_TRACK_RUNNING);
  });

  it("reopens for a game paused before a single second was banked", () => {
    // The edge the case above steps around: nothing ran, so nothing is banked,
    // and a board with a zeroed stopped clock is exactly a board that has never
    // been started (TIMER-4). Start comes back, so the room for it must too.
    renderBoard();
    fireEvent.click(startButton()!);

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText("Pause"));

    expect(startButton()).toBeInTheDocument();
    expect(track()).toBe(HUB_TRACK);
  });

  it("reopens for a game that has been reset back to the start", () => {
    // Reset puts the clock back to zero and stopped (TIMER-5), so Start
    // returns — and the band has to make room for it again.
    renderBoard();
    fireEvent.click(startButton()!);
    expect(track()).toBe(HUB_TRACK_RUNNING);

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText(/Reset game/));
    fireEvent.click(within(sheet).getByText(/Tap again to reset/));

    expect(startButton()).toBeInTheDocument();
    expect(track()).toBe(HUB_TRACK);
  });
});
