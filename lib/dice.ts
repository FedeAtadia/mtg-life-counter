/**
 * Dice and a coin (ROLL).
 *
 * The only randomness in the app, and kept to the edge of it. Everything here
 * takes its random source as an argument, so a test can say which face it
 * wants, and the one call site reads it in an event handler — never while
 * rendering, where the static export and the hydrated board would each draw a
 * different number and disagree (ROLL-8, PLAT-3). None of it touches the
 * reducer: a throw is not a game rule and changes nothing in the game (ROLL-7).
 */

/** The dice on offer, by name, and how many sides each has. */
export const DICE = { d4: 4, d6: 6, d8: 8, d10: 10, d12: 12, d20: 20 } as const;

export type Die = keyof typeof DICE;
export type ThrowKind = Die | "coin";

/** Everything the picker offers, in the order it offers them (ROLL-1). */
export const THROW_KINDS: readonly ThrowKind[] = [
  "d4",
  "d6",
  "d8",
  "d10",
  "d12",
  "d20",
  "coin",
];

export type Throw =
  | { kind: Die; value: number }
  | { kind: "coin"; value: "heads" | "tails" };

/** A draw in [0, 1), in the shape of Math.random. */
export type RandomSource = () => number;

/** For a kind read back off the page, where it arrives as any old string. */
export function isThrowKind(value: unknown): value is ThrowKind {
  return (
    typeof value === "string" &&
    (THROW_KINDS as readonly string[]).includes(value)
  );
}

/**
 * A whole number from 1 to the die's sides, each equally likely (ROLL-4).
 *
 * Clamped at the top because a stand-in for Math.random is not bound by its
 * promise never to return 1, and a d6 must not come up 7 because of it.
 */
export function rollDie(die: Die, random: RandomSource = Math.random): Throw {
  const sides = DICE[die];
  return { kind: die, value: Math.min(sides, 1 + Math.floor(random() * sides)) };
}

/** Heads on the lower half of the draw, tails on the upper (ROLL-4). */
export function flipCoin(random: RandomSource = Math.random): Throw {
  return { kind: "coin", value: random() < 0.5 ? "heads" : "tails" };
}

export function makeThrow(
  kind: ThrowKind,
  random: RandomSource = Math.random,
): Throw {
  return kind === "coin" ? flipCoin(random) : rollDie(kind, random);
}

/** The name of what was thrown and where it landed, e.g. "d20: 17" (ROLL-5). */
export function describeThrow(result: Throw): string {
  return result.kind === "coin"
    ? `Coin: ${result.value}`
    : `${result.kind}: ${result.value}`;
}
