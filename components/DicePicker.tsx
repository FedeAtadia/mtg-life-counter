"use client";

import { THROW_KINDS, isThrowKind } from "@/lib/dice";
import type { ThrowKind } from "@/lib/dice";

/**
 * How much room the picker needs above the dice button before it opens there
 * rather than below. Above is preferred: the hub's row sits at or below the
 * middle of the board at every count, and a thumb slides up more easily than
 * it reaches back over itself.
 */
const ROOM_ABOVE_PX = 280;

/** Where the dice button is, so the picker can open beside it. */
export interface Anchor {
  top: number;
  bottom: number;
}

/**
 * Which option, if any, is under a point on the screen (ROLL-2, ROLL-3).
 *
 * Asks the browser rather than working it out from the picker's own geometry,
 * which would have to be kept in step with every change to its layout. What
 * is under a finger is usually an option's label rather than the option, hence
 * the walk up to the nearest one. Null for anything else — the gap between
 * options, the backdrop — and for a browser that cannot say at all.
 */
export function throwKindAt(x: number, y: number): ThrowKind | null {
  if (typeof document.elementFromPoint !== "function") return null;
  const option = document
    .elementFromPoint(x, y)
    ?.closest<HTMLElement>("[data-throw]");
  const kind = option?.dataset.throw;
  return isThrowKind(kind) ? kind : null;
}

const LABEL: Record<ThrowKind, string> = {
  d4: "d4",
  d6: "d6",
  d8: "d8",
  d10: "d10",
  d12: "d12",
  d20: "d20",
  coin: "Coin",
};

/**
 * The six dice and a coin (ROLL-1).
 *
 * Opened by a tap, it is an ordinary panel of buttons. Opened by a hold, the
 * finger that opened it is still down and still captured by the dice button,
 * so it never presses these at all: the button reports where the finger goes,
 * and `armed` is whichever option that is over. Either way the options look
 * and behave the same, so a hold that lifts on nothing leaves exactly the
 * panel a tap would have (ROLL-3).
 */
export default function DicePicker({
  anchor,
  armed,
  onPick,
  onClose,
}: {
  anchor: Anchor;
  armed: ThrowKind | null;
  onPick: (kind: ThrowKind) => void;
  onClose: () => void;
}) {
  const above = anchor.top > ROOM_ABOVE_PX;
  const dice = THROW_KINDS.filter((kind) => kind !== "coin");

  return (
    <div className="no-select fixed inset-0 z-40 bg-black/60">
      <button
        type="button"
        aria-label="Close the dice"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Throw a die"
        className="absolute left-1/2 grid w-[min(92vw,20rem)] grid-cols-3 gap-2 rounded-[14px] p-3"
        style={{
          top: above ? anchor.top - 12 : anchor.bottom + 12,
          transform: above ? "translate(-50%, -100%)" : "translateX(-50%)",
          background: "linear-gradient(180deg, #211d19, #17140f)",
          boxShadow:
            "inset 0 0 0 1px var(--metal-dim), 0 18px 50px rgba(0,0,0,0.7)",
        }}
      >
        {dice.map((kind) => (
          <Option key={kind} kind={kind} armed={armed === kind} onPick={onPick} />
        ))}
        <Option kind="coin" armed={armed === "coin"} onPick={onPick} wide />
      </div>
    </div>
  );
}

function Option({
  kind,
  armed,
  onPick,
  wide = false,
}: {
  kind: ThrowKind;
  armed: boolean;
  onPick: (kind: ThrowKind) => void;
  wide?: boolean;
}) {
  return (
    <button
      type="button"
      data-throw={kind}
      data-armed={armed}
      onClick={() => onPick(kind)}
      className={`flex h-16 items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--parchment)] active:brightness-125 data-[armed=true]:border-[var(--gold)] data-[armed=true]:bg-[var(--parchment-bg)] data-[armed=true]:text-[var(--gold)] ${
        wide ? "col-span-3" : ""
      }`}
    >
      <span>{LABEL[kind]}</span>
    </button>
  );
}
