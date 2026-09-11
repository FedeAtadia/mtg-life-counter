"use client";

import { useState } from "react";
import CenterHub from "./CenterHub";
import CommanderDamageOverlay from "./CommanderDamageOverlay";
import ConfirmReset from "./ConfirmReset";
import PlayerSeat from "./PlayerSeat";
import SettingsSheet from "./SettingsSheet";
import { layoutFor } from "@/lib/seatLayout";
import { useGame } from "@/lib/useGame";
import { useServiceWorker } from "@/lib/useServiceWorker";
import { useWakeLock } from "@/lib/useWakeLock";
import type { PlayerId } from "@/lib/types";

export default function GameBoard() {
  const { state, dispatch } = useGame();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [damageOpenFor, setDamageOpenFor] = useState<PlayerId | null>(null);
  // Asked for from the hub or from settings; answered in one place (RESET-5).
  const [resetAsked, setResetAsked] = useState(false);
  // Held here rather than in the sheet: the screen has to stay lit while the
  // board is being played, not only while settings happen to be open.
  const wakeLock = useWakeLock();
  // Registered from the board because the board is the app: there is one route,
  // and this is the only thing mounted for the whole of a game.
  const offline = useServiceWorker();

  const layout = layoutFor(state.players.length);

  // Derived rather than synced: if the player whose damage panel was open has
  // since left the game — or the format changed out from under it — the stored
  // id simply stops matching anyone.
  const openIndex =
    state.format === "commander"
      ? state.players.findIndex((p) => p.id === damageOpenFor)
      : -1;
  const openPlayer = openIndex === -1 ? null : state.players[openIndex];

  return (
    <main
      className="board-in fixed inset-0 grid"
      style={{
        gridTemplateRows: layout.rows,
        gridTemplateColumns: layout.cols,
        gap: "4px",
        paddingTop: "max(4px, env(safe-area-inset-top))",
        paddingBottom: "max(4px, env(safe-area-inset-bottom))",
        paddingLeft: "max(4px, env(safe-area-inset-left))",
        paddingRight: "max(4px, env(safe-area-inset-right))",
      }}
    >
      {state.players.map((player, index) => (
        <PlayerSeat
          key={player.id}
          seat={layout.seats[index]}
          player={player}
          onToggleDamage={() =>
            setDamageOpenFor((current) =>
              current === player.id ? null : player.id,
            )
          }
        />
      ))}

      <CenterHub
        onClick={() => setSettingsOpen(true)}
        onReset={() => setResetAsked(true)}
        gridArea={layout.hubArea}
      />

      {/* Laid over the whole board rather than inside one seat, so the
          counters get the width of the device. It still carries that seat
          rotation, so it faces the player whose damage it is. */}
      {openPlayer && (
        <CommanderDamageOverlay
          player={openPlayer}
          opponents={state.players.filter((p) => p.id !== openPlayer.id)}
          rotation={layout.seats[openIndex].rotation}
          onClose={() => setDamageOpenFor(null)}
        />
      )}

      {settingsOpen && (
        <SettingsSheet
          wakeLock={wakeLock}
          offline={offline}
          onReset={() => setResetAsked(true)}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {/* Above settings, so a reset asked for there can be cancelled back
          into it; a reset that goes ahead closes both (RESET-4). */}
      {resetAsked && (
        <ConfirmReset
          format={state.format}
          onCancel={() => setResetAsked(false)}
          onReset={() => {
            dispatch({ type: "RESET_GAME" });
            setResetAsked(false);
            setSettingsOpen(false);
          }}
        />
      )}
    </main>
  );
}
