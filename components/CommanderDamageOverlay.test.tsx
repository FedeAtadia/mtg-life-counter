import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import { HOLD_DELAY_MS, STEP_SIZE } from "@/lib/holdRate";
import { LETHAL_COMMANDER_DAMAGE } from "@/lib/rules";
import { SEAT_LAYOUTS } from "@/lib/seatLayout";
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

/** The damage panel, wherever on the board it has been put. */
const damagePanel = () =>
  screen.getByRole("dialog", { name: /commander damage for/i });

const noDamagePanel = () =>
  screen.queryByRole("dialog", { name: /commander damage for/i }) === null;

/** Opens a seat's commander damage panel and returns it. */
function openDamage(name: string) {
  fireEvent.click(
    within(panelFor(name)).getByLabelText(`${name}: commander damage`),
  );
  return damagePanel();
}

const addFrom = (panel: HTMLElement, source: string) =>
  within(panel).getByLabelText(`Add commander damage from ${source}`);

const removeFrom = (panel: HTMLElement, source: string) =>
  within(panel).getByLabelText(`Remove commander damage from ${source}`);

/** The counter showing damage taken from one opponent. */
function damageFrom(panel: HTMLElement, source: string): number {
  const tile = addFrom(panel, source).parentElement as HTMLElement;
  return Number(tile.querySelector("span.tnum")?.textContent);
}

const settings = () => {
  fireEvent.click(screen.getByLabelText(/Game settings/));
  return screen.getByRole("heading", { name: "Game settings" }).parentElement!
    .parentElement as HTMLElement;
};

describe("where the panel opens", () => {
  it("opens over the board rather than inside the seat it belongs to", () => {
    // Entering commander damage is a deliberate, occasional act, so it can
    // have the whole device. A life total cannot — that has to stay under the
    // thumb, in the seat.
    renderBoard(createGame("commander", 4));
    const seat = panelFor("Player 1");

    const panel = openDamage("Player 1");

    expect(seat.contains(panel)).toBe(false);
  });

  it("is turned to face the player whose damage it is", () => {
    // Centring it without turning it would leave it sideways to four seats out
    // of six, costing more legibility than the extra size buys.
    renderBoard(createGame("commander", 4));
    const seats = SEAT_LAYOUTS[4].seats;

    for (const [index, name] of [
      "Player 1",
      "Player 2",
      "Player 3",
      "Player 4",
    ].entries()) {
      const panel = openDamage(name);
      expect(panel.style.transform).toContain(
        `rotate(${seats[index].rotation}deg)`,
      );
      fireEvent.click(within(panel).getByText("Done"));
    }
  });

  it("faces the far player upside down at a two-player table", () => {
    renderBoard(createGame("commander", 2));

    expect(openDamage("Player 1").style.transform).toContain("rotate(0deg)");
    fireEvent.click(within(damagePanel()).getByText("Done"));
    expect(openDamage("Player 2").style.transform).toContain("rotate(180deg)");
  });

  it("names the seat it belongs to, so it is never ambiguous whose it is", () => {
    renderBoard(createGame("commander", 4));

    expect(openDamage("Player 3")).toHaveAccessibleName(
      "Commander damage for Player 3",
    );
  });
});

describe("opening the panel", () => {
  it("shows a counter for every opponent and none for yourself", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    for (const source of ["Player 2", "Player 3", "Player 4"]) {
      expect(addFrom(panel, source)).toBeInTheDocument();
    }
    expect(
      within(panel).queryByLabelText("Add commander damage from Player 1"),
    ).toBeNull();
  });

  it("starts every counter at zero", () => {
    renderBoard(createGame("commander", 4));

    expect(damageFrom(openDamage("Player 1"), "Player 2")).toBe(0);
  });

  it("lays the tiles out to stay roughly square as the table grows", () => {
    // Text inside a tile is sized against the tile, so five tiles in a row
    // would overflow at six players.
    const columnsAt = (players: number) => {
      window.localStorage.clear();
      const view = renderBoard(createGame("commander", players));
      const panel = openDamage("Player 1");
      const grid = panel.querySelector("[style*=grid-template-columns]");
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
    const panel = openDamage("Player 1");

    tapTimes(addFrom(panel, "Player 2"), 3);

    expect(damageFrom(panel, "Player 2")).toBe(3);
    expect(lifeOn(panelFor("Player 1"))).toBe(37);
  });

  it("gives the life back when the damage is corrected downwards", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    tapTimes(addFrom(panel, "Player 2"), 5);
    tapTimes(removeFrom(panel, "Player 2"), 2);

    expect(damageFrom(panel, "Player 2")).toBe(3);
    expect(lifeOn(panelFor("Player 1"))).toBe(37);
  });

  it("does nothing at all on a counter already at zero", () => {
    // Not to the counter, and not to the life total. Tapping into the floor
    // must not quietly hand the player free life.
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    tapTimes(removeFrom(panel, "Player 2"), 4);

    expect(damageFrom(panel, "Player 2")).toBe(0);
    expect(lifeOn(panelFor("Player 1"))).toBe(40);
  });

  it("keeps each opponent on their own counter", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    tapTimes(addFrom(panel, "Player 2"), 6);
    tapTimes(addFrom(panel, "Player 3"), 4);

    expect(damageFrom(panel, "Player 2")).toBe(6);
    expect(damageFrom(panel, "Player 3")).toBe(4);
    expect(damageFrom(panel, "Player 4")).toBe(0);
    expect(lifeOn(panelFor("Player 1"))).toBe(30);
  });

  it("counts a held press in tens, the same as a life total does", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    hold(addFrom(panel, "Player 2"), HOLD_DELAY_MS, (ms) =>
      vi.advanceTimersByTime(ms),
    );

    expect(damageFrom(panel, "Player 2")).toBe(STEP_SIZE);
    expect(lifeOn(panelFor("Player 1"))).toBe(40 - STEP_SIZE);
  });

  it("does not take damage off the player who dealt it", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    tapTimes(addFrom(panel, "Player 2"), 5);

    expect(lifeOn(panelFor("Player 2"))).toBe(40);
  });

  it("shows the life it took on the seat behind it", () => {
    // The panel covers the board, so the seat has to be right the moment it
    // closes rather than catching up afterwards.
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");
    tapTimes(addFrom(panel, "Player 2"), 4);

    fireEvent.click(within(panel).getByText("Done"));

    expect(lifeOn(panelFor("Player 1"))).toBe(36);
  });
});

describe("lethal damage", () => {
  it("marks the counter once a single commander has dealt twenty-one", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");
    const tile = addFrom(panel, "Player 2").parentElement as HTMLElement;

    tapTimes(addFrom(panel, "Player 2"), LETHAL_COMMANDER_DAMAGE - 1);
    expect(tile.style.boxShadow).not.toContain("--lethal");

    tap(addFrom(panel, "Player 2"));

    expect(damageFrom(panel, "Player 2")).toBe(LETHAL_COMMANDER_DAMAGE);
    expect(tile.style.boxShadow).toContain("--lethal");
    expect(lifeOn(panelFor("Player 1"))).toBe(19);
  });

  it("does not mark two commanders adding up to lethal", () => {
    // 903.10a is per commander: twenty from each of two is not a commander
    // damage loss, however much life it took.
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    tapTimes(addFrom(panel, "Player 2"), 20);
    tapTimes(addFrom(panel, "Player 3"), 20);

    for (const source of ["Player 2", "Player 3"]) {
      const tile = addFrom(panel, source).parentElement as HTMLElement;
      expect(tile.style.boxShadow).not.toContain("--lethal");
    }
  });
});

describe("closing the panel", () => {
  it("closes on Done", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    fireEvent.click(within(panel).getByText("Done"));

    expect(noDamagePanel()).toBe(true);
  });

  it("closes when the backdrop is tapped", () => {
    // Two ways out, because the panel now covers the whole board.
    renderBoard(createGame("commander", 4));
    openDamage("Player 1");

    fireEvent.click(screen.getByLabelText("Close commander damage"));

    expect(noDamagePanel()).toBe(true);
  });

  it("stays open when the panel itself is tapped", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");

    fireEvent.click(panel);

    expect(noDamagePanel()).toBe(false);
  });

  it("keeps the damage that was entered", () => {
    renderBoard(createGame("commander", 4));
    const panel = openDamage("Player 1");
    tapTimes(addFrom(panel, "Player 2"), 7);
    fireEvent.click(within(panel).getByText("Done"));

    expect(lifeOn(panelFor("Player 1"))).toBe(33);
    expect(damageFrom(openDamage("Player 1"), "Player 2")).toBe(7);
  });

  it("closes when the format changes out from under it", () => {
    // Commander damage is not tracked in Standard, so a panel left open across
    // a format change must not linger over a board that no longer has one.
    renderBoard(createGame("commander", 4));
    openDamage("Player 1");

    const sheet = settings();
    const standard = within(sheet).getByRole("button", { name: /Standard/ });
    fireEvent.click(standard);
    fireEvent.click(standard);

    expect(noDamagePanel()).toBe(true);
  });
});
