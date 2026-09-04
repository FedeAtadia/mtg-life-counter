import type { Format, Player, PlayerId } from "./types";

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

/**
 * 903.10a — a player dealt 21 or more combat damage by a single commander over
 * the course of the game loses, no matter what their life total is.
 */
export const LETHAL_COMMANDER_DAMAGE = 21;

export const MAX_NAME_LENGTH = 16;

export const ACCENTS = [
  { name: "White", hex: "#d8d0b4" },
  { name: "Blue", hex: "#2f7fc4" },
  { name: "Black", hex: "#7a7a8c" },
  { name: "Red", hex: "#c9432c" },
  { name: "Green", hex: "#3d8f5c" },
  { name: "Gold", hex: "#c9a227" },
] as const;

export function startingLifeFor(format: Format): number {
  return format === "commander" ? 40 : 20;
}

export function formatLabel(format: Format): string {
  return format === "commander" ? "Commander" : "Standard";
}

export function accentFor(player: Player): string {
  return ACCENTS[player.accent % ACCENTS.length].hex;
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
