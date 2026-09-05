import { describe, expect, it } from "vitest";
import {
  LETHAL_COMMANDER_DAMAGE,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  clamp,
  defaultNameFor,
  displayName,
  eliminationReason,
  formatLabel,
  isEliminated,
  startingLifeFor,
} from "./rules";
import type { Player } from "./types";

const player = (over: Partial<Player> = {}): Player => ({
  id: "p1",
  name: "",
  life: 40,
  colors: ["u"],
  commanderDamage: {},
  ...over,
});

describe("startingLifeFor", () => {
  it("uses the life total each format actually starts on", () => {
    expect(startingLifeFor("commander")).toBe(40);
    expect(startingLifeFor("standard")).toBe(20);
  });
});

describe("formatLabel", () => {
  it("names each format the way a player would say it", () => {
    expect(formatLabel("commander")).toBe("Commander");
    expect(formatLabel("standard")).toBe("Standard");
  });
});

describe("defaultNameFor", () => {
  it("numbers a seat from its id", () => {
    expect(defaultNameFor("p1")).toBe("Player 1");
    expect(defaultNameFor("p6")).toBe("Player 6");
  });

  it("reads a multi-digit seat number as one number, not one digit", () => {
    expect(defaultNameFor("p12")).toBe("Player 12");
  });

  it("falls back to a bare label rather than showing NaN", () => {
    // Nothing generates these ids today, but a save file is user-editable and
    // "Player NaN" on the board would be worse than "Player".
    expect(defaultNameFor("wizard")).toBe("Player");
    expect(defaultNameFor("")).toBe("Player");
    expect(defaultNameFor("p0")).toBe("Player");
  });
});

describe("displayName", () => {
  it("prefers the name the player typed", () => {
    expect(displayName(player({ id: "p3", name: "Atraxa" }))).toBe("Atraxa");
  });

  it("falls back when the name is blank or only whitespace", () => {
    // A whitespace-only name must not render as an empty type line — the panel
    // would lose its heading entirely and seats become hard to tell apart.
    expect(displayName(player({ id: "p2", name: "" }))).toBe("Player 2");
    expect(displayName(player({ id: "p2", name: "   " }))).toBe("Player 2");
  });

  it("trims the stray spaces off a name rather than rendering them", () => {
    expect(displayName(player({ name: " Ur-Dragon " }))).toBe("Ur-Dragon");
  });
});

describe("eliminationReason", () => {
  it("keeps a healthy player in the game", () => {
    expect(eliminationReason(player(), "commander")).toBeNull();
  });

  it("calls out zero life, and stays out below zero", () => {
    expect(eliminationReason(player({ life: 0 }), "commander")).toBe("0 life");
    expect(eliminationReason(player({ life: -7 }), "commander")).toBe("0 life");
  });

  it("reports lethal commander damage with the amount dealt", () => {
    const reason = eliminationReason(
      player({ life: 19, commanderDamage: { p2: LETHAL_COMMANDER_DAMAGE } }),
      "commander",
    );
    expect(reason).toBe("21 cmdr damage");
  });

  it("does not eliminate one point short of lethal", () => {
    const survivor = player({
      commanderDamage: { p2: LETHAL_COMMANDER_DAMAGE - 1 },
    });
    expect(eliminationReason(survivor, "commander")).toBeNull();
  });

  it("does not add up damage from different commanders", () => {
    // 903.10a is per commander. Twenty from each of two commanders is forty
    // damage and still not a commander-damage loss.
    const battered = player({ life: 1, commanderDamage: { p2: 20, p3: 20 } });
    expect(eliminationReason(battered, "commander")).toBeNull();
  });

  it("ignores commander damage entirely in Standard", () => {
    const target = player({ commanderDamage: { p2: 99 } });
    expect(eliminationReason(target, "standard")).toBeNull();
  });

  it("reports life first when a player is out both ways at once", () => {
    const dead = player({ life: 0, commanderDamage: { p2: 30 } });
    expect(eliminationReason(dead, "commander")).toBe("0 life");
  });
});

describe("isEliminated", () => {
  it("agrees with eliminationReason", () => {
    const cases: Player[] = [
      player(),
      player({ life: 0 }),
      player({ life: -3 }),
      player({ commanderDamage: { p2: LETHAL_COMMANDER_DAMAGE } }),
      player({ commanderDamage: { p2: 3 } }),
    ];
    for (const subject of cases) {
      for (const format of ["commander", "standard"] as const) {
        expect(isEliminated(subject, format)).toBe(
          eliminationReason(subject, format) !== null,
        );
      }
    }
  });
});

describe("clamp", () => {
  it("pulls a value inside the range and leaves one that is already in it", () => {
    expect(clamp(1, MIN_PLAYERS, MAX_PLAYERS)).toBe(MIN_PLAYERS);
    expect(clamp(9, MIN_PLAYERS, MAX_PLAYERS)).toBe(MAX_PLAYERS);
    expect(clamp(4, MIN_PLAYERS, MAX_PLAYERS)).toBe(4);
  });

  it("keeps the bounds themselves", () => {
    expect(clamp(MIN_PLAYERS, MIN_PLAYERS, MAX_PLAYERS)).toBe(MIN_PLAYERS);
    expect(clamp(MAX_PLAYERS, MIN_PLAYERS, MAX_PLAYERS)).toBe(MAX_PLAYERS);
  });
});

describe("limits", () => {
  it("holds the table size and name length the UI is built around", () => {
    // The settings stepper, the seat layouts and the name input all size
    // themselves from these; changing one without the others breaks the board.
    expect(MIN_PLAYERS).toBe(2);
    expect(MAX_PLAYERS).toBe(6);
    expect(MAX_NAME_LENGTH).toBe(16);
    expect(LETHAL_COMMANDER_DAMAGE).toBe(21);
  });
});
