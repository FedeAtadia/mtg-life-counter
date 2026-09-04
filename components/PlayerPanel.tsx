"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import CommanderDamageOverlay from "./CommanderDamageOverlay";
import { accentFor, displayName, eliminationReason } from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useHoldRepeat } from "@/lib/useHoldRepeat";
import type { Player } from "@/lib/types";

const DELTA_CHIP_MS = 1600;

/** Font sizes track the panel's own box, so every seat scales on its own. */
const SIZE = {
  name: "min(9cqh, 6cqw, 22px)",
  life: "min(34cqh, 42cqw, 150px)",
  hint: "min(14cqh, 9cqw, 40px)",
  chip: "min(8cqh, 6cqw, 20px)",
  action: "min(7cqh, 4.5cqw, 15px)",
};

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

  const bump = useCallback(
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

  const minus = useHoldRepeat(() => bump(-1));
  const plus = useHoldRepeat(() => bump(1));

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
        aria-label={`${displayName(player)}: lose 1 life`}
        className="absolute top-0 left-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...minus}
      />
      <button
        type="button"
        aria-label={`${displayName(player)}: gain 1 life`}
        className="absolute top-0 right-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...plus}
      />

      <div
        className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
        style={{ opacity: reason ? 0.55 : 1 }}
      >
        <div
          className="absolute top-0 w-full truncate px-3 pt-[3cqh] text-center font-medium tracking-wide text-white/55"
          style={{ fontSize: SIZE.name }}
        >
          {displayName(player)}
        </div>

        <div className="flex items-center gap-[4cqw]">
          <span className="text-white/25" style={{ fontSize: SIZE.hint }}>
            &minus;
          </span>
          <span
            className="tnum leading-none font-semibold"
            style={{ fontSize: SIZE.life }}
          >
            {player.life}
          </span>
          <span className="text-white/25" style={{ fontSize: SIZE.hint }}>
            +
          </span>
        </div>

        <div
          className="tnum absolute right-0 bottom-[14cqh] left-0 text-center font-semibold transition-opacity duration-200"
          style={{
            fontSize: SIZE.chip,
            opacity: recent === 0 ? 0 : 1,
            color: recent < 0 ? "var(--danger)" : "#5fcf8a",
          }}
        >
          {recent > 0 ? `+${recent}` : recent}
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
