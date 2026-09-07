import { fireEvent, render, screen, within } from "@testing-library/react";
import { act } from "react";
import GameBoard from "@/components/GameBoard";
import { FREE_PX, NOTCH_PX } from "@/lib/holdSlider";
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

/** The centre hub: the game clock, and the way into settings. */
export const hub = () => screen.getByLabelText(/Game settings/);

/** Opens the settings sheet and hands back its root element. */
export function openSettings(): HTMLElement {
  fireEvent.click(hub());
  return screen.getByRole("heading", { name: "Game settings" })
    .parentElement!.parentElement as HTMLElement;
}

/** The panel for one seat, found by the name on its type line. */
export function panelFor(name: string): HTMLElement {
  const zone = screen.getByLabelText(
    `${name}: lose life. Tap for 1, slide for 5 at a time`,
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

/**
 * The commander damage readout on a card, or null where there is none — which
 * is every card in Standard (CMDR-16).
 */
export function readoutOn(panel: HTMLElement): HTMLElement | null {
  return panel.querySelector("[data-damage-readout]");
}

/** Which way the readout is drawn: a named line each, or pips and values. */
export function readoutModeOn(panel: HTMLElement): string | null {
  return readoutOn(panel)?.getAttribute("data-damage-readout") ?? null;
}

/** One opponent's entry in the readout, found by the id of their commander. */
export function damageEntryOn(
  panel: HTMLElement,
  sourceId: string,
): HTMLElement {
  const entry = panel.querySelector(`[data-damage-from="${sourceId}"]`);
  if (!entry) throw new Error(`no readout entry for ${sourceId} on this panel`);
  return entry as HTMLElement;
}

/** What the readout says one opponent's commander has landed. */
export function damageShownOn(panel: HTMLElement, sourceId: string): number {
  const value = damageEntryOn(panel, sourceId).querySelector(
    "[data-damage-value]",
  );
  if (!value) throw new Error(`no value on the ${sourceId} entry`);
  return Number(value.textContent);
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
   * How far to slide, counted in notches that actually pay. A list is a slide
   * that changes its mind: the finger visits each stop in turn and lifts at the
   * last one, and 0 is back where it landed.
   */
  notches: number | number[];
  /** The seat's rotation, which is what "away" means here. */
  rotation: Rotation;
}

/**
 * How far the finger has to travel for a slide to be worth this many notches.
 *
 * The first stretch of travel is free (HOLD-8), so a test that wants three
 * notches of value has to ask for that much distance plus the free stretch.
 * Kept here rather than in each test, so the tests read in what they are worth.
 */
function travelFor(payingNotches: number): number {
  if (payingNotches === 0) return 0;
  const size = FREE_PX + Math.abs(payingNotches) * NOTCH_PX;
  return Math.sign(payingNotches) * size;
}

/**
 * A press, slid, and released.
 *
 * The finger lands at the origin and jumps straight to each stop: the hook
 * counts by where the finger is rather than by how many moves got it there, so
 * one move says the same thing as thirty.
 */
export function slide(zone: HTMLElement, { notches, rotation }: Gesture) {
  const [ux, uy] = upVectorFor(rotation);
  const stops = Array.isArray(notches) ? notches : [notches];
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  for (const stop of stops) {
    const px = travelFor(stop);
    fireEvent.pointerMove(zone, { clientX: px * ux, clientY: px * uy });
  }
  fireEvent.pointerUp(zone);
}

/** A slide left mid-gesture with the finger still down, for reading the cue. */
export function pressAndSlide(
  zone: HTMLElement,
  { notches, rotation }: Gesture,
) {
  const [ux, uy] = upVectorFor(rotation);
  const stops = Array.isArray(notches) ? notches : [notches];
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  for (const stop of stops) {
    const px = travelFor(stop);
    fireEvent.pointerMove(zone, { clientX: px * ux, clientY: px * uy });
  }
}

/**
 * A press that wanders this many raw pixels along the seat's axis and lifts —
 * for probing inside the free stretch, where a slide is not yet worth anything.
 */
export function drift(zone: HTMLElement, px: number, rotation: Rotation) {
  const [ux, uy] = upVectorFor(rotation);
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  fireEvent.pointerMove(zone, { clientX: px * ux, clientY: px * uy });
  fireEvent.pointerUp(zone);
}

/**
 * A press that goes nowhere at all, held while the clock runs on.
 *
 * The advancing is the point: nothing about a press is timed any more, so a
 * press held for five seconds has to be worth exactly what a quick tap is.
 */
export function holdStill(zone: HTMLElement, advance: (ms: number) => void) {
  fireEvent.pointerDown(zone, { clientX: 0, clientY: 0 });
  act(() => advance(5000));
  fireEvent.pointerUp(zone);
}

export { FREE_PX, NOTCH_PX };
