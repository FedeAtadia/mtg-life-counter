"use client";

import { describeThrow } from "@/lib/dice";
import type { Throw } from "@/lib/dice";

/** "Heads", not "heads": it is shown on its own, as a word to read across a table. */
function faceOf(result: Throw): string {
  if (result.kind !== "coin") return String(result.value);
  return result.value === "heads" ? "Heads" : "Tails";
}

/**
 * What a throw landed on, over the whole board, until someone presses it away
 * (ROLL-5).
 *
 * It does not fade on a timer: the table is often mid-argument about what was
 * rolled, and a number that has gone settles nothing.
 *
 * Every other panel in the app belongs to one seat and turns to face it. A
 * throw belongs to nobody, so this shows the face twice — upright for the near
 * edge and turned for the far one, the way a playing card does (ROLL-6). The
 * players down the sides read a very large number a quarter turned, which is
 * the same compromise the board already makes for everything in the middle.
 */
export default function RollResult({
  result,
  onDismiss,
}: {
  result: Throw;
  onDismiss: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Thrown — ${describeThrow(result)}`}
      className="no-select fixed inset-0 z-40 flex flex-col bg-black/80"
    >
      {/* The whole overlay presses it away, faces included: they draw over
          this but let the press through. */}
      <button
        type="button"
        aria-label="Dismiss the throw"
        className="absolute inset-0 cursor-default"
        onClick={onDismiss}
      />
      <Face result={result} rotation={180} hidden />
      <Face result={result} rotation={0} />
    </div>
  );
}

function Face({
  result,
  rotation,
  hidden = false,
}: {
  result: Throw;
  rotation: 0 | 180;
  /** The second copy is for eyes only; a screen reader hears it once. */
  hidden?: boolean;
}) {
  const coin = result.kind === "coin";
  return (
    <div
      data-throw-face
      aria-hidden={hidden || undefined}
      className="pointer-events-none flex flex-1 flex-col items-center justify-center gap-1"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <span className="font-[family-name:var(--font-display)] text-sm font-semibold tracking-[0.3em] text-[var(--metal)] uppercase">
        {coin ? "Coin" : result.kind}
      </span>
      <span
        className="tnum font-[family-name:var(--font-display)] leading-none font-semibold text-[var(--parchment)]"
        style={{
          fontSize: coin ? "min(16vw, 9dvh)" : "min(36vw, 22dvh)",
          textShadow: "0 4px 24px rgba(0,0,0,0.8)",
        }}
      >
        {faceOf(result)}
      </span>
    </div>
  );
}
