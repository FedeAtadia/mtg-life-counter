import { describe, expect, it } from "vitest";
import {
  DICE,
  THROW_KINDS,
  describeThrow,
  flipCoin,
  isThrowKind,
  makeThrow,
  rollDie,
} from "./dice";
import type { Die } from "./dice";

/**
 * A stand-in for Math.random that returns these values in turn.
 *
 * Randomness is a parameter of everything here precisely so that a test can
 * say which face it wants rather than hoping for it.
 */
const fixed = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

/** Just under 1: the largest value Math.random can actually return. */
const TOP = 1 - Number.EPSILON;

describe("what can be thrown (ROLL-1)", () => {
  it("offers the six dice and a coin, in that order", () => {
    expect(THROW_KINDS).toEqual(["d4", "d6", "d8", "d10", "d12", "d20", "coin"]);
  });

  it("gives each die the number of sides its name says", () => {
    for (const die of Object.keys(DICE) as Die[]) {
      expect(DICE[die]).toBe(Number(die.slice(1)));
    }
  });

  it("knows its own kinds, and nothing else", () => {
    // Read back off a DOM attribute when a finger lands on an option, so a
    // stray string must never pass for a die.
    for (const kind of THROW_KINDS) expect(isThrowKind(kind)).toBe(true);
    for (const junk of ["d7", "D20", "", undefined, null]) {
      expect(isThrowKind(junk)).toBe(false);
    }
  });
});

describe("rolling a die (ROLL-4)", () => {
  it.each(Object.entries(DICE))(
    "lands a %s on 1 at the bottom of the range and %i at the top",
    (die, sides) => {
      expect(rollDie(die as Die, fixed(0))).toEqual({ kind: die, value: 1 });
      expect(rollDie(die as Die, fixed(TOP))).toEqual({
        kind: die,
        value: sides,
      });
    },
  );

  it("can land every face of a d20, and each equally often", () => {
    // Twenty evenly spaced draws, one from the middle of each face's slice of
    // [0, 1). Equal slices are what "equally likely" means for a uniform draw.
    const faces = Array.from({ length: 20 }, (_, i) =>
      rollDie("d20", fixed((i + 0.5) / 20)).value,
    );
    expect(faces).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("never lands off the die, even if the random source misbehaves", () => {
    // Math.random is specified never to return 1. Something standing in for
    // it might; a d6 must still not come up 7.
    expect(rollDie("d6", fixed(1)).value).toBe(6);
  });
});

describe("flipping a coin (ROLL-4)", () => {
  it("lands heads on the lower half and tails on the upper", () => {
    expect(flipCoin(fixed(0))).toEqual({ kind: "coin", value: "heads" });
    expect(flipCoin(fixed(0.4999))).toEqual({ kind: "coin", value: "heads" });
    expect(flipCoin(fixed(0.5))).toEqual({ kind: "coin", value: "tails" });
    expect(flipCoin(fixed(TOP))).toEqual({ kind: "coin", value: "tails" });
  });
});

describe("throwing by name", () => {
  it("rolls a die or flips the coin, whichever was picked", () => {
    expect(makeThrow("d12", fixed(0))).toEqual({ kind: "d12", value: 1 });
    expect(makeThrow("coin", fixed(0))).toEqual({ kind: "coin", value: "heads" });
  });

  it("reads Math.random when nothing else is given", () => {
    // The one call site in the app passes nothing. It still has to land on a
    // real face.
    const { value } = makeThrow("d8") as { value: number };
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(1);
    expect(value).toBeLessThanOrEqual(8);
  });
});

describe("saying what was thrown (ROLL-5)", () => {
  it("names the die alongside the face", () => {
    expect(describeThrow({ kind: "d20", value: 17 })).toBe("d20: 17");
    expect(describeThrow({ kind: "coin", value: "tails" })).toBe("Coin: tails");
  });
});
