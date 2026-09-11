import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import { HUB_TRACK, SEAT_LAYOUTS, layoutFor, upVectorFor } from "./seatLayout";
import type { Rotation } from "./seatLayout";

const counts = Array.from(
  { length: MAX_PLAYERS - MIN_PLAYERS + 1 },
  (_, i) => MIN_PLAYERS + i,
);

/** "2 / 1 / 3 / 2" -> { rowStart: 2, colStart: 1, rowEnd: 3, colEnd: 2 } */
function parseArea(gridArea: string) {
  const [rowStart, colStart, rowEnd, colEnd] = gridArea
    .split("/")
    .map((part) => Number.parseInt(part.trim(), 10));
  return { rowStart, colStart, rowEnd, colEnd };
}

describe("seat layouts", () => {
  it("covers every supported player count", () => {
    expect(Object.keys(SEAT_LAYOUTS).map(Number).sort()).toEqual(counts);
  });

  it.each(counts)("has exactly %i seats for %i players", (count) => {
    expect(SEAT_LAYOUTS[count].seats).toHaveLength(count);
  });

  it.each(counts)("only uses quarter turns (%i players)", (count) => {
    for (const seat of SEAT_LAYOUTS[count].seats) {
      expect([0, 90, 180, -90]).toContain(seat.rotation);
    }
  });

  it.each(counts)(
    "tiles the grid exactly once, seats and hub together (%i players)",
    (count) => {
      // The hub counts as one of the tiles (SEAT-7). That is the whole
      // guarantee: if it claimed no cell of its own it would be floating over
      // somebody's card again, and if it claimed one twice it would be sharing.
      const layout = SEAT_LAYOUTS[count];
      const areas = [...layout.seats.map((s) => s.gridArea), layout.hubArea].map(
        parseArea,
      );
      const rows = Math.max(...areas.map((a) => a.rowEnd)) - 1;
      const cols = Math.max(...areas.map((a) => a.colEnd)) - 1;

      const hits = new Map<string, number>();
      for (const area of areas) {
        expect(area.rowEnd).toBeGreaterThan(area.rowStart);
        expect(area.colEnd).toBeGreaterThan(area.colStart);
        for (let r = area.rowStart; r < area.rowEnd; r++) {
          for (let c = area.colStart; c < area.colEnd; c++) {
            const key = `${r},${c}`;
            hits.set(key, (hits.get(key) ?? 0) + 1);
          }
        }
      }

      // Every cell of the rows x cols grid is claimed exactly once.
      expect(hits.size).toBe(rows * cols);
      for (const [cell, times] of hits) {
        expect(`${cell} claimed ${times}x`).toBe(`${cell} claimed 1x`);
      }
    },
  );

  /**
   * Every seat that sits in one column, pointing its text away from its edge:
   * the left column reads rightwards, the right column reads leftwards.
   */
  function expectDownTheEdges(seats: typeof SEAT_LAYOUTS[number]["seats"]) {
    for (const seat of seats) {
      const { colStart, colEnd } = parseArea(seat.gridArea);
      expect(colEnd - colStart).toBe(1);
      expect(seat.rotation).toBe(colStart === 1 ? 90 : -90);
    }
  }

  it("seats four and six player games down the left and right edges", () => {
    for (const count of [4, 6]) {
      expectDownTheEdges(SEAT_LAYOUTS[count].seats);
    }
  });

  it("seats five as a block of four and one wide seat on the near edge (SEAT-10)", () => {
    // Three down one side and two down the other share no horizontal seam, so
    // no row could cross the board between them. The odd player gets the whole
    // near edge, as the third player does at three.
    const [near, ...rest] = SEAT_LAYOUTS[5].seats;
    const area = parseArea(near.gridArea);
    const lastRow = Math.max(
      ...SEAT_LAYOUTS[5].seats.map((s) => parseArea(s.gridArea).rowEnd),
    );

    expect(near.rotation).toBe(0);
    expect(area.rowEnd).toBe(lastRow);
    expect([area.colStart, area.colEnd]).toEqual([1, 3]);
    expectDownTheEdges(rest);
  });

  it("starts every table at the near edge, so seat order is table order", () => {
    // Seat index is player index. Whoever is first in the roster sits nearest
    // the phone's bottom edge, at every count — re-seating five must not
    // quietly move Player 1 to the far end.
    for (const count of counts) {
      const first = parseArea(SEAT_LAYOUTS[count].seats[0].gridArea);
      const lastRow = Math.max(
        ...SEAT_LAYOUTS[count].seats.map((s) => parseArea(s.gridArea).rowEnd),
      );
      expect(first.rowEnd).toBe(lastRow);
      expect(first.colStart).toBe(1);
    }
  });

  describe("the hub's own row (SEAT-7)", () => {
    it.each(counts)(
      "lies across the full width of the board (%i players)",
      (count) => {
        // One row deep and every column wide. A hub one column short of the
        // edge leaves a seat beside it, and that seat's corner is exactly where
        // the controls at the end of the row would land.
        const layout = SEAT_LAYOUTS[count];
        const hub = parseArea(layout.hubArea);
        const columns = layout.cols.split(" ").length;

        expect(hub.rowEnd - hub.rowStart).toBe(1);
        expect([hub.colStart, hub.colEnd]).toEqual([1, columns + 1]);
      },
    );

    it("is the only track that is not a share of the board (SEAT-8)", () => {
      // A `fr` track would grow the gap on a bigger screen; the seats should
      // get that room instead.
      for (const count of counts) {
        const layout = SEAT_LAYOUTS[count];
        const rows = layout.rows.split(" ");
        expect(rows.filter((t) => t === HUB_TRACK)).toHaveLength(1);
        for (const track of [...rows, ...layout.cols.split(" ")]) {
          if (track !== HUB_TRACK) expect(track).toMatch(/fr$/);
        }
      }
    });

    it("is one fixed depth, whatever state the game is in (SEAT-9)", () => {
      // Absolute, so it does not grow with the screen (SEAT-8). And a single
      // value rather than a choice between two: a depth that changes when the
      // clock starts moves every card and every control in the row with it.
      expect(HUB_TRACK).toMatch(/rem$/);
    });

    it("sits below the second row of seats at five and six (SEAT-11)", () => {
      // A board three seats deep has no seam across its middle. The lower of
      // its two keeps the hub nearer whoever is at the near edge.
      for (const count of [5, 6]) {
        const layout = SEAT_LAYOUTS[count];
        const hub = parseArea(layout.hubArea);
        const above = layout.seats.filter(
          (s) => parseArea(s.gridArea).rowEnd <= hub.rowStart,
        );
        const below = layout.seats.filter(
          (s) => parseArea(s.gridArea).rowStart >= hub.rowEnd,
        );

        // Two rows of two above it, and the near edge below.
        expect(above).toHaveLength(4);
        expect(below).toHaveLength(count - 4);
        expect(new Set(above.map((s) => parseArea(s.gridArea).rowStart)))
          .toEqual(new Set([1, 2]));
      }
    });
  });

  // Screen axes: +x right, +y down. Written out by hand rather than derived, so
  // this stays an independent check on upVectorFor rather than a restatement of
  // it.
  const AWAY_FROM_EDGE: Record<number, [number, number]> = {
    0: [0, -1], // near edge: up the screen
    180: [0, 1], // far edge: down the screen
    90: [1, 0], // left edge: rightwards
    [-90]: [-1, 0], // right edge: leftwards
  };

  it("gives each rotation an up vector pointing away from that player", () => {
    for (const [rotation, expected] of Object.entries(AWAY_FROM_EDGE)) {
      expect(upVectorFor(Number(rotation) as Rotation)).toEqual(expected);
    }
  });

  it("points every seat's text away from the edge that player sits at", () => {
    for (const count of counts) {
      for (const seat of SEAT_LAYOUTS[count].seats) {
        expect(upVectorFor(seat.rotation)).toEqual(
          AWAY_FROM_EDGE[seat.rotation],
        );
      }
    }
  });

  it("falls back to a real layout for an unsupported count", () => {
    expect(layoutFor(99)).toBe(SEAT_LAYOUTS[4]);
  });
});
