import { defaultColorsForSeat, normalizeColors } from "./identity";
import {
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  clamp,
  startingLifeFor,
} from "./rules";
import { STOPPED_TIMER, elapsedMsOf, startedTimerAt } from "./timer";
import type {
  Action,
  Format,
  GameState,
  Player,
  PlayerId,
  TimerState,
} from "./types";

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
    colors: defaultColorsForSeat(n - 1),
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

export function createGame(
  format: Format,
  playerCount: number,
  timer: TimerState = STOPPED_TIMER,
): GameState {
  const count = clamp(Math.round(playerCount), MIN_PLAYERS, MAX_PLAYERS);
  const life = startingLifeFor(format);
  const players: Player[] = [];
  for (let n = 1; n <= count; n++) players.push(createPlayer(`p${n}`, life));
  return { version: 3, format, players: syncDamageMaps(players), timer };
}

/**
 * Fresh totals and a fresh clock, same seats. Used by RESET_GAME and by format
 * changes, which already wipe every life total and so start a new game.
 */
function restartGame(
  state: GameState,
  format: Format,
  at: number,
): GameState {
  const life = startingLifeFor(format);
  return {
    ...state,
    format,
    players: syncDamageMaps(
      state.players.map((p) => ({ ...p, life, commanderDamage: {} })),
    ),
    timer: startedTimerAt(at),
  };
}

/**
 * Deterministic for the static export: no clock is read here, so the
 * prerendered HTML and the first client render always agree. GameProvider
 * starts the timer after mount.
 */
export const initialGameState: GameState = createGame("commander", 4);

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "NEW_GAME":
      return createGame(
        action.format,
        action.playerCount,
        startedTimerAt(action.at),
      );

    case "RESET_GAME":
      return restartGame(state, state.format, action.at);

    case "SET_FORMAT":
      if (action.format === state.format) return state;
      return restartGame(state, action.format, action.at);

    case "PAUSE_TIMER": {
      if (state.timer.startedAt === null) return state;
      return {
        ...state,
        // Bank what has run so far; elapsed then stops moving on its own.
        timer: {
          startedAt: null,
          elapsedMs: elapsedMsOf(state.timer, action.at),
        },
      };
    }

    case "RESUME_TIMER": {
      if (state.timer.startedAt !== null) return state;
      return { ...state, timer: { ...state.timer, startedAt: action.at } };
    }

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

    case "SET_PLAYER_COLORS": {
      // Stored in WUBRG order so the pips and the wash never depend on the
      // order the buttons happened to be tapped in.
      const colors = normalizeColors(action.colors);
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? { ...p, colors } : p,
        ),
      };
    }

    default:
      return state;
  }
}
