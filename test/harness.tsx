import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import GameBoard from "@/components/GameBoard";
import { HOLD_DELAY_MS } from "@/lib/holdRate";
import { saveGame } from "@/lib/storage";
import { GameProvider } from "@/lib/useGame";
import type { GameState } from "@/lib/types";

/**
 * Helpers for driving the real board in a test.
 *
 * Component tests here go through `GameBoard` rather than rendering a panel on
 * its own, because a panel takes its player as a prop but dispatches through
 * the context — mounting one in isolation would show a total that never moves.
 * Going through the board is also the thing worth protecting: the reducer is
 * covered on its own, so what is left to break is the wiring.
 */
export function renderBoard(saved?: GameState) {
  // The provider reads storage in a mount effect, so seeding it first is how a
  // test chooses the board it gets.
  if (saved) saveGame(saved);
  return render(
    <GameProvider>
      <GameBoard />
    </GameProvider>,
  );
}

/** The panel for one seat, found by the name on its type line. */
export function panelFor(name: string): HTMLElement {
  const zone = screen.getByLabelText(`${name}: lose life. Tap for 1, hold to keep counting`);
  // The tap zones are direct children of the panel root.
  return zone.parentElement as HTMLElement;
}

/**
 * The life total shown on a panel.
 *
 * Read from the DOM rather than from state on purpose: a total that stops
 * reaching the screen is exactly the regression these tests exist to catch.
 * The life total is the only `span` carrying the tabular-numeral class — the
 * running delta chip beside it is a `div`.
 */
export function lifeOn(panel: HTMLElement): number {
  const total = panel.querySelector("span.tnum");
  if (!total) throw new Error("no life total on this panel");
  return Number(total.textContent);
}

/** The chip that shows what the current press has added up to. */
export function deltaChipOn(panel: HTMLElement): HTMLElement {
  const chip = panel.querySelector("div.tnum");
  if (!chip) throw new Error("no delta chip on this panel");
  return chip as HTMLElement;
}

export const minusZone = (panel: HTMLElement) =>
  within(panel).getByLabelText(/lose life/);

export const plusZone = (panel: HTMLElement) =>
  within(panel).getByLabelText(/gain life/);

/** A single tap: worth one point wherever it lands. */
export function tap(zone: HTMLElement) {
  fireEvent.pointerDown(zone);
  fireEvent.pointerUp(zone);
}

export function tapTimes(zone: HTMLElement, times: number) {
  for (let i = 0; i < times; i++) tap(zone);
}

/**
 * A press held for `ms`, counted the way the browser would count it. Requires
 * fake timers; advance in one block so the hold's own interval runs.
 */
export function hold(
  zone: HTMLElement,
  ms: number,
  advance: (ms: number) => void,
) {
  fireEvent.pointerDown(zone);
  act(() => advance(ms));
  fireEvent.pointerUp(zone);
}

export { HOLD_DELAY_MS };
