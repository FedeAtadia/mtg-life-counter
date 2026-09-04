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

export interface GameState {
  version: 1;
  format: Format;
  /** Length 2..6. Array order is seat order. */
  players: Player[];
}

export type Action =
  | { type: "HYDRATE"; state: GameState }
  | { type: "NEW_GAME"; format: Format; playerCount: number }
  | { type: "RESET_GAME" }
  | { type: "SET_FORMAT"; format: Format }
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
