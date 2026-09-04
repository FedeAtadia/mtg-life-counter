import { describe, expect, it } from "vitest";
import { MAX_PLAYERS, MIN_PLAYERS } from "./rules";
import { SEAT_LAYOUTS, layoutFor } from "./seatLayout";

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

  it("faces four, five and six player seats out to the left and right edges", () => {
    for (const count of [4, 5, 6]) {
      const layout = SEAT_LAYOUTS[count];
      expect(layout.cols).toBe("1fr 1fr");
      for (const seat of layout.seats) {
        const { colStart } = parseArea(seat.gridArea);
        // Left column reads out to the left edge, right column to the right.
        expect(seat.rotation).toBe(colStart === 1 ? -90 : 90);
      }
    }
  });

  it("falls back to a real layout for an unsupported count", () => {
    expect(layoutFor(99)).toBe(SEAT_LAYOUTS[4]);
  });
});
