import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import { SEAT_LAYOUTS, layoutFor, upVectorFor } from "./seatLayout";
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
    "tiles the grid exactly once, with no overlaps or gaps (%i players)",
    (count) => {
      const areas = SEAT_LAYOUTS[count].seats.map((s) => parseArea(s.gridArea));
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

      // Every cell of the rows x cols grid is claimed by exactly one seat.
      expect(hits.size).toBe(rows * cols);
      for (const [cell, times] of hits) {
        expect(`${cell} claimed ${times}x`).toBe(`${cell} claimed 1x`);
      }
    },
  );

  it("seats four, five and six player games down the left and right edges", () => {
    for (const count of [4, 5, 6]) {
      const layout = SEAT_LAYOUTS[count];
      expect(layout.cols).toBe("1fr 1fr");
      for (const seat of layout.seats) {
        const { colStart } = parseArea(seat.gridArea);
        // A seat points its text away from the edge that player sits at: the
        // left column reads rightwards, the right column reads leftwards.
        expect(seat.rotation).toBe(colStart === 1 ? 90 : -90);
      }
    }
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

  it.each(counts)("gives the hub a quarter turn at most (%i players)", (n) => {
    expect([0, 90, 180, -90]).toContain(SEAT_LAYOUTS[n].hubRotation);
  });

  it("turns the hub only where seats flank the centre", () => {
    // At five and six a seat occupies the middle of each column, so the centre
    // lands on their inner edge — exactly where their names run. Turning the
    // hub keeps it in the seam instead of lying across both names. At every
    // other count the centre falls on a corner or a seam between rows, and an
    // upright hub reads better.
    expect(SEAT_LAYOUTS[5].hubRotation).toBe(90);
    expect(SEAT_LAYOUTS[6].hubRotation).toBe(90);
    for (const count of [2, 3, 4]) {
      expect(SEAT_LAYOUTS[count].hubRotation).toBe(0);
    }
  });

  it("falls back to a real layout for an unsupported count", () => {
    expect(layoutFor(99)).toBe(SEAT_LAYOUTS[4]);
  });
});
