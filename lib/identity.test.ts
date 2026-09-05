import { describe, expect, it } from "vitest";
import {
  COLORLESS_HEX,
  GOLD_HEX,
  MANA,
  MANA_COLORS,
  defaultColorsForSeat,
  describeIdentity,
  normalizeColors,
  trimFor,
  washFor,
} from "./identity";
import { MAX_PLAYERS } from "./rules";
import type { ManaColor } from "./types";

describe("normalizeColors", () => {
  it("sorts into WUBRG order however they were picked", () => {
    expect(normalizeColors(["g", "u", "r"])).toEqual(["u", "r", "g"]);
    expect(normalizeColors(["b", "w"])).toEqual(["w", "b"]);
  });

  it("drops duplicates", () => {
    expect(normalizeColors(["r", "r", "r"])).toEqual(["r"]);
  });

  it("leaves colourless alone", () => {
    expect(normalizeColors([])).toEqual([]);
  });
});

describe("defaultColorsForSeat", () => {
  it("gives every seat a single, different colour to start", () => {
    const seats = Array.from({ length: 5 }, (_, i) => defaultColorsForSeat(i));
    expect(seats.flat()).toEqual([...MANA_COLORS]);
  });

  it("wraps rather than running out at six players", () => {
    for (let seat = 0; seat < MAX_PLAYERS; seat++) {
      expect(defaultColorsForSeat(seat)).toHaveLength(1);
    }
  });
});

describe("trimFor", () => {
  it("keeps a single colour as itself", () => {
    for (const color of MANA_COLORS) {
      expect(trimFor([color])).toBe(MANA[color].hex);
    }
  });

  it("turns gold at three colours, as a real multicolour card does", () => {
    expect(trimFor(["u", "r", "g"])).toBe(GOLD_HEX);
    expect(trimFor(["w", "u", "b", "r"])).toBe(GOLD_HEX);
    expect(trimFor([...MANA_COLORS])).toBe(GOLD_HEX);
  });

  it("does not turn gold at two", () => {
    expect(trimFor(["u", "b"])).not.toBe(GOLD_HEX);
  });

  it("gives colourless its own trim", () => {
    expect(trimFor([])).toBe(COLORLESS_HEX);
  });
});

describe("washFor", () => {
  it("keeps the real colours even when the trim has gone gold", () => {
    // The whole point of splitting trim from wash: a pod of three-colour
    // commanders must not become six identical gold panels, or nobody can
    // pick out their own seat at a glance.
    const wash = washFor(["u", "r", "g"]);
    expect(wash).toContain(MANA.u.hex);
    expect(wash).toContain(MANA.r.hex);
    expect(wash).toContain(MANA.g.hex);
    expect(wash).not.toContain(GOLD_HEX);
  });

  it("gives two players with different identities different washes", () => {
    expect(washFor(["u", "r", "g"])).not.toBe(washFor(["w", "u", "b"]));
  });

  it("produces a usable background for every identity size", () => {
    const identities: ManaColor[][] = [
      [],
      ["r"],
      ["u", "b"],
      ["u", "r", "g"],
      [...MANA_COLORS],
    ];
    for (const colors of identities) {
      const wash = washFor(colors);
      expect(wash).toMatch(/gradient\(/);
      expect(wash).not.toContain("undefined");
      expect(wash).not.toContain("NaN");
    }
  });
});

describe("describeIdentity", () => {
  it("reads out an identity for a screen reader", () => {
    expect(describeIdentity([])).toBe("Colourless");
    expect(describeIdentity(["r"])).toBe("Red");
    expect(describeIdentity(["u", "r"])).toBe("Blue and Red");
    expect(describeIdentity(["u", "r", "g"])).toBe("Blue, Red and Green");
  });
});
