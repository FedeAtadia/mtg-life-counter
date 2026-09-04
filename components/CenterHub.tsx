"use client";

import { formatElapsed, isRunning } from "@/lib/timer";
import { useElapsed } from "@/lib/useElapsed";
import { useGame } from "@/lib/useGame";

/**
 * Settings entry point and game clock, parked on the seam between panels at
 * dead centre — the one spot that isn't inside anybody's rotated panel.
 *
 * The tick lives here rather than in GameBoard so that a second passing
 * re-renders this pill alone, not all six player panels.
 */
export default function CenterHub({ onClick }: { onClick: () => void }) {
  const { state } = useGame();
  const elapsed = useElapsed(state.timer);
  const running = isRunning(state.timer);

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Game settings. Elapsed ${formatElapsed(elapsed)}${
        running ? "" : ", paused"
      }`}
      className="absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-[#33334a] bg-[#14141c] py-1.5 pr-3 pl-2.5 text-white/75 shadow-[0_2px_12px_rgba(0,0,0,0.6)] active:scale-95 active:bg-[#1d1d28]"
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
  );
}
