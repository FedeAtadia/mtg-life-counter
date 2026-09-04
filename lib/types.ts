export type Format = "standard" | "commander";

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  /** User-entered name. Blank means "fall back to the default" — see displayName(). */
  name: string;
  life: number;
  /** Index into ACCENTS. */
  accent: number;
  /** Damage received, keyed by the id of the player whose commander dealt it. */
  commanderDamage: Record<PlayerId, number>;
}

/**
 * Wall-clock, not a tick count: elapsed time is derived from timestamps, so
 * locking the phone, backgrounding the app or reloading all keep the right
 * total. A counter driven by setInterval would drift or stall.
 */
export interface TimerState {
  /** Epoch ms when the running segment began; null while paused. */
  startedAt: number | null;
  /** Milliseconds banked from previous segments. */
  elapsedMs: number;
}

export interface GameState {
  version: 2;
  format: Format;
  /** Length 2..6. Array order is seat order. */
  players: Player[];
  timer: TimerState;
}

/**
 * Actions that touch the timer carry the current time rather than reading the
 * clock themselves, which keeps the reducer pure and testable.
 */
export type Action =
  | { type: "HYDRATE"; state: GameState }
  | { type: "NEW_GAME"; format: Format; playerCount: number; at: number }
  | { type: "RESET_GAME"; at: number }
  | { type: "SET_FORMAT"; format: Format; at: number }
  | { type: "PAUSE_TIMER"; at: number }
  | { type: "RESUME_TIMER"; at: number }
  | { type: "ADD_PLAYER" }
  | { type: "REMOVE_PLAYER"; id: PlayerId }
  | { type: "ADJUST_LIFE"; id: PlayerId; delta: number }
  | {
      type: "ADJUST_COMMANDER_DAMAGE";
      targetId: PlayerId;
      sourceId: PlayerId;
      delta: number;
    }
  | { type: "RENAME_PLAYER"; id: PlayerId; name: string };
