import { fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame } from "@/lib/gameReducer";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/rules";
import { SEAT_LAYOUTS } from "@/lib/seatLayout";
import { panelFor, renderBoard } from "../test/harness";

const T0 = 1_700_000_000_000;

const counts = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
);

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

const board = () => screen.getByRole("main");

/** Every seat carries a pair of tap zones, so counting one counts the seats. */
const seatCount = () => screen.getAllByLabelText(/gain life/).length;

const openDamage = (name: string) =>
  fireEvent.click(
    within(panelFor(name)).getByLabelText(`${name}: commander damage`),
  );

const damagePanelsOpen = () =>
  screen.queryAllByText("Damage taken from").length;

describe("seating the table", () => {
  it.each(counts)("gives %i players a seat each", (count) => {
    renderBoard(createGame("commander", count));

    expect(seatCount()).toBe(count);
  });

  it.each(counts)("uses the layout built for %i players", (count) => {
    renderBoard(createGame("commander", count));
    const layout = SEAT_LAYOUTS[count];

    expect(board().style.gridTemplateRows).toBe(layout.rows);
    expect(board().style.gridTemplateColumns).toBe(layout.cols);
  });

  it("re-seats the board when a player joins or leaves", () => {
    // The layout is derived from the roster, not stored alongside it, so this
    // is the thing that has to keep holding as the table changes.
    renderBoard(createGame("commander", 4));
    fireEvent.click(screen.getByLabelText(/Game settings/));
    const sheet = screen.getByRole("heading", { name: "Game settings" })
      .parentElement!.parentElement as HTMLElement;

    fireEvent.click(within(sheet).getByLabelText("Add a player"));
    expect(seatCount()).toBe(5);
    expect(board().style.gridTemplateRows).toBe(SEAT_LAYOUTS[5].rows);

    fireEvent.click(within(sheet).getByLabelText("Remove a player"));
    fireEvent.click(within(sheet).getByLabelText("Remove a player"));
    expect(seatCount()).toBe(3);
    expect(board().style.gridTemplateRows).toBe(SEAT_LAYOUTS[3].rows);
  });

  it("turns the hub out of the way where seats flank the centre", () => {
    // At five and six the two middle seats put their names on the centre seam,
    // so a hub lying across it would cover them.
    renderBoard(createGame("commander", 6));

    expect(screen.getByLabelText(/Game settings/).style.transform).toContain(
      "rotate(90deg)",
    );
  });

  it("leaves the hub square where the seats meet at a corner", () => {
    renderBoard(createGame("commander", 4));

    expect(screen.getByLabelText(/Game settings/).style.transform).toContain(
      "rotate(0deg)",
    );
  });
});

describe("the phone it sits on", () => {
  it("keeps every edge clear of the notch and the home indicator", () => {
    // The board is fixed to all four edges of a phone lying flat, so all four
    // insets matter — not just the top one.
    renderBoard();
    const style = board().style;

    for (const side of ["Top", "Bottom", "Left", "Right"] as const) {
      expect(style[`padding${side}`]).toContain("safe-area-inset");
    }
  });
});

describe("the commander damage panel", () => {
  it("opens over the board, naming the seat it belongs to", () => {
    // It no longer lives inside the seat, so the name on it is the only thing
    // saying whose damage is being counted.
    renderBoard(createGame("commander", 4));

    openDamage("Player 1");

    expect(
      screen.getByRole("dialog", { name: "Commander damage for Player 1" }),
    ).toBeInTheDocument();
  });

  it("closes when its own button is tapped again", () => {
    renderBoard(createGame("commander", 4));

    openDamage("Player 1");
    openDamage("Player 1");

    expect(damagePanelsOpen()).toBe(0);
  });

  it("only ever has one open at a time", () => {
    // Two open panels on a phone in the middle of a table is two people
    // counting at once into a board nobody can read.
    renderBoard(createGame("commander", 4));

    openDamage("Player 1");
    openDamage("Player 3");

    expect(damagePanelsOpen()).toBe(1);
    expect(
      screen.getByRole("dialog", { name: "Commander damage for Player 3" }),
    ).toBeInTheDocument();
  });

  it("closes itself when the player it belonged to leaves", () => {
    // The open panel is tracked by id and derived on render, so a departed
    // player's id simply stops matching anyone.
    renderBoard(createGame("commander", 4));
    openDamage("Player 4");
    expect(damagePanelsOpen()).toBe(1);

    fireEvent.click(screen.getByLabelText(/Game settings/));
    const sheet = screen.getByRole("heading", { name: "Game settings" })
      .parentElement!.parentElement as HTMLElement;
    fireEvent.click(within(sheet).getByLabelText("Remove Player 4"));

    expect(damagePanelsOpen()).toBe(0);
  });

  it("is not reachable at all in Standard", () => {
    renderBoard(createGame("standard", 4));

    expect(screen.queryAllByLabelText(/commander damage/)).toHaveLength(0);
  });
});
