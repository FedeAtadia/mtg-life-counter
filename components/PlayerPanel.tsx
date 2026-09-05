"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import HoldHint from "./HoldHint";
import ManaPip from "./ManaPip";
import { identityOf, trimFor, washFor } from "@/lib/identity";
import { displayName, eliminationReason } from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useHoldSlider } from "@/lib/useHoldSlider";
import type { Rotation } from "@/lib/seatLayout";
import type { Player } from "@/lib/types";

const DELTA_CHIP_MS = 1600;

/**
 * Font sizes track their own box, so every seat scales on its own. The life
 * total measures against the art box rather than the whole card, because the
 * type line above it is no longer free space.
 */
const SIZE = {
  // Type line text measures against the card: the strip's own height comes
  // from this text, so measuring against the strip would be circular and
  // collapse it to nothing.
  name: "min(9.5cqh, 6cqw, 26px)",
  pip: "min(12cqh, 6.5cqw, 28px)",
  out: "min(7cqh, 4.4cqw, 13px)",
  action: "min(7.5cqh, 4.6cqw, 15px)",
  // These live inside the art box, which has a definite height.
  hint: "min(17cqh, 12cqw, 52px)",
  chip: "min(11cqh, 7cqw, 30px)",
};

/**
 * The readout is usually two characters wide but has to survive more ("100", or
 * a thoroughly beaten "-115"). The width allowance follows the number actually
 * on screen so a two player game is not sized for a case it never reaches.
 */
function lifeSizeFor(life: number): string {
  const characters = Math.max(2, String(life).length);
  const widthShare = Math.min(44, Math.round(88 / characters));
  return `min(46cqh, ${widthShare}cqw, 180px)`;
}

const formatDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

interface Props {
  player: Player;
  /** The seat this panel sits in, so a slide knows which way is up for them. */
  rotation: Rotation;
  onToggleDamage: () => void;
}

export default function PlayerPanel({
  player,
  rotation,
  onToggleDamage,
}: Props) {
  const { state, dispatch } = useGame();
  const colors = identityOf(player);
  const trim = trimFor(colors);
  const reason = eliminationReason(player, state.format);
  const showCommanderDamage = state.format === "commander";

  const [recent, setRecent] = useState(0);
  const recentTimer = useRef<number | null>(null);

  const applyLife = useCallback(
    (delta: number) => {
      dispatch({ type: "ADJUST_LIFE", id: player.id, delta });
      setRecent((value) => value + delta);
      if (recentTimer.current !== null) {
        window.clearTimeout(recentTimer.current);
      }
      recentTimer.current = window.setTimeout(
        () => setRecent(0),
        DELTA_CHIP_MS,
      );
    },
    [dispatch, player.id],
  );

  useEffect(
    () => () => {
      if (recentTimer.current !== null) {
        window.clearTimeout(recentTimer.current);
      }
    },
    [],
  );

  // One point per tap; hold for a second and it becomes a slider worth five a
  // notch. Which half you press is the only thing that decides the direction —
  // the slide only ever says how far (HOLD-9).
  const minus = useHoldSlider(rotation, (points) => applyLife(-points));
  const plus = useHoldSlider(rotation, (points) => applyLife(points));

  return (
    <div
      className="no-select relative h-full w-full"
      style={{ containerType: "size" }}
    >
      {/* The card itself: painted, never pressed. The tap zones sit above it. */}
      <div
        className="pointer-events-none absolute inset-0 flex flex-col gap-[1.2cqh] rounded-[3.5cqh] p-[1.6cqh]"
        style={{
          background: "var(--border-black)",
          filter: reason ? "grayscale(0.9) brightness(0.6)" : undefined,
        }}
      >
        <div
          className="pointer-events-none absolute inset-[1.6cqh] rounded-[2cqh]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${trim} 40%, transparent), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.55)`,
          }}
        />

        {/* Type line: name at the far end from the centre hub, pips closing it. */}
        <div
          className="flex shrink-0 items-center gap-[2cqw] rounded-t-[1.4cqh] px-[2.4cqw] py-[1cqh]"
          style={{
            // Kept tight to the leading edge. The name sits at the far end of
            // the strip from the centre hub, which is what keeps the two apart
            // — indenting it pushes it back towards the hub, not away.
            background: `linear-gradient(180deg, color-mix(in oklab, ${trim} 26%, var(--parchment-bg)), var(--parchment-bg))`,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 0 rgba(0,0,0,0.5)",
          }}
        >
          <span
            className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] font-semibold tracking-wide"
            style={{ fontSize: SIZE.name, color: "var(--parchment)" }}
          >
            {displayName(player)}
          </span>
          <span className="flex shrink-0 gap-[0.8cqw]">
            {colors.length === 0 ? (
              <ManaPip color="c" size={SIZE.pip} />
            ) : (
              colors.map((color) => (
                <ManaPip key={color} color={color} size={SIZE.pip} />
              ))
            )}
          </span>
        </div>

        {/* Art box: where the life total lives. */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center gap-[4cqw] overflow-hidden rounded-b-[1.4cqh]"
          style={{
            containerType: "size",
            background: washFor(colors),
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
          }}
        >
          <HoldHint
            sign="minus"
            armed={minus.armed}
            size={SIZE.hint}
            color={`color-mix(in oklab, ${trim} 40%, var(--ink-faint))`}
          />
          <span
            className="tnum font-semibold"
            style={{
              fontSize: lifeSizeFor(player.life),
              lineHeight: 0.92,
              textShadow: "0 2px 10px rgba(0,0,0,0.65)",
            }}
          >
            {player.life}
          </span>
          <HoldHint
            sign="plus"
            armed={plus.armed}
            size={SIZE.hint}
            color={`color-mix(in oklab, ${trim} 40%, var(--ink-faint))`}
          />

          {/* Running tally of the exchange, so a slide shows what it is
              dialling in before the finger lifts (LIFE-4). */}
          <div
            className="tnum absolute right-0 bottom-[6cqh] left-0 text-center font-semibold transition-opacity duration-150"
            style={{
              fontSize: SIZE.chip,
              opacity: recent === 0 ? 0 : 1,
              color: recent < 0 ? "var(--lethal)" : "#6fce93",
            }}
          >
            {formatDelta(recent)}
          </div>
        </div>
      </div>

      {/* Tap zones, above the painted card and below everything interactive. */}
      <button
        type="button"
        aria-label={`${displayName(player)}: lose life. Tap for 1, slide for 5 at a time`}
        className="absolute top-0 left-0 z-10 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...minus.handlers}
      />
      <button
        type="button"
        aria-label={`${displayName(player)}: gain life. Tap for 1, slide for 5 at a time`}
        className="absolute top-0 right-0 z-10 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...plus.handlers}
      />

      {reason && (
        <div
          className="pointer-events-none absolute top-[5.5cqh] left-[3.4cqw] z-20 rounded-full border px-[2.5cqw] py-[1cqh] font-semibold tracking-widest uppercase"
          style={{
            fontSize: SIZE.out,
            borderColor: "color-mix(in oklab, var(--lethal) 60%, transparent)",
            color: "color-mix(in oklab, var(--lethal) 75%, white)",
            background: "rgba(20,8,6,0.85)",
          }}
        >
          Out &middot; {reason}
        </div>
      )}

      {/* The power/toughness box, where a card keeps its numbers in the corner. */}
      {showCommanderDamage && (
        <button
          type="button"
          onClick={onToggleDamage}
          aria-label={`${displayName(player)}: commander damage`}
          className="absolute right-[3.4cqw] bottom-[3cqh] z-20 rounded-[1cqh] px-[2.6cqw] py-[1.4cqh] font-[family-name:var(--font-display)] font-semibold tracking-widest uppercase"
          style={{
            fontSize: SIZE.action,
            color: "var(--parchment)",
            background: "linear-gradient(180deg, #2f2a25, #1c1815)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 3px rgba(0,0,0,0.6)",
          }}
        >
          Cmdr
        </button>
      )}
    </div>
  );
}
