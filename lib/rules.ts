import type { Format, Player, PlayerId } from "./types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/**
 * 903.10a — a player dealt 21 or more combat damage by a single commander over
 * the course of the game loses, no matter what their life total is.
 */
export const LETHAL_COMMANDER_DAMAGE = 21;

export const MAX_NAME_LENGTH = 16;

/**
 * The most opponents whose damage still fits on the card as a named line each.
 *
 * Past this the readout drops to pips and values (CMDR-14). The number is a
 * measurement, not a preference: at four players a panel is 189 px tall and a
 * line costs 18 of them, which leaves the life total 45 px. A fourth line takes
 * that below what reads across a table.
 */
export const MAX_NAMED_DAMAGE_ROWS = 3;

export type DamageReadoutMode = "rows" | "tiles";

/** How a card draws its damage readout for this many opponents (CMDR-14). */
export function damageReadoutMode(opponents: number): DamageReadoutMode {
  return opponents > MAX_NAMED_DAMAGE_ROWS ? "tiles" : "rows";
}

export function startingLifeFor(format: Format): number {
  return format === "commander" ? 40 : 20;
}

export function formatLabel(format: Format): string {
  return format === "commander" ? "Commander" : "Standard";
}

export function defaultNameFor(id: PlayerId): string {
  const n = Number.parseInt(id.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? `Player ${n}` : "Player";
}

export function displayName(player: Player): string {
  return player.name.trim() || defaultNameFor(player.id);
}

/**
 * Why this player is out of the game, or null if they're still in.
 * Commander damage is only a loss condition in Commander.
 */
export function eliminationReason(
  player: Player,
  format: Format,
): string | null {
  if (player.life <= 0) return "0 life";
  if (format === "commander") {
    const lethal = Object.values(player.commanderDamage).find(
      (d) => d >= LETHAL_COMMANDER_DAMAGE,
    );
    if (lethal !== undefined) return `${lethal} cmdr damage`;
  }
  return null;
}

export function isEliminated(player: Player, format: Format): boolean {
  return eliminationReason(player, format) !== null;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
