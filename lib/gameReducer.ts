import {
  ACCENTS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  clamp,
  startingLifeFor,
} from "./rules";
import type { Action, Format, GameState, Player, PlayerId } from "./types";

/**
 * Ids are deterministic (`p1`, `p2`, ...) rather than random so that the
 * statically prerendered markup and the hydrated client agree.
 */
function nextPlayerId(players: Player[]): PlayerId {
  const used = new Set(players.map((p) => p.id));
  for (let n = 1; ; n++) {
    const id = `p${n}`;
    if (!used.has(id)) return id;
  }
}

function createPlayer(id: PlayerId, life: number): Player {
  const n = Number.parseInt(id.replace(/\D/g, ""), 10) || 1;
  return {
    id,
    name: "",
    life,
    accent: (n - 1) % ACCENTS.length,
    commanderDamage: {},
  };
}

/**
 * Guarantees every player holds exactly one commander-damage entry per
 * opponent — no self entry, no entries for players who have left. Run this
 * after any change to the roster, and on anything read back from storage.
 */
export function syncDamageMaps(players: Player[]): Player[] {
  const ids = players.map((p) => p.id);
  return players.map((player) => {
    const commanderDamage: Record<PlayerId, number> = {};
    for (const id of ids) {
      if (id === player.id) continue;
      const prev = player.commanderDamage?.[id];
      commanderDamage[id] = Number.isFinite(prev) ? Math.max(0, prev) : 0;
    }
    return { ...player, commanderDamage };
  });
}

export function createGame(format: Format, playerCount: number): GameState {
  const count = clamp(Math.round(playerCount), MIN_PLAYERS, MAX_PLAYERS);
  const life = startingLifeFor(format);
  const players: Player[] = [];
  for (let n = 1; n <= count; n++) players.push(createPlayer(`p${n}`, life));
  return { version: 1, format, players: syncDamageMaps(players) };
}

/** Fresh totals, same seats. Used by RESET_GAME and by format changes. */
function resetLife(state: GameState, format: Format): GameState {
  const life = startingLifeFor(format);
  return {
    ...state,
    format,
    players: syncDamageMaps(
      state.players.map((p) => ({ ...p, life, commanderDamage: {} })),
    ),
  };
}

export const initialGameState: GameState = createGame("commander", 4);

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "NEW_GAME":
      return createGame(action.format, action.playerCount);

    case "RESET_GAME":
      return resetLife(state, state.format);

    case "SET_FORMAT":
      if (action.format === state.format) return state;
      return resetLife(state, action.format);

    case "ADD_PLAYER": {
      if (state.players.length >= MAX_PLAYERS) return state;
      const player = createPlayer(
        nextPlayerId(state.players),
        startingLifeFor(state.format),
      );
      return { ...state, players: syncDamageMaps([...state.players, player]) };
    }

    case "REMOVE_PLAYER": {
      if (state.players.length <= MIN_PLAYERS) return state;
      const players = state.players.filter((p) => p.id !== action.id);
      if (players.length === state.players.length) return state;
      return { ...state, players: syncDamageMaps(players) };
    }

    case "ADJUST_LIFE": {
      if (action.delta === 0) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, life: p.life + action.delta } : p,
        ),
      };
    }

    case "ADJUST_COMMANDER_DAMAGE": {
      const { targetId, sourceId, delta } = action;
      if (targetId === sourceId || delta === 0) return state;
      if (!state.players.some((p) => p.id === sourceId)) return state;
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id !== targetId) return player;
          const prev = player.commanderDamage[sourceId] ?? 0;
          const next = Math.max(0, prev + delta);
          // Only the damage that actually landed changes the life total, so a
          // "−" tap on a counter already at 0 is a complete no-op.
          const applied = next - prev;
          if (applied === 0) return player;
          return {
            ...player,
            // Commander damage is real damage.
            life: player.life - applied,
            commanderDamage: { ...player.commanderDamage, [sourceId]: next },
          };
        }),
      };
    }

    case "RENAME_PLAYER": {
      const name = action.name.slice(0, MAX_NAME_LENGTH);
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, name } : p,
        ),
      };
    }

    default:
      return state;
  }
}
