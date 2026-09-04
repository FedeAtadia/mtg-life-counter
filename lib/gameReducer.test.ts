import { describe, expect, it } from "vitest";
import { createGame, gameReducer } from "./gameReducer";
import { LETHAL_COMMANDER_DAMAGE, isEliminated } from "./rules";
import { parseGameState } from "./storage";
import type { Action, GameState } from "./types";

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
    state = gameReducer(state, { type: "SET_FORMAT", format: "standard" });

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
    state = gameReducer(state, { type: "RESET_GAME" });

    expect(find(state, "p2").name).toBe("Nissa");
    expect(find(state, "p2").life).toBe(40);
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

  it("rejects junk, wrong versions and impossible rosters", () => {
    expect(parseGameState(null)).toBeNull();
    expect(parseGameState({ version: 2, format: "commander", players: [] })).toBeNull();
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

