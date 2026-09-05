"use client";

import { formatElapsed, hasStarted, isRunning } from "@/lib/timer";
import { useElapsed } from "@/lib/useElapsed";
import { useGame } from "@/lib/useGame";
import type { Rotation } from "@/lib/seatLayout";

/**
 * How far the Start button sits from the hub, along the hub's own up axis: far
 * enough that neither pill is under a thumb aimed at the other, and no further,
 * because everything past the centre seam is somebody's panel.
 */
const START_OFFSET = "-2.9rem";

/**
 * Settings entry point and game clock, parked on the seam between panels at
 * dead centre — the one spot that isn't inside anybody's rotated panel — with
 * the Start button above it until the game is under way (TIMER-7).
 *
 * The two are separate elements rather than a stacked pair inside one box, so
 * that the hub does not jump to a new spot the moment Start goes away.
 *
 * The tick lives here rather than in GameBoard so that a second passing
 * re-renders this pill alone, not all six player panels.
 */
export default function CenterHub({
  onClick,
  rotation,
}: {
  onClick: () => void;
  rotation: Rotation;
}) {
  const { state, dispatch } = useGame();
  const elapsed = useElapsed(state.timer);
  const running = isRunning(state.timer);
  const started = hasStarted(state.timer);

  // A stopped clock reads 0:00 whether it is paused or has never run, and only
  // one of those has time on it to come back to.
  const clockNote = running ? "" : started ? ", paused" : ", not started";

  return (
    <>
      {!started && (
        <button
          type="button"
          onClick={() => dispatch({ type: "RESUME_TIMER", at: Date.now() })}
          aria-label="Start the game clock"
          className="absolute top-1/2 left-1/2 z-30 flex items-center gap-2 rounded-full border border-[var(--metal)] bg-[var(--parchment-bg)] px-4 py-2 font-[family-name:var(--font-display)] text-[13px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--parchment)] uppercase shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:brightness-125"
          style={{
            // The offset is applied first, in the button's own frame, so it
            // lands above the hub as the player reading it sees "above".
            transform: `translate(-50%, -50%) rotate(${rotation}deg) translateY(${START_OFFSET})`,
          }}
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

      <button
        type="button"
        onClick={onClick}
        aria-label={`Game settings. Elapsed ${formatElapsed(
          elapsed,
        )}${clockNote}`}
        className="absolute top-1/2 left-1/2 z-30 flex items-center gap-1.5 rounded-full border border-[#33334a] bg-[#14141c] py-1.5 pr-3 pl-2.5 text-white/75 shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:bg-[#1d1d28]"
        style={{
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        }}
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
    </>
  );
}
