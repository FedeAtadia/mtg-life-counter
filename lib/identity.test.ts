import { describe, expect, it } from "vitest";
import {
  COLORLESS_HEX,
  GOLD_HEX,
  MANA,
  MANA_COLORS,
  PIP_CENTRE,
  PIP_RADIUS,
  defaultColorsForSeat,
  describeIdentity,
  normalizeColors,
  pipWedges,
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

describe("pipWedges (COLOR-7)", () => {
  /**
   * A wedge's two rim corners: where the straight edge lands, and where the
   * arc ends. Read as SVG rather than by counting numbers — an arc carries its
   * radii and flags as numbers too, and scooping those up as coordinates is
   * how this test first fooled itself.
   */
  function pointsOf(d: string) {
    const line = d.match(/L(-?[\d.]+) (-?[\d.]+)/);
    const arc = d.match(/A[\d.]+ [\d.]+ 0 [01] 1 (-?[\d.]+) (-?[\d.]+)/);
    if (!line || !arc) throw new Error(`not a wedge path: ${d}`);
    return [
      [Number(line[1]), Number(line[2])],
      [Number(arc[1]), Number(arc[2])],
    ] as const;
  }

  const onRim = ([x, y]: readonly [number, number]) =>
    Math.hypot(x - PIP_CENTRE, y - PIP_CENTRE);

  it("leaves a single colour alone, which keeps its glyph", () => {
    // One colour is drawn the way it always has been: a disc and a symbol.
    // There is nothing to divide, and a glyph is better than a wedge.
    expect(pipWedges(["u"])).toEqual([]);
    expect(pipWedges([])).toEqual([]);
  });

  it("gives a wedge to each colour, in WUBRG order", () => {
    expect(pipWedges(["g", "u"]).map((w) => w.color)).toEqual(["u", "g"]);
    expect(pipWedges(["r", "w", "b"]).map((w) => w.color)).toEqual([
      "w",
      "b",
      "r",
    ]);
  });

  it("drops duplicates rather than drawing a colour twice", () => {
    expect(pipWedges(["u", "u", "b"]).map((w) => w.color)).toEqual(["u", "b"]);
  });

  it("cuts the whole disc up, with every corner on its rim", () => {
    // A wedge that stops short of the rim leaves a notch in the circle, and
    // one that overshoots spills outside the pip's box.
    for (const count of [2, 3, 4, 5]) {
      const wedges = pipWedges(MANA_COLORS.slice(0, count));
      expect(wedges).toHaveLength(count);
      for (const wedge of wedges) {
        for (const point of pointsOf(wedge.d)) {
          expect(onRim(point)).toBeCloseTo(PIP_RADIUS, 1);
        }
        expect(onRim(wedge.cut)).toBeCloseTo(PIP_RADIUS, 1);
      }
    }
  });

  it("starts every wedge at the centre, so they meet in the middle", () => {
    for (const wedge of pipWedges(["w", "u", "b"])) {
      expect(wedge.d.startsWith(`M${PIP_CENTRE} ${PIP_CENTRE}`)).toBe(true);
    }
  });

  it("divides the circle into equal slices", () => {
    // Measured as the angle each wedge's two rim corners span, which is what
    // "equal" has to mean for the eye.
    const angleOf = ([x, y]: readonly [number, number]) =>
      Math.atan2(y - PIP_CENTRE, x - PIP_CENTRE);
    for (const count of [2, 3, 5]) {
      const expected = (2 * Math.PI) / count;
      for (const wedge of pipWedges(MANA_COLORS.slice(0, count))) {
        const [start, end] = pointsOf(wedge.d);
        let span = angleOf(end) - angleOf(start);
        if (span <= 0) span += 2 * Math.PI;
        expect(span).toBeCloseTo(expected, 2);
      }
    }
  });

  it("takes the long way round only when a slice is more than half", () => {
    // Two colours are exactly half each; anything more is less. An arc that
    // sets the large-arc flag wrongly is drawn inside out.
    for (const wedge of pipWedges(MANA_COLORS.slice(0, 3))) {
      expect(wedge.d).toContain("A12 12 0 0 1");
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
