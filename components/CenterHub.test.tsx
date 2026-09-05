import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
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
