"use client";

import {
  LETHAL_COMMANDER_DAMAGE,
  accentFor,
  displayName,
} from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useHoldRepeat } from "@/lib/useHoldRepeat";
import type { Player } from "@/lib/types";

const SIZE = {
  heading: "min(7cqh, 4.5cqw, 15px)",
  tileName: "min(6cqh, 4cqw, 14px)",
  tileValue: "min(16cqh, 11cqw, 44px)",
  tileHint: "min(9cqh, 6cqw, 22px)",
};

interface Props {
  player: Player;
  opponents: Player[];
  onClose: () => void;
}

/**
 * Rendered inside the player's panel so it inherits that seat's rotation.
 * One tile per opponent: left half removes damage, right half adds it.
 */
export default function CommanderDamageOverlay({
  player,
  opponents,
  onClose,
}: Props) {
  const columns = opponents.length <= 3 ? opponents.length : 3;

  return (
    <div
      className="no-select absolute inset-0 z-20 flex flex-col gap-[2cqh] rounded-2xl bg-[#0a0a11]/96 p-[3cqh]"
      style={{ containerType: "size" }}
    >
      <div className="flex shrink-0 items-center justify-between">
        <span
          className="font-semibold tracking-widest text-white/50 uppercase"
          style={{ fontSize: SIZE.heading }}
        >
          Damage taken from
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close commander damage"
          className="rounded-full border border-white/15 px-[2.5cqw] py-[1cqh] text-white/70 active:bg-white/10"
          style={{ fontSize: SIZE.heading }}
        >
          Done
        </button>
      </div>

      <div
        className="grid min-h-0 flex-1 gap-[2cqh]"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {opponents.map((opponent) => (
          <DamageTile
            key={opponent.id}
            targetId={player.id}
            source={opponent}
            value={player.commanderDamage[opponent.id] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function DamageTile({
  targetId,
  source,
  value,
}: {
  targetId: string;
  source: Player;
  value: number;
}) {
  const { dispatch } = useGame();
  const lethal = value >= LETHAL_COMMANDER_DAMAGE;
  const accent = accentFor(source);

  const adjust = (delta: number) =>
    dispatch({
      type: "ADJUST_COMMANDER_DAMAGE",
      targetId,
      sourceId: source.id,
      delta,
    });

  const minus = useHoldRepeat(() => adjust(-1));
  const plus = useHoldRepeat(() => adjust(1));

  return (
    <div
      className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border"
      style={{
        borderColor: lethal
          ? "var(--danger)"
          : `color-mix(in oklab, ${accent} 40%, #262633)`,
        background: `linear-gradient(160deg, color-mix(in oklab, ${accent} 18%, #14141d), #101018)`,
      }}
    >
      <button
        type="button"
        aria-label={`Remove commander damage from ${displayName(source)}`}
        className="absolute top-0 left-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...minus}
      />
      <button
        type="button"
        aria-label={`Add commander damage from ${displayName(source)}`}
        className="absolute top-0 right-0 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...plus}
      />

      <div className="pointer-events-none flex flex-col items-center">
        <span
          className="max-w-full truncate px-1 text-white/55"
          style={{ fontSize: SIZE.tileName }}
        >
          {displayName(source)}
        </span>
        <div className="flex items-baseline gap-[6%]">
          <span className="text-white/20" style={{ fontSize: SIZE.tileHint }}>
            &minus;
          </span>
          <span
            className="tnum leading-none font-semibold"
            style={{
              fontSize: SIZE.tileValue,
              color: lethal ? "var(--danger)" : undefined,
            }}
          >
            {value}
          </span>
          <span className="text-white/20" style={{ fontSize: SIZE.tileHint }}>
            +
          </span>
        </div>
      </div>
    </div>
  );
}
