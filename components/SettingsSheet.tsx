"use client";

import { useEffect, useState } from "react";
import {
  ACCENTS,
  MAX_NAME_LENGTH,
  MAX_PLAYERS,
  MIN_PLAYERS,
  defaultNameFor,
  startingLifeFor,
} from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import type { Format } from "@/lib/types";

const FORMATS: Format[] = ["standard", "commander"];

/**
 * Anything that wipes life totals takes two taps: the first arms it, the second
 * commits. Auto-disarms so a stray tap can't linger.
 */
function useArmedAction(timeoutMs = 3500) {
  const [armed, setArmed] = useState<string | null>(null);
  useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(null), timeoutMs);
    return () => window.clearTimeout(timer);
  }, [armed, timeoutMs]);
  return [armed, setArmed] as const;
}

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useGame();
  const [armed, setArmed] = useArmedAction();
  const playerCount = state.players.length;

  const selectFormat = (format: Format) => {
    if (format === state.format) return;
    const key = `format:${format}`;
    if (armed !== key) {
      setArmed(key);
      return;
    }
    dispatch({ type: "SET_FORMAT", format });
    setArmed(null);
  };

  const resetGame = () => {
    if (armed !== "reset") {
      setArmed("reset");
      return;
    }
    dispatch({ type: "RESET_GAME" });
    setArmed(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88dvh] w-full max-w-sm flex-col overflow-y-auto overscroll-contain rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Game settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--border)] px-3 py-1 text-sm text-white/70 active:bg-white/10"
          >
            Done
          </button>
        </div>

        <SectionLabel>Format</SectionLabel>
        <div className="mb-1 grid grid-cols-2 gap-2">
          {FORMATS.map((format) => {
            const selected = state.format === format;
            const isArmed = armed === `format:${format}`;
            return (
              <button
                key={format}
                type="button"
                onClick={() => selectFormat(format)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  selected
                    ? "border-white/45 bg-white/10"
                    : isArmed
                      ? "border-[var(--danger)] bg-[var(--danger)]/15"
                      : "border-[var(--border)] bg-[var(--surface-2)]"
                }`}
              >
                <div className="text-sm font-semibold capitalize">
                  {format === "commander" ? "Commander / EDH" : "Standard"}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {startingLifeFor(format)} life
                </div>
              </button>
            );
          })}
        </div>
        <p className="mb-5 min-h-[2.25rem] text-xs leading-snug text-[var(--muted)]">
          {armed?.startsWith("format:")
            ? "Switching format resets every life total. Tap again to confirm."
            : "Commander damage is only tracked in Commander."}
        </p>

        <SectionLabel>Players</SectionLabel>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <StepperButton
            label="Remove a player"
            disabled={playerCount <= MIN_PLAYERS}
            onClick={() =>
              dispatch({
                type: "REMOVE_PLAYER",
                id: state.players[state.players.length - 1].id,
              })
            }
          >
            &minus;
          </StepperButton>
          <span className="tnum text-2xl font-semibold">{playerCount}</span>
          <StepperButton
            label="Add a player"
            disabled={playerCount >= MAX_PLAYERS}
            onClick={() => dispatch({ type: "ADD_PLAYER" })}
          >
            +
          </StepperButton>
        </div>

        <ul className="mb-5 flex flex-col gap-2">
          {state.players.map((player) => (
            <li key={player.id} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{
                  backgroundColor: ACCENTS[player.accent % ACCENTS.length].hex,
                }}
              />
              <input
                value={player.name}
                onChange={(event) =>
                  dispatch({
                    type: "RENAME_PLAYER",
                    id: player.id,
                    name: event.target.value,
                  })
                }
                placeholder={defaultNameFor(player.id)}
                maxLength={MAX_NAME_LENGTH}
                aria-label={`Name for ${defaultNameFor(player.id)}`}
                className="min-w-0 flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus:border-white/40"
              />
              <button
                type="button"
                aria-label={`Remove ${defaultNameFor(player.id)}`}
                disabled={playerCount <= MIN_PLAYERS}
                onClick={() =>
                  dispatch({ type: "REMOVE_PLAYER", id: player.id })
                }
                className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-white/60 active:bg-white/10 disabled:opacity-30"
              >
                &times;
              </button>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={resetGame}
          className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${
            armed === "reset"
              ? "border-[var(--danger)] bg-[var(--danger)]/20 text-white"
              : "border-[var(--border)] bg-[var(--surface-2)] text-white/80"
          }`}
        >
          {armed === "reset"
            ? "Tap again to reset the game"
            : `Reset game (${startingLifeFor(state.format)} life, no damage)`}
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-semibold tracking-widest text-[var(--muted)] uppercase">
      {children}
    </h3>
  );
}

function StepperButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="h-10 w-14 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-xl text-white/80 active:bg-white/10 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
