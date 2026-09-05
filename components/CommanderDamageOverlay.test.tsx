import { fireEvent, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import { HOLD_DELAY_MS, STEP_SIZE } from "@/lib/holdRate";
import { LETHAL_COMMANDER_DAMAGE } from "@/lib/rules";
import { hold, lifeOn, panelFor, renderBoard, tap, tapTimes } from "../test/harness";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

/** Opens a seat's commander damage panel and returns it. */
function openDamage(name: string) {
  const panel = panelFor(name);
  fireEvent.click(within(panel).getByLabelText(`${name}: commander damage`));
  const overlay = within(panel).getByText("Damage taken from").parentElement!
    .parentElement as HTMLElement;
  return { panel, overlay };
}

const addFrom = (overlay: HTMLElement, source: string) =>
  within(overlay).getByLabelText(`Add commander damage from ${source}`);

const removeFrom = (overlay: HTMLElement, source: string) =>
  within(overlay).getByLabelText(`Remove commander damage from ${source}`);

/** The counter showing damage taken from one opponent. */
function damageFrom(overlay: HTMLElement, source: string): number {
  const tile = addFrom(overlay, source).parentElement as HTMLElement;
  return Number(tile.querySelector("span.tnum")?.textContent);
}

describe("opening the panel", () => {
  it("shows a counter for every opponent and none for yourself", () => {
    renderBoard(createGame("commander", 4));
    const { overlay } = openDamage("Player 1");

    for (const source of ["Player 2", "Player 3", "Player 4"]) {
      expect(addFrom(overlay, source)).toBeInTheDocument();
    }
    expect(
      within(overlay).queryByLabelText("Add commander damage from Player 1"),
    ).toBeNull();
  });

  it("starts every counter at zero", () => {
    renderBoard(createGame("commander", 4));
    const { overlay } = openDamage("Player 1");

    expect(damageFrom(overlay, "Player 2")).toBe(0);
  });

  it("lays the tiles out to stay roughly square as the table grows", () => {
    // Text inside a tile is sized against the tile, so five tiles in a row
    // would overflow the panel at six players.
    const columnsAt = (players: number) => {
      window.localStorage.clear();
      const view = renderBoard(createGame("commander", players));
      const { overlay } = openDamage("Player 1");
      const grid = overlay.querySelector("[style*=grid-template-columns]");
      const columns = (grid as HTMLElement).style.gridTemplateColumns;
      view.unmount();
      return columns;
    };

    expect(columnsAt(2)).toContain("repeat(1");
    expect(columnsAt(4)).toContain("repeat(3");
    expect(columnsAt(5)).toContain("repeat(2");
    expect(columnsAt(6)).toContain("repeat(3");
  });
});

describe("commander damage is real damage", () => {
  it("takes the same amount off the life total", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    tapTimes(addFrom(overlay, "Player 2"), 3);

    expect(damageFrom(overlay, "Player 2")).toBe(3);
    expect(lifeOn(panel)).toBe(37);
  });

  it("gives the life back when the damage is corrected downwards", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    tapTimes(addFrom(overlay, "Player 2"), 5);
    tapTimes(removeFrom(overlay, "Player 2"), 2);

    expect(damageFrom(overlay, "Player 2")).toBe(3);
    expect(lifeOn(panel)).toBe(37);
  });

  it("does nothing at all on a counter already at zero", () => {
    // Not to the counter, and not to the life total. Tapping into the floor
    // must not quietly hand the player free life.
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    tapTimes(removeFrom(overlay, "Player 2"), 4);

    expect(damageFrom(overlay, "Player 2")).toBe(0);
    expect(lifeOn(panel)).toBe(40);
  });

  it("keeps each opponent on their own counter", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    tapTimes(addFrom(overlay, "Player 2"), 6);
    tapTimes(addFrom(overlay, "Player 3"), 4);

    expect(damageFrom(overlay, "Player 2")).toBe(6);
    expect(damageFrom(overlay, "Player 3")).toBe(4);
    expect(damageFrom(overlay, "Player 4")).toBe(0);
    expect(lifeOn(panel)).toBe(30);
  });

  it("counts a held press in tens, the same as a life total does", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    hold(addFrom(overlay, "Player 2"), HOLD_DELAY_MS, (ms) =>
      vi.advanceTimersByTime(ms),
    );

    expect(damageFrom(overlay, "Player 2")).toBe(STEP_SIZE);
    expect(lifeOn(panel)).toBe(40 - STEP_SIZE);
  });

  it("does not take damage off the player who dealt it", () => {
    renderBoard(createGame("commander", 4));
    const { overlay } = openDamage("Player 1");

    tapTimes(addFrom(overlay, "Player 2"), 5);

    expect(lifeOn(panelFor("Player 2"))).toBe(40);
  });
});

describe("lethal damage", () => {
  it("marks the counter once a single commander has dealt twenty-one", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");
    const tile = addFrom(overlay, "Player 2").parentElement as HTMLElement;

    tapTimes(addFrom(overlay, "Player 2"), LETHAL_COMMANDER_DAMAGE - 1);
    expect(tile.style.boxShadow).not.toContain("--lethal");

    tap(addFrom(overlay, "Player 2"));

    expect(damageFrom(overlay, "Player 2")).toBe(LETHAL_COMMANDER_DAMAGE);
    expect(tile.style.boxShadow).toContain("--lethal");
    // Still on 19 life, and still out.
    expect(lifeOn(panel)).toBe(19);
  });

  it("does not mark two commanders adding up to lethal", () => {
    // 903.10a is per commander: twenty from each of two is not a commander
    // damage loss, however much life it took.
    renderBoard(createGame("commander", 4));
    const { overlay } = openDamage("Player 1");

    tapTimes(addFrom(overlay, "Player 2"), 20);
    tapTimes(addFrom(overlay, "Player 3"), 20);

    for (const source of ["Player 2", "Player 3"]) {
      const tile = addFrom(overlay, source).parentElement as HTMLElement;
      expect(tile.style.boxShadow).not.toContain("--lethal");
    }
  });
});

describe("closing the panel", () => {
  it("closes on Done", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    fireEvent.click(within(overlay).getByText("Done"));

    expect(within(panel).queryByText("Damage taken from")).toBeNull();
  });

  it("closes when the backdrop is tapped", () => {
    // Two ways out, because the panel covers the whole seat.
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");

    fireEvent.click(within(overlay).getByLabelText("Close commander damage"));

    expect(within(panel).queryByText("Damage taken from")).toBeNull();
  });

  it("keeps the damage that was entered", () => {
    renderBoard(createGame("commander", 4));
    const { panel, overlay } = openDamage("Player 1");
    tapTimes(addFrom(overlay, "Player 2"), 7);
    fireEvent.click(within(overlay).getByText("Done"));

    expect(lifeOn(panel)).toBe(33);

    const reopened = openDamage("Player 1");
    expect(damageFrom(reopened.overlay, "Player 2")).toBe(7);
  });
});
