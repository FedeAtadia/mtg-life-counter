"use client";

import {
  LETHAL_COMMANDER_DAMAGE,
  accentFor,
  displayName,
} from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useSteadyHold } from "@/lib/useSteadyHold";
import type { Player } from "@/lib/types";

/**
 * Chrome is sized against the overlay; tile contents are sized against their
 * own tile (see DamageTile). Sizing tile text off the overlay is what used to
 * break this at high player counts: the tiles got smaller as opponents were
 * added but their text did not, so five tiles overflowed.
 */
const SIZE = {
  heading: "min(6.5cqh, 4cqw, 14px)",
  done: "min(7cqh, 4.5cqw, 16px)",
};

/** Columns that keep tiles as square as possible in a wide, short panel. */
function columnsFor(opponentCount: number): number {
  if (opponentCount <= 3) return Math.max(1, opponentCount);
  return opponentCount === 4 ? 2 : 3;
}

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
  const columns = columnsFor(opponents.length);

  return (
    <div
      // Fully opaque: at 96% the panel's own name and eliminated badge ghosted
      // through and collided with the heading.
      className="no-select absolute inset-0 z-20 rounded-2xl bg-[#0a0a11]"
      style={{ containerType: "size" }}
    >
      {/* Tapping the backdrop closes too, so there are two ways out. */}
      <button
        type="button"
        aria-label="Close commander damage"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full flex-col gap-[2cqh] p-[3cqh]">
        <span
          className="shrink-0 text-center font-semibold tracking-widest text-white/45 uppercase"
          style={{ fontSize: SIZE.heading }}
        >
          Damage taken from
        </span>

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

        {/* Its own full-width row rather than a corner pill: at six players the
            corner version was a ~13px target, which is not tappable. */}
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl bg-white/90 py-[3cqh] font-semibold tracking-wide text-[#0a0a11] uppercase active:bg-white"
          // 44px is the smallest comfortable touch target; hold that floor even
          // on the shortest panel rather than letting it scale away.
          style={{ fontSize: SIZE.done, minHeight: "max(12cqh, 44px)" }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/**
 * Each tile is its own size container, so its text scales with the tile it is
 * actually drawn in rather than with the panel behind it.
 */
/**
 * Weighted towards width on purpose. Tiles come out wide and short at high
 * player counts (roughly 85x57 at six on a 390px phone), so sizing mostly off
 * height starves the text — that is what left the opponent names at 8px.
 *
 * The caps are set for the other extreme. A two player game gives the single
 * tile most of the panel, and low ceilings there stranded a 44px number in a
 * 355x303 box.
 */
const TILE = {
  name: "min(26cqh, 16cqw, 40px)",
  value: "min(44cqh, 38cqw, 150px)",
  hint: "min(24cqh, 12cqw, 56px)",
};

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

  // Same press behaviour as a life total: one per tap, steady while held.
  const minus = useSteadyHold((points) => adjust(-points));
  const plus = useSteadyHold((points) => adjust(points));

  return (
    <div
      className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-xl border"
      style={{
        containerType: "size",
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

      <div className="pointer-events-none flex w-full flex-col items-center px-[4cqw]">
        <span
          className="max-w-full truncate text-white/55"
          style={{ fontSize: TILE.name }}
        >
          {displayName(source)}
        </span>
        <div className="flex items-baseline gap-[8cqw]">
          <span className="text-white/20" style={{ fontSize: TILE.hint }}>
            &minus;
          </span>
          <span
            className="tnum leading-none font-semibold"
            style={{
              fontSize: TILE.value,
              color: lethal ? "var(--danger)" : undefined,
            }}
          >
            {value}
          </span>
          <span className="text-white/20" style={{ fontSize: TILE.hint }}>
            +
          </span>
        </div>
      </div>
    </div>
  );
}
