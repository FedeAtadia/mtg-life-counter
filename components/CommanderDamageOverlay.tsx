"use client";

import { identityOf, trimFor, washFor } from "@/lib/identity";
import { LETHAL_COMMANDER_DAMAGE, displayName } from "@/lib/rules";
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
  heading: "min(6.5cqh, 4cqw, 15px)",
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
 * The card's textbox: rules text, in the place a card keeps it. Rendered inside
 * the player's panel so it inherits that seat's rotation.
 */
export default function CommanderDamageOverlay({
  player,
  opponents,
  onClose,
}: Props) {
  const columns = columnsFor(opponents.length);

  return (
    <div
      className="no-select absolute inset-0 z-30 rounded-[3.5cqh]"
      style={{
        containerType: "size",
        background: "linear-gradient(180deg, #211d19, #17140f)",
        boxShadow: "inset 0 0 0 1px var(--metal-dim)",
      }}
    >
      {/* Tapping the backdrop closes too, so there are two ways out. */}
      <button
        type="button"
        aria-label="Close commander damage"
        tabIndex={-1}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div className="relative flex h-full w-full flex-col gap-[1.8cqh] p-[2.6cqh]">
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
