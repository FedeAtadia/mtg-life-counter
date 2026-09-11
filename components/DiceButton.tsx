"use client";

import { useRef, useState } from "react";
import DicePicker, { throwKindAt } from "./DicePicker";
import type { Anchor } from "./DicePicker";
import RollResult from "./RollResult";
import { makeThrow } from "@/lib/dice";
import type { Throw, ThrowKind } from "@/lib/dice";
import { useLongPress } from "@/lib/useLongPress";

/**
 * The dice, from the hub's row (ROLL).
 *
 * Everything about a throw lives here — whether the picker is up, which option
 * a finger is over, what the last throw landed on — and none of it reaches the
 * game: a throw changes nothing and is not saved (ROLL-7). It lives in React
 * state and goes with the tab.
 *
 * The one random draw happens in `throwIt`, from an event, never while
 * rendering (ROLL-8).
 */
export default function DiceButton({ className }: { className: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const [picker, setPicker] = useState<Anchor | null>(null);
  const [armed, setArmed] = useState<ThrowKind | null>(null);
  const [result, setResult] = useState<Throw | null>(null);

  const openPicker = () => {
    const rect = button.current?.getBoundingClientRect();
    setArmed(null);
    setPicker({ top: rect?.top ?? 0, bottom: rect?.bottom ?? 0 });
  };

  const throwIt = (kind: ThrowKind) => {
    setPicker(null);
    setArmed(null);
    setResult(makeThrow(kind));
  };

  const press = useLongPress({
    onTap: openPicker,
    // Up under the finger while it is still down, so it can slide on (ROLL-2).
    onLongPress: openPicker,
    onDrag: ({ x, y }) => setArmed(throwKindAt(x, y)),
    onRelease: (at) => {
      const kind = at && throwKindAt(at.x, at.y);
      // Lifting on nothing leaves the picker up, as a tap would (ROLL-3).
      if (kind) throwIt(kind);
      else setArmed(null);
    },
  });

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Throw a die or flip a coin"
        className={className}
        style={{ touchAction: "none" }}
        {...press.handlers}
      >
        {/* A d6 showing three. */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="4" />
          <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="16" cy="16" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </button>

      {picker && (
        <DicePicker
          anchor={picker}
          armed={armed}
          onPick={throwIt}
          onClose={() => setPicker(null)}
        />
      )}

      {result && (
        <RollResult result={result} onDismiss={() => setResult(null)} />
      )}
    </>
  );
}
