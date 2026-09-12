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
 * The most opponents whose damage still fits on a card as a named line each.
 *
 * A measurement, not a preference: a line costs about 18px of card, and a
 * fourth one takes the life total below what reads across a table.
 */
export const MAX_NAMED_DAMAGE_ROWS = 3;

export type DamageReadoutMode = "rows" | "tiles";

/**
 * How a card draws its damage readout (CMDR-14).
 *
 * Named lines need height, and which cards have any depends on the seat rather
 * than on the player count. A quarter-turned seat takes its height, as its
 * player reads it, from half the board's width — about 192px at every count —
 * so lines there cost it more than twice what the strip costs, out of the life
 * total. Counting opponents alone is what gave a four-player board a smaller
 * life total than a six-player one.
 *
 * The opponent cap still applies to upright seats, or the near-edge seat at
 * five players would try to draw four lines in a 232px panel.
 */
export function damageReadoutMode(
  opponents: number,
  turned: boolean,
): DamageReadoutMode {
  if (turned) return "tiles";
  return opponents > MAX_NAMED_DAMAGE_ROWS ? "tiles" : "rows";
}

/**
 * How big the named lines are drawn, given how many share the card (CMDR-17).
 *
 * A lone line has room the third of three has not. Two and three are left
 * alone: the only card that draws two is the near-edge seat at three players,
 * and growing its rows costs it life total for nothing.
 */
export function namedRowScale(rows: number): "lone" | "shared" {
  return rows <= 1 ? "lone" : "shared";
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
