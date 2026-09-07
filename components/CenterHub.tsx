"use client";

import { formatElapsed, hasStarted, isRunning } from "@/lib/timer";
import { useElapsed } from "@/lib/useElapsed";
import { useGame } from "@/lib/useGame";
import type { Rotation } from "@/lib/seatLayout";

/**
 * How far the Start button sits from the clock, along the hub track.
 *
 * Along it, never across it: the track is only deep enough for one pill, and
 * anything pushed across it is back over somebody's card, which is the whole
 * thing this track exists to stop (SEAT-7). Because the offset is applied in
 * the hub's own frame, one value serves both — it reads as sideways where the
 * band lies across the board and as above where it runs down it.
 *
 * Half the clock plus half the button plus a thumb's width between them.
 */
const START_OFFSET = "-6rem";

/**
 * Settings entry point and game clock, in a band of the board's own between the
 * seats (SEAT-7), with the Start button beside it until the game is under way
 * (TIMER-7).
 *
 * It used to float over the seam on top of whatever was underneath, which on a
 * card with a text box means sitting on somebody's damage. Now the band is a
 * real grid track and nothing overlaps.
 *
 * Both controls are laid in the same grid cell and moved by transform alone, so
 * the clock keeps the exact centre whether or not Start is there (TIMER-9): the
 * control that is present all game is not shifted by the one that leaves after
 * a few seconds.
 *
 * The tick lives here rather than in GameBoard so that a second passing
 * re-renders this pill alone, not all six player panels.
 */
export default function CenterHub({
  onClick,
  rotation,
  gridArea,
}: {
  onClick: () => void;
  rotation: Rotation;
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
    // Both controls are anchored to the centre of this cell and moved by
    // transform alone. Centring them by layout instead does not survive the
    // turned band: the track sizes itself to the widest control, which is wider
    // than a band only deep enough for one pill, so it overflows to one side
    // and takes both controls out over a card with it — the exact thing the
    // band is here to prevent.
    <div className="relative z-30" style={{ gridArea }}>
      {!started && (
        <button
          type="button"
          onClick={() => dispatch({ type: "RESUME_TIMER", at: Date.now() })}
          aria-label="Start the game clock"
          className="absolute top-1/2 left-1/2 flex items-center gap-2 rounded-full border border-[var(--metal)] bg-[var(--parchment-bg)] px-4 py-2 font-[family-name:var(--font-display)] text-[13px] font-semibold tracking-[0.14em] whitespace-nowrap text-[var(--parchment)] uppercase shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:brightness-125"
          style={{
            // Centred on the band, then turned, then moved — so the offset runs
            // along the band as the player reading the button sees it.
            transform: `translate(-50%, -50%) rotate(${rotation}deg) translateX(${START_OFFSET})`,
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
        className="absolute top-1/2 left-1/2 flex items-center gap-1.5 rounded-full border border-[#33334a] bg-[#14141c] py-1.5 pr-3 pl-2.5 text-white/75 shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:bg-[#1d1d28]"
        style={{ transform: `translate(-50%, -50%) rotate(${rotation}deg)` }}
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
    </div>
  );
}
