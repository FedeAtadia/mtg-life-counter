"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";
import { gameReducer, initialGameState } from "./gameReducer";
import { loadGame, saveGame } from "./storage";
import type { Action, GameState } from "./types";

interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<Action>;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  // A ref rather than state: this only gates a side effect, so flipping it
  // must not itself cause a render.
  const hydrated = useRef(false);

  // Storage is read after mount, never during render, so the statically
  // exported HTML and the first client render always match.
  useEffect(() => {
    const saved = loadGame();
    if (saved) {
      dispatch({ type: "HYDRATE", state: saved });
    } else {
      // No saved game, so this is a fresh board: start its clock. Totals are
      // already at starting life, so this only sets the timer running.
      dispatch({ type: "RESET_GAME", at: Date.now() });
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    // Debounced, and the cleanup cancels a pending write, so the pre-hydration
    // default is never flushed over a saved game.
    const timer = window.setTimeout(() => saveGame(state), 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside a GameProvider");
  return ctx;
}
