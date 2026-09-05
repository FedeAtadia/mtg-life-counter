import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "./gameReducer";
import { saveGame } from "./storage";
import { GameProvider, useGame } from "./useGame";
import type { ReactNode } from "react";
import type { GameState } from "./types";

const T0 = 1_700_000_000_000;

/** Long enough for the write to land; the provider debounces by 250ms. */
const DEBOUNCE_MS = 250;

const wrapper = ({ children }: { children: ReactNode }) => (
  <GameProvider>{children}</GameProvider>
);

const mount = () => renderHook(() => useGame(), { wrapper });

/** The distinctive game used to prove hydration actually happened. */
const savedGame = (): GameState =>
  gameReducer(createGame("standard", 2), {
    type: "RENAME_PLAYER",
    id: "p1",
    name: "Fede",
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useGame outside a provider", () => {
  it("fails loudly rather than rendering a board with no state", () => {
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useGame())).toThrow(/GameProvider/);
    quiet.mockRestore();
  });
});

describe("a first visit", () => {
  it("deals a fresh Commander board", () => {
    const { result } = mount();

    expect(result.current.state.format).toBe("commander");
    expect(result.current.state.players).toHaveLength(4);
    expect(result.current.state.players.every((p) => p.life === 40)).toBe(true);
  });

  it("starts the clock, which the prerendered state deliberately does not", () => {
    // The static export has to render 0:00 on a stopped clock so the build and
    // the first client render agree; the provider starts it after mount.
    const { result } = mount();

    expect(result.current.state.timer.startedAt).toBe(T0);
  });
});

describe("returning to a game in progress", () => {
  it("puts the saved game back on the board", () => {
    saveGame(savedGame());

    const { result } = mount();

    expect(result.current.state.format).toBe("standard");
    expect(result.current.state.players).toHaveLength(2);
    expect(result.current.state.players[0].name).toBe("Fede");
  });

  it("never writes the default board over the saved one", () => {
    // The provider renders once with the prerendered default before the load
    // effect runs. If that render's debounced write were ever allowed to land,
    // opening the app would silently destroy the game in progress.
    saveGame(savedGame());
    const writes = vi.spyOn(Storage.prototype, "setItem");

    mount();
    act(() => vi.advanceTimersByTime(10 * DEBOUNCE_MS));

    for (const [, value] of writes.mock.calls) {
      const written = JSON.parse(value as string) as GameState;
      expect(written.format).toBe("standard");
      expect(written.players).toHaveLength(2);
    }
  });

  it("brings the clock back exactly as it was saved", () => {
    // Only a fresh board starts its own clock. A game picked back up keeps the
    // timer it was saved with, so a paused game does not silently resume and a
    // running one does not lose the time the app was closed for.
    saveGame(createGame("commander", 4, { startedAt: null, elapsedMs: 42_000 }));

    const { result } = mount();

    expect(result.current.state.timer).toEqual({
      startedAt: null,
      elapsedMs: 42_000,
    });
  });

  it("keeps counting a game that was still running when it was closed", () => {
    saveGame(
      createGame("commander", 4, { startedAt: T0 - 60_000, elapsedMs: 0 }),
    );

    const { result } = mount();

    expect(result.current.state.timer.startedAt).toBe(T0 - 60_000);
  });

  it("falls back to a fresh board when the save is corrupt", () => {
    window.localStorage.setItem("mtg-life-counter:v1", "{ not json");

    const { result } = mount();

    expect(result.current.state.players).toHaveLength(4);
    expect(result.current.state.timer.startedAt).toBe(T0);
  });
});

describe("persistence", () => {
  it("writes a change once the debounce has passed", () => {
    const { result } = mount();

    act(() =>
      result.current.dispatch({ type: "ADJUST_LIFE", id: "p1", delta: -7 }),
    );
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS));

    const raw = window.localStorage.getItem("mtg-life-counter:v1");
    expect(JSON.parse(raw!).players[0].life).toBe(33);
  });

  it("holds the write back until the player stops pressing", () => {
    const { result } = mount();
    const writes = vi.spyOn(Storage.prototype, "setItem");

    // A held button dispatches ten times a second. Writing on every one would
    // mean a JSON stringify of the whole game per frame of a hold.
    for (let i = 0; i < 20; i++) {
      act(() =>
        result.current.dispatch({ type: "ADJUST_LIFE", id: "p1", delta: -1 }),
      );
      act(() => vi.advanceTimersByTime(100));
    }
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS));

    expect(writes).toHaveBeenCalledTimes(1);
    expect(
      JSON.parse(window.localStorage.getItem("mtg-life-counter:v1")!).players[0]
        .life,
    ).toBe(20);
  });

  it("does not write before the debounce elapses", () => {
    const { result } = mount();
    const writes = vi.spyOn(Storage.prototype, "setItem");

    act(() =>
      result.current.dispatch({ type: "ADJUST_LIFE", id: "p1", delta: -1 }),
    );
    act(() => vi.advanceTimersByTime(DEBOUNCE_MS - 1));

    expect(writes).not.toHaveBeenCalled();
  });

  it("survives storage refusing the write", () => {
    const { result } = mount();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });

    act(() =>
      result.current.dispatch({ type: "ADJUST_LIFE", id: "p1", delta: -1 }),
    );
    expect(() => act(() => vi.advanceTimersByTime(DEBOUNCE_MS))).not.toThrow();

    // The board keeps playing even though nothing was persisted.
    expect(result.current.state.players[0].life).toBe(39);
  });
});

describe("the context value", () => {
  it("keeps a stable identity while the state does not change", () => {
    // The value is memoised on state, so an unrelated re-render of a parent
    // must not repaint all six seats.
    const { result, rerender } = mount();
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });

  it("hands out a new value when the game moves on", () => {
    const { result } = mount();
    const first = result.current;

    act(() =>
      result.current.dispatch({ type: "ADJUST_LIFE", id: "p1", delta: -1 }),
    );

    expect(result.current).not.toBe(first);
    expect(result.current.dispatch).toBe(first.dispatch);
  });
});
