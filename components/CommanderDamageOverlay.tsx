"use client";

import { identityOf, trimFor, washFor } from "@/lib/identity";
import { LETHAL_COMMANDER_DAMAGE, displayName } from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useSteadyHold } from "@/lib/useSteadyHold";
import type { Rotation } from "@/lib/seatLayout";
import type { Player } from "@/lib/types";

/**
 * Chrome is sized against the panel; tile contents are sized against their own
 * tile (see DamageTile). Sizing tile text off the panel is what used to break
 * this at high player counts: the tiles got smaller as opponents were added but
 * their text did not, so five tiles overflowed.
 */
const SIZE = {
  heading: "min(6.5cqh, 4cqw, 20px)",
  done: "min(7cqh, 4.5cqw, 19px)",
};

/** Columns that keep tiles as square as possible in a wide, short panel. */
function columnsFor(opponentCount: number): number {
  if (opponentCount <= 3) return Math.max(1, opponentCount);
  return opponentCount === 4 ? 2 : 3;
}

/**
 * How big the panel is in its own frame, before it is turned.
 *
 * A rotated element keeps its original box, so a panel turned a quarter has to
 * be authored with its width and height swapped — the same trick PlayerSeat
 * uses. Written in viewport units rather than container units because this
 * floats over the whole board rather than sitting in a cell.
 */
function frameFor(rotation: Rotation) {
  const vertical = rotation === 90 || rotation === -90;
  return {
    width: vertical ? "min(90dvh, 42rem)" : "min(92dvw, 42rem)",
    height: vertical ? "min(86dvw, 26rem)" : "min(64dvh, 26rem)",
  };
}

interface Props {
  player: Player;
  opponents: Player[];
  /** The rotation of the seat this belongs to, so it faces its own player. */
  rotation: Rotation;
  onClose: () => void;
}

/**
 * The card's textbox, lifted off the card and laid over the whole board.
 *
 * Entering commander damage is a deliberate, occasional act, so it can have the
 * width of the device rather than the width of one seat — which is most of what
 * makes the counters readable. A life total cannot do this: that has to stay
 * under the thumb, in the seat, all game.
 *
 * It is still turned to face its own player. Centring without rotating would
 * leave it sideways to four seats out of six, costing more legibility than the
 * extra size buys.
 */
export default function CommanderDamageOverlay({
  player,
  opponents,
  rotation,
  onClose,
}: Props) {
  const columns = columnsFor(opponents.length);
  const frame = frameFor(rotation);

  return (
    <div className="no-select fixed inset-0 z-40 flex items-center justify-center overflow-hidden bg-black/75 p-3">
      {/* Tapping the backdrop closes too, so there are two ways out. */}
      <button
        type="button"
        aria-label="Close commander damage"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Commander damage for ${displayName(player)}`}
        className="relative flex shrink-0 flex-col gap-[1.8cqh] rounded-[14px] p-[2.6cqh]"
        style={{
          width: frame.width,
          height: frame.height,
          containerType: "size",
          transform: `rotate(${rotation}deg)`,
          background: "linear-gradient(180deg, #211d19, #17140f)",
          boxShadow:
            "inset 0 0 0 1px var(--metal-dim), 0 18px 50px rgba(0,0,0,0.7)",
        }}
      >
        <span
          className="shrink-0 text-center font-[family-name:var(--font-display)] font-semibold tracking-[0.18em] uppercase"
          style={{ fontSize: SIZE.heading, color: "var(--metal)" }}
        >
          Damage taken from
        </span>

        <div
          className="grid min-h-0 flex-1 gap-[1.6cqh]"
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
          className="flex shrink-0 items-center justify-center rounded-[1.4cqh] font-[family-name:var(--font-display)] font-semibold tracking-[0.16em] uppercase active:brightness-110"
          style={{
            fontSize: SIZE.done,
            // 44px is the smallest comfortable touch target; hold that floor
            // even on the shortest panel rather than letting it scale away.
            minHeight: "max(12cqh, 44px)",
            color: "#1a1611",
            background: "linear-gradient(180deg, var(--parchment), #ab9d80)",
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(0,0,0,0.6)",
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}

/**
 * Each tile is its own size container, so its text scales with the tile it is
 * actually drawn in rather than with the panel behind it. Tiles carry the
 * opponent's own colours, which is how you find someone at a glance.
 */
const TILE = {
  name: "min(22cqh, 15cqw, 34px)",
  value: "min(46cqh, 40cqw, 170px)",
  hint: "min(24cqh, 12cqw, 60px)",
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
  const colors = identityOf(source);
  const trim = trimFor(colors);

  const adjust = (delta: number) =>
    dispatch({
      type: "ADJUST_COMMANDER_DAMAGE",
      targetId,
      sourceId: source.id,
      delta,
    });

  // Same press behaviour as a life total: one per tap, jumps of ten while held.
  const minus = useSteadyHold((points) => adjust(-points));
  const plus = useSteadyHold((points) => adjust(points));

  return (
    <div
      className="relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-[1.4cqh]"
      style={{
        containerType: "size",
        background: washFor(colors),
        boxShadow: lethal
          ? "inset 0 0 0 1px var(--lethal), 0 0 12px rgba(217,69,47,0.25)"
          : `inset 0 0 0 1px color-mix(in oklab, ${trim} 42%, #2b2620)`,
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
          className="max-w-full truncate font-[family-name:var(--font-display)] tracking-wide"
          style={{ fontSize: TILE.name, color: "var(--metal)" }}
        >
          {displayName(source)}
        </span>
        <div className="flex items-baseline gap-[8cqw]">
          <span style={{ fontSize: TILE.hint, color: "#4d463d", lineHeight: 1 }}>
            &minus;
          </span>
          <span
            className="tnum leading-none font-semibold"
            style={{
              fontSize: TILE.value,
              color: lethal ? "var(--lethal)" : undefined,
            }}
          >
            {value}
          </span>
          <span style={{ fontSize: TILE.hint, color: "#4d463d", lineHeight: 1 }}>
            +
          </span>
        </div>
      </div>
    </div>
  );
}
