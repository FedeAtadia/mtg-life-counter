"use client";

import DiceButton from "./DiceButton";
import { formatElapsed, hasStarted, isRunning } from "@/lib/timer";
import { useElapsed } from "@/lib/useElapsed";
import { useGame } from "@/lib/useGame";

/**
 * Settings entry point and game clock, in a row of the board's own across its
 * full width (SEAT-7), with the Start button beside the clock until the game is
 * under way (TIMER-7).
 *
 * The row is three columns: two equal sides and the clock between them. Equal
 * sides are what put the clock at the exact centre of the board whatever the
 * sides are holding (TIMER-9) — Start leaving, or anything else arriving, never
 * moves it. The side cells always render, even empty, so the clock is always
 * the middle one.
 *
 * This used to be done with transforms off a shared centre point, because the
 * hub turned a quarter at five and six players and a turned track sized itself
 * to its widest control and spilled over a card. It is never turned now
 * (SEAT-3, retired), and in a row that runs the width of the board layout does
 * the job without the arithmetic.
 *
 * The tick lives here rather than in GameBoard so that a second passing
 * re-renders this pill alone, not all six player panels.
 */
/**
 * The round buttons at the clock's far side.
 *
 * 40px, which is under the 44px the rest of the app holds as a floor — but the
 * row is only 44px deep, and these are already the tallest things in it (the
 * clock is 28px, Start 38px). Deepening the row to clear 44px would take height
 * off every card for the whole game.
 */
const ROUND_BUTTON =
  "flex size-10 shrink-0 items-center justify-center rounded-full border border-[#33334a] bg-[#14141c] text-white/75 shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:bg-[#1d1d28]";

export default function CenterHub({
  onClick,
  onReset,
  gridArea,
}: {
  onClick: () => void;
  /** Asks for a reset; the board's panel confirms it (RESET-1, RESET-5). */
  onReset: () => void;
  gridArea: string;
}) {
  const { state, dispatch } = useGame();
  const elapsed = useElapsed(state.timer);
  const running = isRunning(state.timer);
  const started = hasStarted(state.timer);

  // A stopped clock reads 0:00 whether it is paused or has never run, and only
  // one of those has time on it to come back to.
  const clockNote = running ? "" : started ? ", paused" : ", not started";

  return (
    <div
      className="grid min-w-0 items-center gap-2 px-1"
      style={{ gridArea, gridTemplateColumns: "1fr auto 1fr" }}
    >
      <div className="flex min-w-0 justify-end">
        {!started && (
          <button
            type="button"
            onClick={() => dispatch({ type: "RESUME_TIMER", at: Date.now() })}
            aria-label="Start the game clock"
            className="flex items-center gap-2 rounded-full border border-[var(--metal)] bg-[var(--parchment-bg)] px-4 py-2 font-[family-name:var(--font-display)] text-[13px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--parchment)] uppercase shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:brightness-125"
          >
            <svg
              width="11"
              height="13"
              viewBox="0 0 11 13"
              fill="currentColor"
              className="shrink-0"
              aria-hidden="true"
            >
              <path d="M1 1.1v10.8a.6.6 0 0 0 .92.5l8.4-5.4a.6.6 0 0 0 0-1L1.92.6A.6.6 0 0 0 1 1.1Z" />
            </svg>
            Start
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={onClick}
        aria-label={`Game settings. Elapsed ${formatElapsed(
          elapsed,
        )}${clockNote}`}
        className="flex items-center gap-1.5 rounded-full border border-[#33334a] bg-[#14141c] py-1.5 pr-3 pl-2.5 text-white/75 shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:bg-[#1d1d28]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 opacity-70"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v.09a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>

        <span
          className="tnum text-sm leading-none font-semibold"
          style={{ opacity: running ? 1 : 0.45 }}
        >
          {formatElapsed(elapsed)}
        </span>
      </button>

      <div className="flex min-w-0 justify-start gap-2">
        <DiceButton className={ROUND_BUTTON} />
        <button
          type="button"
          onClick={onReset}
          aria-label="Reset the game"
          className={ROUND_BUTTON}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </svg>
        </button>
      </div>
    </div>
  );
}
