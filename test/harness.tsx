import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import GameBoard from "@/components/GameBoard";
import { ARM_DELAY_MS, NOTCH_PX } from "@/lib/holdSlider";
import { layoutFor, upVectorFor } from "@/lib/seatLayout";
import { saveGame } from "@/lib/storage";
import { GameProvider } from "@/lib/useGame";
import type { Rotation } from "@/lib/seatLayout";
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
  const zone = screen.getByLabelText(
    `${name}: lose life. Tap for 1, hold then slide for 5 at a time`,
  );
  // The tap zones are direct children of the panel root.
  return zone.parentElement as HTMLElement;
}

/**
 * Which way the player in a given seat is facing, which is what a slide has to
 * be aimed along. Taken from the layout rather than written down here, so a
 * test cannot quietly disagree with the board it is driving (SEAT-6).
 */
export function rotationOf(playerCount: number, seatIndex: number): Rotation {
  return layoutFor(playerCount).seats[seatIndex].rotation;
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

/** The chip that shows what the current exchange has added up to. */
export function deltaChipOn(panel: HTMLElement): HTMLElement {
  const chip = panel.querySelector("div.tnum");
  if (!chip) throw new Error("no delta chip on this panel");
  return chip as HTMLElement;
}

/** The "−" or "+" beside a total, which lights up when the slider arms. */
export function hintOn(panel: HTMLElement, sign: "minus" | "plus"): HTMLElement {
  const hint = panel.querySelector(`[data-hint="${sign}"]`);
  if (!hint) throw new Error(`no ${sign} hint on this panel`);
  return hint as HTMLElement;
}

export const isArmed = (hint: HTMLElement) =>
  hint.getAttribute("data-armed") === "true";

export const minusZone = (panel: HTMLElement) =>
  within(panel).getByLabelText(/lose life/);

export const plusZone = (panel: HTMLElement) =>
  within(panel).getByLabelText(/gain life/);

/** A single tap: worth one point wherever it lands. */
export function tap(zone: HTMLElement) {
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  fireEvent.pointerUp(zone);
}

export function tapTimes(zone: HTMLElement, times: number) {
  for (let i = 0; i < times; i++) tap(zone);
}

interface Gesture {
  /**
   * How far to slide, in notches away from the player at that seat. A list is
   * a slide that changes its mind: the finger visits each stop in turn and
   * lifts at the last one.
   */
  notches: number | number[];
  /** The seat's rotation, which is what "away" means here. */
  rotation: Rotation;
  advance: (ms: number) => void;
}

/**
 * A press held until the slider arms, slid, and then released.
 *
 * The finger starts at the origin and jumps straight to each stop: the hook
 * counts by where the finger is rather than by how many moves got it there, so
 * one move says the same thing as thirty. Requires fake timers.
 */
export function slide(
  zone: HTMLElement,
  { notches, rotation, advance }: Gesture,
) {
  const [ux, uy] = upVectorFor(rotation);
  const stops = Array.isArray(notches) ? notches : [notches];
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  act(() => advance(ARM_DELAY_MS));
  for (const stop of stops) {
    const px = stop * NOTCH_PX;
    fireEvent.pointerMove(zone, { clientX: px * ux, clientY: px * uy });
  }
  fireEvent.pointerUp(zone);
}

/** A press held past the arming delay and then simply lifted, going nowhere. */
export function holdStill(zone: HTMLElement, advance: (ms: number) => void) {
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  act(() => advance(ARM_DELAY_MS));
  fireEvent.pointerUp(zone);
}

/** A press held past the arming delay and left down, for inspecting the cue. */
export function pressAndArm(zone: HTMLElement, advance: (ms: number) => void) {
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  act(() => advance(ARM_DELAY_MS));
}

export { ARM_DELAY_MS, NOTCH_PX };
