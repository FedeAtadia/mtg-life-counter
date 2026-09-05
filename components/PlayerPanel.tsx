"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CommanderDamageOverlay from "./CommanderDamageOverlay";
import { accentFor, displayName, eliminationReason } from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useSteadyHold } from "@/lib/useSteadyHold";
import type { Player } from "@/lib/types";

const DELTA_CHIP_MS = 1600;

/**
 * Font sizes track the panel's own box, so every seat scales on its own.
 *
 * The caps are deliberately high. A two player game gives each panel roughly
 * half the phone, and a low ceiling there wastes it — this is a number meant to
 * be read from across a table. The width coefficients leave room for three
 * digits plus both hints on the same line, which is the widest the readout ever
 * gets (a negative total, or triple figures).
 */
const SIZE = {
  name: "min(10cqh, 6cqw, 28px)",
  hint: "min(17cqh, 12cqw, 52px)",
  chip: "min(10cqh, 7cqw, 30px)",
  action: "min(7cqh, 4.5cqw, 16px)",
};

/**
 * The readout is usually two characters wide but has to survive more ("100", or
 * "-15", or a thoroughly beaten "-115"). Sizing every panel for the worst case
 * left a two player game's number at barely a third of its panel, so the width
 * allowance follows the number actually on screen while the height allowance
 * stays put — wider values simply get a smaller share of the width.
 */
function lifeSizeFor(life: number): string {
  const characters = Math.max(2, String(life).length);
  const widthShare = Math.min(44, Math.round(88 / characters));
  return `min(38cqh, ${widthShare}cqw, 180px)`;
}

const formatDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

interface Props {
  player: Player;
  damageOpen: boolean;
  onToggleDamage: () => void;
}

export default function PlayerPanel({
  player,
  damageOpen,
  onToggleDamage,
}: Props) {
  const { state, dispatch } = useGame();
  const accent = accentFor(player);
  const opponents = state.players.filter((p) => p.id !== player.id);
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

  // One point per tap, then a steady climb while held. Which half you press is
  // the only thing that decides the direction.
  const minus = useSteadyHold((points) => applyLife(-points));
  const plus = useSteadyHold((points) => applyLife(points));

  return (
    <div
      className="no-select relative h-full w-full overflow-hidden rounded-2xl border"
      style={{
        containerType: "size",
        borderColor: reason
          ? "#26262f"
          : `color-mix(in oklab, ${accent} 32%, #24242f)`,
      }}
    >
      {/* Painted separately from the controls so an eliminated player can still
          be corrected — only the backdrop and readout dim. */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(155deg, color-mix(in oklab, ${accent} 26%, #14141d), #0d0d14 78%)`,
          filter: reason ? "grayscale(0.9) brightness(0.55)" : undefined,
        }}
      />

      {/* Tap zones sit underneath the readout, which is pointer-events-none. */}
      <button
        type="button"
        aria-label={`${displayName(player)}: lose life. Tap for 1, hold to keep counting`}
        className="absolute top-0 left-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...minus}
      />
      <button
        type="button"
        aria-label={`${displayName(player)}: gain life. Tap for 1, hold to keep counting`}
        className="absolute top-0 right-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...plus}
      />

      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: reason ? 0.55 : 1 }}
      >
        <div
          className="absolute top-0 w-full truncate px-3 text-center font-medium tracking-wide text-white/55"
          style={{
            fontSize: SIZE.name,
            // The floor keeps the name clear of the centre hub on small panels:
            // with five or six players the hub sits on the seam these names run
            // along, and 3cqh alone put them right under it.
            paddingTop: "max(3cqh, 16px)",
          }}
        >
          {displayName(player)}
        </div>

        <div className="flex items-center gap-[4cqw]">
          <span className="text-white/25" style={{ fontSize: SIZE.hint }}>
            &minus;
          </span>
          <span
            className="tnum leading-none font-semibold"
            style={{ fontSize: lifeSizeFor(player.life) }}
          >
            {player.life}
          </span>
          <span className="text-white/25" style={{ fontSize: SIZE.hint }}>
            +
          </span>
        </div>

        {/* Running tally of the current press, so you can see what a hold has
            actually done to you. Fades once you stop. */}
        <div
          className="tnum absolute right-0 bottom-[13cqh] left-0 text-center font-semibold transition-opacity duration-150"
          style={{
            fontSize: SIZE.chip,
            opacity: recent === 0 ? 0 : 1,
            color: recent < 0 ? "var(--danger)" : "#5fcf8a",
          }}
        >
          {formatDelta(recent)}
        </div>
      </div>

      {reason && (
        <div
          className="pointer-events-none absolute top-[3cqh] left-[3cqw] rounded-full border px-[2.5cqw] py-[1cqh] font-semibold tracking-widest uppercase"
          style={{
            fontSize: SIZE.action,
            borderColor: "color-mix(in oklab, var(--danger) 55%, transparent)",
            color: "color-mix(in oklab, var(--danger) 80%, white)",
          }}
        >
          Out &middot; {reason}
        </div>
      )}

      {showCommanderDamage && (
        <button
          type="button"
          onClick={onToggleDamage}
          className="absolute bottom-[3cqh] left-1/2 -translate-x-1/2 rounded-full border border-white/15 bg-black/35 px-[3cqw] py-[1.5cqh] font-medium tracking-wide text-white/70 uppercase active:bg-black/60"
          style={{ fontSize: SIZE.action }}
        >
          Cmdr damage
        </button>
      )}

      {showCommanderDamage && damageOpen && (
        <CommanderDamageOverlay
          player={player}
          opponents={opponents}
          onClose={onToggleDamage}
        />
      )}
    </div>
  );
}
