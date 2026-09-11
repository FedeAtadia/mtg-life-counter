"use client";

import { startingLifeFor } from "@/lib/rules";
import type { Format } from "@/lib/types";

/**
 * What a reset is about to do, in the format being played (RESET-1, RESET-2).
 *
 * Commander damage is named only where there is any to clear, so the sentence
 * never promises to wipe something the game does not have.
 */
function consequenceFor(format: Format): string {
  const life = startingLifeFor(format);
  return format === "commander"
    ? `Every life total goes back to ${life}, commander damage is cleared, and the clock goes back to zero.`
    : `Every life total goes back to ${life} and the clock goes back to zero.`;
}

/**
 * The one place a reset is confirmed, whichever button asked for it (RESET-5).
 *
 * A panel rather than the two-tap arm settings used to have: the hub's reset is
 * a small round button on a phone six people are reaching across, and a second
 * tap on the same small button is easy to land by accident. Here the answer is
 * a separate, full-size button that says what it does.
 *
 * It stacks above the settings sheet, so a reset started from settings can be
 * cancelled back into it (RESET-4). It reads upright: the hub belongs to the
 * table rather than to one seat, and so does starting over.
 */
export default function ConfirmReset({
  format,
  onReset,
  onCancel,
}: {
  format: Format;
  onReset: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="no-select fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      {/* Missing the panel is never the same as agreeing to it. */}
      <button
        type="button"
        aria-label="Cancel the reset"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onCancel}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reset the game?"
        className="relative flex w-full max-w-xs flex-col gap-4 rounded-[14px] p-5"
        style={{
          background: "linear-gradient(180deg, #211d19, #17140f)",
          boxShadow:
            "inset 0 0 0 1px var(--metal-dim), 0 18px 50px rgba(0,0,0,0.7)",
        }}
      >
        <h2 className="text-center font-[family-name:var(--font-display)] text-lg font-semibold tracking-[0.12em] text-[var(--parchment)] uppercase">
          Reset the game?
        </h2>

        <p className="text-center text-sm leading-snug text-[var(--muted)]">
          {consequenceFor(format)} Names, seats and colours stay.
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] font-semibold text-white/80 active:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onReset}
            className="min-h-11 flex-1 rounded-xl border border-[var(--danger)] bg-[var(--danger)]/25 font-semibold text-white active:bg-[var(--danger)]/40"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
