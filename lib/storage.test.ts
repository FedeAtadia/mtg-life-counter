import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "./gameReducer";
import { MAX_NAME_LENGTH } from "./rules";
import { loadGame, parseGameState, saveGame } from "./storage";
import type { GameState } from "./types";

/**
 * The key a saved game lives under. Duplicated from the module on purpose: it
 * is not exported, and a silent change to it would orphan every game in
 * progress on every phone that has one. This test is the tripwire.
 */
const STORAGE_KEY = "mtg-life-counter:v1";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * The tripwire for the environment itself. Node ships its own Web Storage, on
 * by default from Node 24, and it shadows jsdom's — leaving something that is
 * not a Storage at all. Without this, that shows up as a hundred-odd failures
 * across seven files with one cause, which is a bad afternoon. See
 * `vitest.setup.ts`.
 */
describe("the test environment", () => {
  it("provides a Storage the app can actually use", () => {
    for (const method of ["getItem", "setItem", "removeItem", "clear", "key"]) {
      expect(typeof window.localStorage[method as "clear"]).toBe("function");
    }
  });

  it("keeps what it is given, and lets go of it", () => {
    window.localStorage.setItem("probe", "kept");
    expect(window.localStorage.getItem("probe")).toBe("kept");
    expect(window.localStorage.length).toBe(1);

    window.localStorage.clear();
    expect(window.localStorage.getItem("probe")).toBeNull();
    expect(window.localStorage.length).toBe(0);
  });

  it("reports a miss as null rather than undefined", () => {
    // parseGameState leans on this: loadGame checks the value it gets back.
    expect(window.localStorage.getItem("never-written")).toBeNull();
  });
});

describe("saveGame / loadGame", () => {
  it("round-trips a game through storage", () => {
    const saved = gameReducer(createGame("commander", 4), {
      type: "ADJUST_LIFE",
      id: "p1",
      delta: -13,
    });

    saveGame(saved);

    expect(loadGame()).toEqual(saved);
  });

  it("writes under the documented key", () => {
    saveGame(createGame("standard", 2));
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy();
  });

  it("returns null when nothing has been saved yet", () => {
    expect(loadGame()).toBeNull();
  });

  it("returns null rather than throwing on a half-written value", () => {
    // Storage is shared with anything else on the origin and survives crashes,
    // so it can hold a truncated write. A fresh board beats a white screen.
    window.localStorage.setItem(STORAGE_KEY, "{\"version\":3,\"format\":");
    expect(loadGame()).toBeNull();
  });

  it("returns null for well-formed JSON that is not a game", () => {
    window.localStorage.setItem(STORAGE_KEY, "{\"hello\":\"world\"}");
    expect(loadGame()).toBeNull();
  });

  it("survives storage being unreadable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("SecurityError");
    });
    expect(() => loadGame()).not.toThrow();
    expect(loadGame()).toBeNull();
  });

  it("keeps the game playable when storage refuses the write", () => {
    // Private browsing and a full quota both throw here. Losing persistence is
    // an acceptable outcome; losing the game in progress is not.
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => saveGame(createGame("commander", 4))).not.toThrow();
  });

  it("overwrites the previous save rather than accumulating", () => {
    saveGame(createGame("commander", 4));
    const later = createGame("standard", 2);
    saveGame(later);

    expect(loadGame()).toEqual(later);
    expect(window.localStorage.length).toBe(1);
  });
});

describe("parseGameState hardening", () => {
  const save = (over: Record<string, unknown> = {}) => ({
    version: 3,
    format: "commander",
    players: [
      { id: "p1", name: "", life: 40, colors: ["u"], commanderDamage: {} },
      { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
    ],
    timer: { startedAt: null, elapsedMs: 0 },
    ...over,
  });

  it("truncates an over-long name to what the input allows", () => {
    const parsed = parseGameState(
      save({
        players: [
          {
            id: "p1",
            name: "x".repeat(MAX_NAME_LENGTH + 20),
            life: 40,
            colors: ["u"],
            commanderDamage: {},
          },
          { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
        ],
      }),
    );
    expect(parsed?.players[0].name).toHaveLength(MAX_NAME_LENGTH);
  });

  it("replaces a non-string name with a blank one", () => {
    const parsed = parseGameState(
      save({
        players: [
          { id: "p1", name: 42, life: 40, colors: ["u"], commanderDamage: {} },
          { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
        ],
      }),
    );
    // Blank means "fall back to Player 1", so the seat still has a heading.
    expect(parsed?.players[0].name).toBe("");
  });

  it("rounds a fractional life total to a whole number", () => {
    const parsed = parseGameState(
      save({
        players: [
          {
            id: "p1",
            name: "",
            life: 39.6,
            colors: ["u"],
            commanderDamage: {},
          },
          { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
        ],
      }),
    );
    expect(parsed?.players[0].life).toBe(40);
  });

  it("keeps a negative life total, which is a real position", () => {
    const parsed = parseGameState(
      save({
        players: [
          { id: "p1", name: "", life: -6, colors: ["u"], commanderDamage: {} },
          { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
        ],
      }),
    );
    expect(parsed?.players[0].life).toBe(-6);
  });

  it("rounds damage and refuses to restore a negative counter", () => {
    const parsed = parseGameState(
      save({
        players: [
          {
            id: "p1",
            name: "",
            life: 40,
            colors: ["u"],
            commanderDamage: { p2: -4 },
          },
          {
            id: "p2",
            name: "",
            life: 40,
            colors: ["r"],
            commanderDamage: { p1: 7.4 },
          },
        ],
      }),
    );
    expect(parsed?.players[0].commanderDamage.p2).toBe(0);
    expect(parsed?.players[1].commanderDamage.p1).toBe(7);
  });

  it("rejects a roster with duplicate ids", () => {
    // Two seats sharing an id makes every damage map ambiguous, and React
    // would render two children with the same key.
    const parsed = parseGameState(
      save({
        players: [
          { id: "p1", name: "", life: 40, colors: ["u"], commanderDamage: {} },
          { id: "p1", name: "", life: 40, colors: ["r"], commanderDamage: {} },
        ],
      }),
    );
    expect(parsed).toBeNull();
  });

  it("rejects a player with no usable id or life", () => {
    expect(
      parseGameState(
        save({
          players: [
            { id: "", name: "", life: 40, colors: ["u"], commanderDamage: {} },
            { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
          ],
        }),
      ),
    ).toBeNull();

    expect(
      parseGameState(
        save({
          players: [
            {
              id: "p1",
              name: "",
              life: Number.NaN,
              colors: ["u"],
              commanderDamage: {},
            },
            { id: "p2", name: "", life: 40, colors: ["r"], commanderDamage: {} },
          ],
        }),
      ),
    ).toBeNull();
  });

  it("always reports the current version, whatever came in", () => {
    const parsed = parseGameState(save({ version: 1 }));
    expect(parsed?.version).toBe(3);
  });

  it("keeps a running clock running across a reload", () => {
    // The timer is wall-clock, so a game reloaded mid-turn must come back with
    // its segment still open rather than silently paused.
    const parsed = parseGameState(
      save({ timer: { startedAt: T0, elapsedMs: 5_000 } }),
    );
    expect(parsed?.timer).toEqual({ startedAt: T0, elapsedMs: 5_000 });
  });
});

describe("storage and the reducer agree", () => {
  it("survives a save/load cycle in the middle of a real game", () => {
    let state: GameState = createGame("commander", 4);
    state = gameReducer(state, { type: "ADJUST_LIFE", id: "p1", delta: -9 });
    state = gameReducer(state, {
      type: "ADJUST_COMMANDER_DAMAGE",
      targetId: "p2",
      sourceId: "p3",
      delta: 7,
    });
    state = gameReducer(state, {
      type: "RENAME_PLAYER",
      id: "p4",
      name: "Fede",
    });
    state = gameReducer(state, {
      type: "SET_PLAYER_COLORS",
      id: "p4",
      colors: ["g", "w"],
    });

    saveGame(state);
    const restored = loadGame();

    expect(restored).toEqual(state);
    // And the restored game keeps playing from exactly where it left off.
    const after = gameReducer(restored!, {
      type: "ADJUST_LIFE",
      id: "p1",
      delta: -1,
    });
    expect(after.players[0].life).toBe(30);
  });
});
