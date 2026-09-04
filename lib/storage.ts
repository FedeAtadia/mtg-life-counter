import { syncDamageMaps } from "./gameReducer";
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import type { GameState, Player } from "./types";

const STORAGE_KEY = "mtg-life-counter:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parsePlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null;
  const { id, name, life, accent, commanderDamage } = value;
  if (typeof id !== "string" || id.length === 0) return null;
  if (typeof life !== "number" || !Number.isFinite(life)) return null;

  const damage: Record<string, number> = {};
  if (isRecord(commanderDamage)) {
    for (const [key, raw] of Object.entries(commanderDamage)) {
      if (typeof raw === "number" && Number.isFinite(raw)) {
        damage[key] = Math.max(0, Math.round(raw));
      }
    }
  }

  return {
    id,
    name: typeof name === "string" ? name.slice(0, MAX_NAME_LENGTH) : "",
    life: Math.round(life),
    accent: typeof accent === "number" && Number.isFinite(accent) ? accent : 0,
    commanderDamage: damage,
  };
}

/**
 * Validates anything read back from storage before it becomes state. Returns
 * null for absent, corrupt, or older-shaped data so the caller falls back to a
 * fresh game rather than rendering something broken.
 */
export function parseGameState(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1) return null;
  if (value.format !== "standard" && value.format !== "commander") return null;
  if (!Array.isArray(value.players)) return null;

  const players: Player[] = [];
  for (const raw of value.players) {
    const player = parsePlayer(raw);
    if (!player) return null;
    if (players.some((p) => p.id === player.id)) return null;
    players.push(player);
  }
  if (players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) return null;

  return {
    version: 1,
    format: value.format,
    // Drops damage entries for departed players and fills in missing ones.
    players: syncDamageMaps(players),
  };
}

export function loadGame(): GameState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return parseGameState(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private mode / quota exceeded — losing persistence must not break play.
  }
}
