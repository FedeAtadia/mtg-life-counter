import { describe, expect, it } from "vitest";
import { createGame, gameReducer } from "./gameReducer";
import { LETHAL_COMMANDER_DAMAGE, isEliminated } from "./rules";
import { parseGameState } from "./storage";
import { elapsedMsOf } from "./timer";
import type { Action, GameState } from "./types";

/** A fixed clock, so nothing here depends on when the suite runs. */
const T0 = 1_700_000_000_000;

const apply = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce(gameReducer, state);

const damage = (
  targetId: string,
  sourceId: string,
  delta: number,
): Action => ({
  type: "ADJUST_COMMANDER_DAMAGE",
  targetId,
  sourceId,
  delta,
});

const find = (state: GameState, id: string) =>
  state.players.find((p) => p.id === id)!;

describe("starting life", () => {
  it("uses 40 for Commander and 20 for Standard", () => {
    expect(createGame("commander", 4).players[0].life).toBe(40);
    expect(createGame("standard", 2).players[0].life).toBe(20);
  });

  it("clamps the player count to 2..6", () => {
    expect(createGame("commander", 1).players).toHaveLength(2);
    expect(createGame("commander", 9).players).toHaveLength(6);
  });
});

describe("commander damage maps", () => {
  it("gives every player one entry per opponent and none for themselves", () => {
    const state = createGame("commander", 4);
    for (const player of state.players) {
      expect(Object.keys(player.commanderDamage).sort()).toEqual(
        state.players
          .filter((p) => p.id !== player.id)
          .map((p) => p.id)
          .sort(),
      );
    }
  });

  it("seeds both directions when a player joins mid-game", () => {
    const before = createGame("commander", 3);
    const after = gameReducer(before, { type: "ADD_PLAYER" });
    const added = after.players[after.players.length - 1];

    expect(after.players).toHaveLength(4);
    expect(added.commanderDamage).toEqual({ p1: 0, p2: 0, p3: 0 });
    for (const player of after.players) {
      if (player.id === added.id) continue;
      expect(player.commanderDamage[added.id]).toBe(0);
    }
  });

  it("drops a departed player's entries and keeps the rest intact", () => {
    const withDamage = apply(
      createGame("commander", 4),
      damage("p1", "p2", 5),
      damage("p1", "p3", 7),
    );

    const after = gameReducer(withDamage, {
      type: "REMOVE_PLAYER",
      id: "p2",
    });

    expect(after.players.map((p) => p.id)).toEqual(["p1", "p3", "p4"]);
    expect(find(after, "p1").commanderDamage).toEqual({ p3: 7, p4: 0 });
    expect(
      after.players.every((p) => !("p2" in p.commanderDamage)),
    ).toBe(true);
  });

  it("refuses to drop below two players", () => {
    const state = createGame("commander", 2);
    expect(
      gameReducer(state, { type: "REMOVE_PLAYER", id: "p1" }),
    ).toBe(state);
  });

  it("refuses to go above six players", () => {
    const state = createGame("commander", 6);
    expect(gameReducer(state, { type: "ADD_PLAYER" })).toBe(state);
  });
});

describe("commander damage is real damage", () => {
  it("takes the same amount off the recipient's life", () => {
    const state = apply(
      createGame("commander", 4),
      damage("p1", "p2", 6),
    );
    expect(find(state, "p1").life).toBe(34);
    expect(find(state, "p1").commanderDamage.p2).toBe(6);
  });

  it("gives the life back when damage is corrected downwards", () => {
    let state = createGame("commander", 4);
    state = gameReducer(state, damage("p1", "p2", 6));
    state = gameReducer(state, damage("p1", "p2", -2));
    expect(find(state, "p1").life).toBe(36);
    expect(find(state, "p1").commanderDamage.p2).toBe(4);
  });

  it("is a complete no-op when decrementing a counter already at zero", () => {
    const state = createGame("commander", 4);
    const after = gameReducer(state, damage("p1", "p2", -1));
    expect(find(after, "p1").life).toBe(40);
    expect(find(after, "p1").commanderDamage.p2).toBe(0);
  });

  it("ignores self-damage and unknown sources", () => {
    const state = createGame("commander", 4);
    expect(gameReducer(state, damage("p1", "p1", 3))).toBe(state);
    expect(gameReducer(state, damage("p1", "p9", 3))).toBe(state);
  });
});

describe("elimination", () => {
  it("eliminates at 21 commander damage even with life to spare", () => {
    let state = createGame("commander", 4);
    state = gameReducer(
      state,
      damage("p1", "p2", LETHAL_COMMANDER_DAMAGE),
    );

    const player = find(state, "p1");
    expect(player.life).toBe(19);
    expect(player.life).toBeGreaterThan(0);
    expect(isEliminated(player, "commander")).toBe(true);
  });

  it("does not eliminate at 20 commander damage", () => {
    let state = createGame("commander", 4);
    state = gameReducer(state, damage("p1", "p2", 20));
    expect(isEliminated(find(state, "p1"), "commander")).toBe(false);
  });

  it("does not treat commander damage as lethal in Standard", () => {
    const player = { ...createGame("commander", 4).players[0] };
    player.commanderDamage = { p2: 30 };
    expect(isEliminated(player, "standard")).toBe(false);
  });

  it("eliminates at zero life and lets totals go negative", () => {
    let state = createGame("standard", 2);
    state = gameReducer(state, { type: "ADJUST_LIFE", id: "p1", delta: -25 });
    expect(find(state, "p1").life).toBe(-5);
    expect(isEliminated(find(state, "p1"), "standard")).toBe(true);
  });
});

describe("format and reset", () => {
  it("resets every total when the format changes", () => {
    let state = createGame("commander", 3);
    state = gameReducer(state, damage("p1", "p2", 9));
    state = gameReducer(state, {
      type: "SET_FORMAT",
      format: "standard",
      at: T0,
    });

    expect(state.format).toBe("standard");
    expect(state.players.every((p) => p.life === 20)).toBe(true);
    expect(find(state, "p1").commanderDamage.p2).toBe(0);
  });

  it("keeps names and seats through a reset", () => {
    let state = createGame("commander", 3);
    state = gameReducer(state, {
      type: "RENAME_PLAYER",
      id: "p2",
      name: "Nissa",
    });
    state = gameReducer(state, { type: "ADJUST_LIFE", id: "p2", delta: -13 });
    state = gameReducer(state, { type: "RESET_GAME", at: T0 });

    expect(find(state, "p2").name).toBe("Nissa");
    expect(find(state, "p2").life).toBe(40);
  });
});

describe("timer", () => {
  const MINUTE = 60_000;

  it("starts a fresh clock on reset", () => {
    const state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    expect(state.timer).toEqual({ startedAt: T0, elapsedMs: 0 });
    expect(elapsedMsOf(state.timer, T0 + 90_000)).toBe(90_000);
  });

  it("starts a fresh clock when the format changes", () => {
    let state = createGame("commander", 4);
    state = gameReducer(state, { type: "RESET_GAME", at: T0 });
    state = gameReducer(state, {
      type: "SET_FORMAT",
      format: "standard",
      at: T0 + 5 * MINUTE,
    });
    expect(elapsedMsOf(state.timer, T0 + 5 * MINUTE)).toBe(0);
  });

  it("banks elapsed time on pause and stops accumulating", () => {
    let state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    state = gameReducer(state, { type: "PAUSE_TIMER", at: T0 + 3 * MINUTE });

    expect(state.timer).toEqual({ startedAt: null, elapsedMs: 3 * MINUTE });
    // An hour of wall-clock passing must not move a paused clock.
    expect(elapsedMsOf(state.timer, T0 + 63 * MINUTE)).toBe(3 * MINUTE);
  });

  it("continues from the banked total on resume", () => {
    let state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    state = gameReducer(state, { type: "PAUSE_TIMER", at: T0 + 3 * MINUTE });
    state = gameReducer(state, { type: "RESUME_TIMER", at: T0 + 10 * MINUTE });

    // Two minutes of play after a seven minute break: 3 + 2, not 3 + 9.
    expect(elapsedMsOf(state.timer, T0 + 12 * MINUTE)).toBe(5 * MINUTE);
  });

  it("does not drift across repeated pause/resume cycles", () => {
    let state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    let now = T0;
    for (let i = 0; i < 20; i++) {
      now += MINUTE;
      state = gameReducer(state, { type: "PAUSE_TIMER", at: now });
      now += 5 * MINUTE; // paused, must not count
      state = gameReducer(state, { type: "RESUME_TIMER", at: now });
    }
    expect(elapsedMsOf(state.timer, now)).toBe(20 * MINUTE);
  });

  it("ignores pausing a paused clock and resuming a running one", () => {
    let state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    expect(gameReducer(state, { type: "RESUME_TIMER", at: T0 + 99 })).toBe(
      state,
    );

    state = gameReducer(state, { type: "PAUSE_TIMER", at: T0 + MINUTE });
    expect(gameReducer(state, { type: "PAUSE_TIMER", at: T0 + 99 * MINUTE })).toBe(
      state,
    );
  });

  it("leaves the clock alone for life and roster changes", () => {
    const state = gameReducer(createGame("commander", 4), {
      type: "RESET_GAME",
      at: T0,
    });
    const after = apply(
      state,
      { type: "ADJUST_LIFE", id: "p1", delta: -7 },
      { type: "ADD_PLAYER" },
      damage("p1", "p2", 3),
    );
    expect(after.timer).toEqual(state.timer);
  });
});

describe("parseGameState", () => {
  it("round-trips a real game", () => {
    let state = createGame("commander", 4);
    state = gameReducer(state, damage("p1", "p3", 4));
    expect(parseGameState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("repairs damage maps that no longer match the roster", () => {
    const parsed = parseGameState({
      version: 1,
      format: "commander",
      players: [
        { id: "p1", name: "", life: 40, accent: 0, commanderDamage: { gone: 9 } },
        { id: "p2", name: "", life: 40, accent: 1, commanderDamage: {} },
      ],
    });

    expect(parsed?.players[0].commanderDamage).toEqual({ p2: 0 });
    expect(parsed?.players[1].commanderDamage).toEqual({ p1: 0 });
  });

  it("migrates a version 1 save, keeping the game and adding a stopped clock", () => {
    // Exactly what a friend mid-game would have in localStorage from v1.
    const v1 = {
      version: 1,
      format: "commander",
      players: [
        { id: "p1", name: "Fede", life: 27, accent: 0, commanderDamage: { p2: 13 } },
        { id: "p2", name: "", life: 40, accent: 1, commanderDamage: { p1: 0 } },
      ],
    };

    const parsed = parseGameState(v1);

    expect(parsed?.version).toBe(3);
    expect(parsed?.players[0].life).toBe(27);
    expect(parsed?.players[0].name).toBe("Fede");
    expect(parsed?.players[0].commanderDamage.p2).toBe(13);
    // No way to know when that game started, so it shows 0:00 rather than a
    // fabricated elapsed time.
    expect(parsed?.timer).toEqual({ startedAt: null, elapsedMs: 0 });
  });

  it("turns an old accent index into a colour identity", () => {
    // v1 and v2 stored an accent index. Mapping it onto the matching mana
    // colour keeps a game in progress looking roughly as it did, instead of
    // resetting the whole table to one colour.
    const parsed = parseGameState({
      version: 2,
      format: "commander",
      players: [
        { id: "p1", name: "", life: 40, accent: 0, commanderDamage: {} },
        { id: "p2", name: "", life: 40, accent: 3, commanderDamage: {} },
      ],
      timer: { startedAt: null, elapsedMs: 0 },
    });

    expect(parsed?.version).toBe(3);
    expect(parsed?.players[0].colors).toEqual(["w"]);
    expect(parsed?.players[1].colors).toEqual(["r"]);
  });

  it("keeps a saved identity, in WUBRG order however it was stored", () => {
    const parsed = parseGameState({
      version: 3,
      format: "commander",
      players: [
        { id: "p1", name: "", life: 40, colors: ["g", "u", "r"], commanderDamage: {} },
        { id: "p2", name: "", life: 40, colors: [], commanderDamage: {} },
      ],
      timer: { startedAt: null, elapsedMs: 0 },
    });

    expect(parsed?.players[0].colors).toEqual(["u", "r", "g"]);
    // Colourless is a real identity, not a missing value.
    expect(parsed?.players[1].colors).toEqual([]);
  });

  it("drops nonsense colours rather than the game", () => {
    const parsed = parseGameState({
      version: 3,
      format: "commander",
      players: [
        { id: "p1", name: "", life: 40, colors: ["u", "purple", 7], commanderDamage: {} },
        { id: "p2", name: "", life: 40, colors: "blue", commanderDamage: {} },
      ],
      timer: { startedAt: null, elapsedMs: 0 },
    });

    expect(parsed?.players[0].colors).toEqual(["u"]);
    // Not an array at all, and no accent to fall back on: seat default.
    expect(parsed?.players[1].colors).toEqual(["u"]);
  });

  it("repairs a corrupt timer instead of dropping the game", () => {
    const parsed = parseGameState({
      version: 2,
      format: "standard",
      players: [
        { id: "p1", name: "", life: 20, accent: 0, commanderDamage: {} },
        { id: "p2", name: "", life: 20, accent: 1, commanderDamage: {} },
      ],
      timer: { startedAt: "nonsense", elapsedMs: -5 },
    });

    expect(parsed?.timer).toEqual({ startedAt: null, elapsedMs: 0 });
  });

  it("rejects junk, wrong versions and impossible rosters", () => {
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState({ version: 3, format: "commander", players: [] })).toBeNull();
    expect(
      parseGameState({ version: 1, format: "pauper", players: [] }),
    ).toBeNull();
    expect(
      parseGameState({
        version: 1,
        format: "commander",
        players: [{ id: "p1", name: "", life: 40, accent: 0, commanderDamage: {} }],
      }),
    ).toBeNull();
  });
});

