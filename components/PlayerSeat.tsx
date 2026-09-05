"use client";

import PlayerPanel from "./PlayerPanel";
import type { Seat } from "@/lib/seatLayout";
import type { Player } from "@/lib/types";

interface Props {
  seat: Seat;
  player: Player;
  damageOpen: boolean;
  onToggleDamage: () => void;
}

/**
 * A grid cell that rotates its panel to face the player sitting on that edge.
 *
 * A rotated element keeps its original box, so a panel turned 90 degrees has to
 * be authored with its width and height swapped. `container-type: size` on the
 * cell lets the panel take the cell's height as its width (`100cqh`) and vice
 * versa, entirely in CSS — no measuring, no resize observers.
 */
export default function PlayerSeat({
  seat,
  player,
  damageOpen,
  onToggleDamage,
}: Props) {
  const vertical = seat.rotation === 90 || seat.rotation === -90;

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      style={{ gridArea: seat.gridArea, containerType: "size" }}
    >
      <div
        className="absolute top-1/2 left-1/2"
        style={{
          width: vertical ? "100cqh" : "100cqw",
          height: vertical ? "100cqw" : "100cqh",
          transform: `translate(-50%, -50%) rotate(${seat.rotation}deg)`,
        }}
      >
        <PlayerPanel
          player={player}
          damageOpen={damageOpen}
          onToggleDamage={onToggleDamage}
        />
      </div>
    </div>
  );
}
