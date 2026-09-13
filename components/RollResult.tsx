"use client";

import DieShape from "./DieShape";
import { describeThrow } from "@/lib/dice";
import type { Throw } from "@/lib/dice";

/** "Heads", not "heads": it is shown on its own, as a word to read across a table. */
function faceOf(result: Throw): string {
  if (result.kind !== "coin") return String(result.value);
  return result.value === "heads" ? "Heads" : "Tails";
}

/**
 * The die, as big as the middle of the board will take.
 *
 * Held to the shorter axis as well as the width, so a short screen does not
 * get a die taller than the board it is thrown onto.
 */
const DIE = "min(72vw, 42dvh)";

/**
 * What a throw landed on: one die, in the middle of the board, until someone
 * presses it away (ROLL-5, ROLL-10).
 *
 * It does not fade on a timer — the table is often mid-argument about what was
 * rolled, and a number that has gone settles nothing.
 *
 * Drawn once rather than at both ends. It used to be drawn twice, upright for
 * the near edge and turned for the far one, on the grounds that a throw belongs
 * to no one seat (ROLL-6, retired); but a die on a table has one face up, and
 * two of them read as two throws. The far side reads this upside down, as they
 * would a real die.
 *
 * The board stays visible behind it, which is the other half of the same idea:
 * a throw is something that happened on the table, not another screen.
 */
export default function RollResult({
  result,
  onDismiss,
}: {
  result: Throw;
  onDismiss: () => void;
}) {
  const coin = result.kind === "coin";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thrown — ${describeThrow(result)}`}
      className="no-select fixed inset-0 z-40 grid place-items-center bg-black/60"
    >
      {/* The whole overlay presses it away, the die included: it draws over
          this but lets the press through. */}
      <button
        type="button"
        aria-label="Dismiss the throw"
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
      />

      <div
        data-throw-die={result.kind}
        className={`throw-die pointer-events-none relative grid place-items-center ${
          coin ? "throw-die-coin" : ""
        }`}
        style={{
          width: DIE,
          height: DIE,
          filter: "drop-shadow(0 14px 30px rgba(0,0,0,0.75))",
        }}
      >
        <DieShape
          kind={result.kind}
          className="absolute inset-0 size-full text-[var(--metal)]"
          strokeWidth={1.1}
          fill="#17130f"
        />

        {/* Counter-turned against the tumble, so it lands upright (ROLL-11). */}
        <span
          className={`throw-steady tnum relative font-[family-name:var(--font-display)] leading-none font-bold text-[var(--parchment)] ${
            // A triangle's middle is not its centre: the number sits where the
            // area is, and has less room to sit in.
            result.kind === "d4" ? "translate-y-[12%]" : ""
          }`}
          style={{
            fontSize: coin ? "min(11vw, 6.5dvh)" : "min(26vw, 15dvh)",
            letterSpacing: coin ? "0.06em" : undefined,
            textTransform: coin ? "uppercase" : undefined,
          }}
        >
          {faceOf(result)}
        </span>

        <span
          className="absolute -bottom-[9%] left-0 w-full text-center font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.3em] text-[var(--metal)] uppercase"
          aria-hidden="true"
        >
          {coin ? "Coin" : result.kind}
        </span>
      </div>
    </div>
  );
}
