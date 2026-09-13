import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, gameReducer } from "@/lib/gameReducer";
import { MAX_NAME_LENGTH } from "@/lib/rules";
import { startedTimerAt } from "@/lib/timer";
import { LONG_PRESS_MS } from "@/lib/useLongPress";
import type { Action, GameState } from "@/lib/types";
import {
  answerReset,
  damageShownOn,
  hub,
  lifeOn,
  openSettings,
  panelFor,
  renderBoard,
  resetFromSettings,
  resetPanel,
  seatHandleFor,
  seatNumberOn,
} from "../test/harness";
import { removeServiceWorker, stubServiceWorker } from "../test/serviceWorker";
import { removeWakeLock, stubWakeLock } from "../test/wakeLock";

const T0 = 1_700_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
});

const sheetOpen = () =>
  screen.queryByRole("heading", { name: "Game settings" }) !== null;

/** A game with some history on it, built by running the real reducer. */
const build = (state: GameState, ...actions: Action[]): GameState =>
  actions.reduce(gameReducer, state);

const colourGroup = (sheet: HTMLElement, player: string) =>
  within(sheet).getByRole("group", { name: `Commander colours for ${player}` });

describe("getting in and out", () => {
  it("opens from the centre hub", () => {
    renderBoard();
    expect(sheetOpen()).toBe(false);

    openSettings();

    expect(sheetOpen()).toBe(true);
  });

  it("closes on Done and on the backdrop", () => {
    renderBoard();
    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText("Done"));
    expect(sheetOpen()).toBe(false);

    // The backdrop is the sheet's parent; tapping the sheet itself must not
    // close it, which is what the stopPropagation is for.
    const reopened = openSettings();
    fireEvent.click(reopened);
    expect(sheetOpen()).toBe(true);

    fireEvent.click(reopened.parentElement as HTMLElement);
    expect(sheetOpen()).toBe(false);
  });
});

describe("the game clock", () => {
  /** A game already under way. A fresh board waits to be started (TIMER-4). */
  const underWay = () => createGame("commander", 4, startedTimerAt(T0));

  it("counts up on the hub while the game runs", () => {
    renderBoard(underWay());

    act(() => vi.advanceTimersByTime(65_000));

    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 1:05");
  });

  it("offers Start until the clock has run, then Pause and Resume", () => {
    // One control, three labels (TIMER-8). Resume on a clock that has never
    // run would be a promise it cannot keep — there is nothing to resume.
    renderBoard();
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByText("Start"));
    act(() => vi.advanceTimersByTime(5_000));
    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 0:05");

    fireEvent.click(within(sheet).getByText("Pause"));
    expect(within(sheet).getByText("Resume")).toBeInTheDocument();
  });

  it("pauses and resumes, banking the time in between", () => {
    renderBoard(underWay());
    act(() => vi.advanceTimersByTime(30_000));

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText("Pause"));
    act(() => vi.advanceTimersByTime(120_000));

    // Two minutes passed with the clock paused; it must still read 0:30.
    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 0:30, paused");

    fireEvent.click(within(sheet).getByText("Resume"));
    act(() => vi.advanceTimersByTime(5_000));

    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 0:35");
  });
});

describe("switching format", () => {
  it("warns on the first tap and leaves the game alone", () => {
    // Anything that wipes life totals takes two taps.
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByRole("button", { name: /Standard/ }));

    expect(
      within(sheet).getByText(/Tap again to confirm/),
    ).toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(40);
  });

  it("switches and resets every total on the second tap", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    const standard = within(sheet).getByRole("button", { name: /Standard/ });

    fireEvent.click(standard);
    fireEvent.click(standard);

    for (const name of ["Player 1", "Player 2", "Player 3", "Player 4"]) {
      expect(lifeOn(panelFor(name))).toBe(20);
    }
    // Commander damage stops being tracked at all.
    expect(
      within(panelFor("Player 1")).queryByLabelText(
        "Player 1: commander damage",
      ),
    ).toBeNull();
  });

  it("disarms itself so a stray tap cannot linger", () => {
    // A sheet left open on the table must not still be one tap from a wipe.
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    const standard = within(sheet).getByRole("button", { name: /Standard/ });

    fireEvent.click(standard);
    act(() => vi.advanceTimersByTime(3_500));
    fireEvent.click(standard);

    // The tap after the timeout arms again rather than committing, so the
    // format is untouched and the warning is back on its first tap.
    expect(lifeOn(panelFor("Player 1"))).toBe(40);
    expect(within(sheet).getByText(/Tap again to confirm/)).toBeInTheDocument();
  });

  it("goes back to the plain hint once it disarms", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByRole("button", { name: /Standard/ }));
    act(() => vi.advanceTimersByTime(3_500));

    expect(
      within(sheet).getByText(/only tracked in Commander/),
    ).toBeInTheDocument();
  });

  it("does nothing when the format is already selected", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByRole("button", { name: /Commander/ }));
    fireEvent.click(within(sheet).getByRole("button", { name: /Commander/ }));

    expect(lifeOn(panelFor("Player 1"))).toBe(40);
  });
});

describe("changing the table size", () => {
  it("adds a seat at the current starting life", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByLabelText("Add a player"));

    expect(lifeOn(panelFor("Player 5"))).toBe(40);
  });

  it("removes the last seat", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByLabelText("Remove a player"));

    expect(screen.queryByText("Player 4")).not.toBeInTheDocument();
    expect(panelFor("Player 3")).toBeInTheDocument();
  });

  it("stops at six and at two", () => {
    renderBoard(createGame("commander", 6));
    const sheet = openSettings();
    expect(within(sheet).getByLabelText("Add a player")).toBeDisabled();

    const remove = within(sheet).getByLabelText("Remove a player");
    for (let i = 0; i < 4; i++) fireEvent.click(remove);

    expect(remove).toBeDisabled();
    expect(panelFor("Player 1")).toBeInTheDocument();
    expect(panelFor("Player 2")).toBeInTheDocument();
  });

  it("removes one particular player from their own row", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(within(sheet).getByLabelText("Remove Player 2"));

    expect(screen.queryByText("Player 2")).not.toBeInTheDocument();
    expect(panelFor("Player 4")).toBeInTheDocument();
  });

  it("clears a departed player from everyone's damage counters", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    fireEvent.click(within(sheet).getByLabelText("Remove Player 2"));
    fireEvent.click(within(sheet).getByText("Done"));

    fireEvent.click(
      within(panelFor("Player 1")).getByLabelText("Player 1: commander damage"),
    );

    // The panel now opens over the board, so the counters are found at the
    // top level rather than inside the seat.
    expect(
      screen.queryByLabelText("Add commander damage from Player 2"),
    ).toBeNull();
    expect(
      screen.getByLabelText("Add commander damage from Player 3"),
    ).toBeInTheDocument();
  });
});

describe("moving a player to another seat (ROSTER-6)", () => {
  /**
   * Says what the browser would find under the finger. jsdom lays nothing out
   * and has no `elementFromPoint` of its own, so standing one in is what lets
   * the drag be driven here at all.
   */
  function fingerOver(element: Element | null) {
    Object.defineProperty(document, "elementFromPoint", {
      value: () => element,
      configurable: true,
      writable: true,
    });
  }

  afterEach(() => {
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  const rowOf = (sheet: HTMLElement, id: string) =>
    sheet.querySelector(`[data-player-row="${id}"]`);

  /** A handle held until it takes, dragged over another row, and let go. */
  function dragOnto(handle: HTMLElement, row: Element | null) {
    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fingerOver(row);
    fireEvent.pointerMove(handle, { clientX: 0, clientY: 60 });
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 60 });
    // What a browser sends after the lift; it must not count as a tap.
    fireEvent.click(handle);
  }

  it("carries a player down several seats in one drag (ROSTER-9)", () => {
    // Going down, React reorders by moving the dragged row's own element, and
    // a browser takes the pointer's capture away from an element that moves.
    // That is fired after every step here, as a real browser does, and moves
    // land on the row under the finger rather than on the handle.
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    const handle = seatHandleFor(sheet, "Player 1");

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0, pointerId: 1 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    for (const next of ["p2", "p3", "p4"]) {
      const row = rowOf(sheet, next)!;
      fingerOver(row);
      fireEvent.pointerMove(row, { clientX: 0, clientY: 60, pointerId: 1 });
      fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    }
    fireEvent.pointerUp(rowOf(sheet, "p4")!, {
      clientX: 0,
      clientY: 60,
      pointerId: 1,
    });

    expect(seatNumberOn(panelFor("Player 1"))).toBe(4);
    expect(seatNumberOn(panelFor("Player 2"))).toBe(1);
  });

  it("gives every row a handle of its own", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    for (const name of ["Player 1", "Player 2", "Player 3", "Player 4"]) {
      expect(seatHandleFor(sheet, name)).toBeInTheDocument();
    }
  });

  it("puts the dragged player in the seat of the row they are dropped on", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    expect(seatNumberOn(panelFor("Player 1"))).toBe(1);

    dragOnto(seatHandleFor(sheet, "Player 1"), rowOf(sheet, "p3"));

    expect(seatNumberOn(panelFor("Player 1"))).toBe(3);
    // And the ones they passed shuffle up rather than swapping with them.
    expect(seatNumberOn(panelFor("Player 2"))).toBe(1);
    expect(seatNumberOn(panelFor("Player 3"))).toBe(2);
    expect(seatNumberOn(panelFor("Player 4"))).toBe(4);
  });

  it("brings their life and their damage with them (ROSTER-7)", () => {
    renderBoard(
      build(createGame("commander", 4), {
        type: "ADJUST_COMMANDER_DAMAGE",
        targetId: "p4",
        sourceId: "p2",
        delta: 5,
      }),
    );
    const sheet = openSettings();

    dragOnto(seatHandleFor(sheet, "Player 4"), rowOf(sheet, "p1"));

    const panel = panelFor("Player 4");
    expect(seatNumberOn(panel)).toBe(1);
    // 40 less the 5 that commander landed, which is real damage (CMDR-2).
    expect(lifeOn(panel)).toBe(35);
    expect(damageShownOn(panel, "p2")).toBe(5);
  });

  it("moves nobody's name, only their seat (ROSTER-8)", () => {
    // "Player 3" says who they are, not where they sit. Renaming people by
    // moving them is the thing this feature exists to avoid.
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    dragOnto(seatHandleFor(sheet, "Player 3"), rowOf(sheet, "p1"));

    expect(seatNumberOn(panelFor("Player 3"))).toBe(1);
    expect(seatHandleFor(sheet, "Player 3")).toBeInTheDocument();
    expect(within(sheet).getByLabelText("Name for Player 3")).toBeInTheDocument();
  });

  it("changes nothing when the hold goes nowhere", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();
    const handle = seatHandleFor(sheet, "Player 2");

    fireEvent.pointerDown(handle, { clientX: 0, clientY: 0 });
    act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
    fireEvent.pointerUp(handle, { clientX: 0, clientY: 0 });

    expect(seatNumberOn(panelFor("Player 2"))).toBe(2);
  });

  it("changes nothing on a plain tap of the handle", () => {
    // The handle is for dragging. A tap on it must not move anybody.
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    fireEvent.click(seatHandleFor(sheet, "Player 2"));

    expect(seatNumberOn(panelFor("Player 2"))).toBe(2);
  });

  it("leaves the sheet open, so more than one player can be moved", () => {
    renderBoard(createGame("commander", 4));
    const sheet = openSettings();

    // A row is dropped into the seat the row under it *currently* holds, so
    // the second drag is aimed at whoever is in seat 1 by then — which after
    // the first drag is Player 2, not Player 1.
    dragOnto(seatHandleFor(sheet, "Player 1"), rowOf(sheet, "p2"));
    expect(seatNumberOn(panelFor("Player 1"))).toBe(2);
    expect(sheetOpen()).toBe(true);

    dragOnto(seatHandleFor(sheet, "Player 4"), rowOf(sheet, "p2"));

    expect(seatNumberOn(panelFor("Player 4"))).toBe(1);
    expect(seatNumberOn(panelFor("Player 2"))).toBe(2);
    expect(sheetOpen()).toBe(true);
  });
});

describe("naming players", () => {
  it("puts the typed name on the board", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();

    fireEvent.change(within(sheet).getByLabelText("Name for Player 1"), {
      target: { value: "Fede" },
    });
    fireEvent.click(within(sheet).getByText("Done"));

    // On their own card: the name is on every opponent's damage readout too
    // now (CMDR-13), so it is no longer unique on the board.
    expect(within(panelFor("Fede")).getByText("Fede")).toBeInTheDocument();
  });

  it("stops the input at the length the type line can hold", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();

    expect(within(sheet).getByLabelText("Name for Player 1")).toHaveAttribute(
      "maxlength",
      String(MAX_NAME_LENGTH),
    );
  });

  it("falls back to the numbered name when it is cleared again", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();
    const input = within(sheet).getByLabelText("Name for Player 1");

    fireEvent.change(input, { target: { value: "Fede" } });
    fireEvent.change(input, { target: { value: "" } });

    expect(
      within(panelFor("Player 1")).getByText("Player 1"),
    ).toBeInTheDocument();
  });
});

describe("commander colours", () => {
  it("turns a colour on and off", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();
    const group = colourGroup(sheet, "Player 1");
    const blue = within(group).getByLabelText("Blue");

    // Player 1 starts on white, so blue is off.
    expect(blue).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(blue);
    expect(blue).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(blue);
    expect(blue).toHaveAttribute("aria-pressed", "false");
  });

  it("reads the identity out in WUBRG order however it was picked", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();
    const group = colourGroup(sheet, "Player 1");

    fireEvent.click(within(group).getByLabelText("White"));
    fireEvent.click(within(group).getByLabelText("Green"));
    fireEvent.click(within(group).getByLabelText("Blue"));

    expect(within(group).getByText("Blue and Green")).toBeInTheDocument();
  });

  it("calls an empty selection colourless, not unfinished", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();
    const group = colourGroup(sheet, "Player 1");

    fireEvent.click(within(group).getByLabelText("White"));

    expect(within(group).getByText("Colourless")).toBeInTheDocument();
  });

  it("changes only that player's identity", () => {
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();

    fireEvent.click(within(colourGroup(sheet, "Player 1")).getByLabelText("Red"));

    const other = colourGroup(sheet, "Player 2");
    expect(within(other).getByLabelText("Red")).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});

describe("music", () => {
  it("links out to a music app in a new tab, safely", () => {
    // The links open the native app, which owns background audio properly.
    renderBoard();
    const sheet = openSettings();

    for (const label of ["YouTube", "Spotify"]) {
      const link = within(sheet).getByRole("link", { name: label });
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link.getAttribute("href")).toMatch(/^https:\/\//);
    }
  });
});

describe("resetting the game", () => {
  it("still offers reset at the bottom of settings (RESET-5)", () => {
    // The hub's row has a reset button now, but it is a second way in rather
    // than a move. Whoever goes looking for it where it has always been should
    // still find it there.
    renderBoard(createGame("commander", 2));
    const sheet = openSettings();

    expect(
      within(sheet).getByText("Reset game (40 life, no damage)"),
    ).toBeInTheDocument();
  });

  it("asks on the panel before wiping anything (RESET-1)", () => {
    renderBoard(createGame("commander", 2));
    const panel = panelFor("Player 1");
    fireEvent.pointerDown(within(panel).getByLabelText(/lose life/));
    fireEvent.pointerUp(within(panel).getByLabelText(/lose life/));
    expect(lifeOn(panel)).toBe(39);

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText(/Reset game/));
    expect(resetPanel()).toBeInTheDocument();
    expect(lifeOn(panelFor("Player 1"))).toBe(39);

    answerReset("Reset");

    expect(lifeOn(panelFor("Player 1"))).toBe(40);
    // And it closes itself, because the game has started over (RESET-4).
    expect(resetPanel()).not.toBeInTheDocument();
    expect(sheetOpen()).toBe(false);
  });

  it("goes back to settings when the reset is cancelled (RESET-4)", () => {
    // Somebody who opened settings to do something and changed their mind
    // about the reset is still in the middle of doing that something.
    renderBoard(createGame("commander", 2));
    const panel = panelFor("Player 1");
    fireEvent.pointerDown(within(panel).getByLabelText(/lose life/));
    fireEvent.pointerUp(within(panel).getByLabelText(/lose life/));

    const sheet = openSettings();
    fireEvent.click(within(sheet).getByText(/Reset game/));
    answerReset("Cancel");

    expect(resetPanel()).not.toBeInTheDocument();
    expect(sheetOpen()).toBe(true);
    expect(lifeOn(panelFor("Player 1"))).toBe(39);
  });

  it("keeps names and colours, which are not part of a life total", () => {
    renderBoard(createGame("commander", 2));
    let sheet = openSettings();
    fireEvent.change(within(sheet).getByLabelText("Name for Player 1"), {
      target: { value: "Fede" },
    });
    fireEvent.click(within(colourGroup(sheet, "Player 1")).getByLabelText("Red"));

    resetFromSettings(sheet);

    expect(within(panelFor("Fede")).getByText("Fede")).toBeInTheDocument();
    sheet = openSettings();
    expect(
      within(colourGroup(sheet, "Player 1")).getByLabelText("Red"),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("puts the clock back to zero, waiting to be started again", () => {
    // Seeded with a clock already running: a saved game comes back with the
    // timer exactly as it was saved, so a stopped one would stay stopped here.
    renderBoard(createGame("commander", 2, startedTimerAt(T0)));
    act(() => vi.advanceTimersByTime(90_000));
    expect(hub()).toHaveAccessibleName("Game settings. Elapsed 1:30");

    resetFromSettings(openSettings());

    // And it stays there: the next game starts when the table is ready.
    act(() => vi.advanceTimersByTime(60_000));
    expect(hub()).toHaveAccessibleName(
      "Game settings. Elapsed 0:00, not started",
    );
  });
});

describe("the screen going dark", () => {
  afterEach(removeWakeLock);

  /** Opens settings on a board that has had its answer from the browser. */
  async function noteInSettings() {
    renderBoard();
    // The lock is asked for in a mount effect, and answered by a promise.
    await act(async () => {});
    return openSettings();
  }

  it("says when the screen is being held lit", async () => {
    stubWakeLock();

    const sheet = await noteInSettings();

    expect(within(sheet).getByText(/stays lit/)).toBeInTheDocument();
  });

  it("says when the browser has no way to keep it lit", async () => {
    // No stub: a browser with no Wake Lock API at all. A screen that still
    // goes black needs to say why, or it reads as the app being broken.
    const sheet = await noteInSettings();

    expect(
      within(sheet).getByText(/cannot keep the screen lit/),
    ).toBeInTheDocument();
  });

  it("says when the browser refused to", async () => {
    stubWakeLock({ refuse: true });

    const sheet = await noteInSettings();

    expect(
      within(sheet).getByText(/would not keep the screen lit/),
    ).toBeInTheDocument();
  });
});

describe("playing with no signal (PWA-10)", () => {
  afterEach(() => {
    removeServiceWorker();
    removeWakeLock();
    vi.unstubAllEnvs();
  });

  /** Opens settings on a board that has had its answer from the browser. */
  async function noteInSettings() {
    renderBoard();
    // Registration is asked for in a mount effect, and answered by a promise.
    await act(async () => {});
    return openSettings();
  }

  it("says when the app has been saved for offline play", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubServiceWorker();

    const sheet = await noteInSettings();

    expect(within(sheet).getByText(/Saved for offline play/)).toBeInTheDocument();
  });

  it("says when the browser cannot do it at all", async () => {
    // No stub: a browser with no service worker support. A board that will not
    // open on the underground should explain itself rather than look broken.
    vi.stubEnv("NODE_ENV", "production");

    const sheet = await noteInSettings();

    expect(
      within(sheet).getByText(/Offline play is not available/),
    ).toBeInTheDocument();
  });

  it("says when the browser refused", async () => {
    vi.stubEnv("NODE_ENV", "production");
    stubServiceWorker(() => Promise.reject(new Error("SecurityError")));

    const sheet = await noteInSettings();

    expect(
      within(sheet).getByText(/could not be saved for offline play/),
    ).toBeInTheDocument();
  });
});
