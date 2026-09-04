import { syncDamageMaps } from "./gameReducer";
import { MAX_NAME_LENGTH, MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import { STOPPED_TIMER } from "./timer";
import type { GameState, Player, TimerState } from "./types";

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
 * A v1 save has no timer. Rather than discard a game someone is in the middle
 * of, upgrade it and give it a stopped clock — we have no idea when it started,
 * and inventing an elapsed time would be worse than showing 0:00.
 */
function parseTimer(value: unknown): TimerState {
  if (!isRecord(value)) return STOPPED_TIMER;
  const { startedAt, elapsedMs } = value;
  return {
    startedAt:
      typeof startedAt === "number" && Number.isFinite(startedAt)
        ? startedAt
        : null,
    elapsedMs:
      typeof elapsedMs === "number" && Number.isFinite(elapsedMs)
        ? Math.max(0, elapsedMs)
        : 0,
  };
}

/**
 * Validates anything read back from storage before it becomes state. Returns
 * null for absent or corrupt data so the caller falls back to a fresh game
 * rather than rendering something broken. Known older versions are migrated,
 * not rejected — people have games in progress.
 */
export function parseGameState(value: unknown): GameState | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1 && value.version !== 2) return null;
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
    version: 2,
    format: value.format,
    // Drops damage entries for departed players and fills in missing ones.
    players: syncDamageMaps(players),
    timer: parseTimer(value.timer),
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
