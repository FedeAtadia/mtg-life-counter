/**
 * Seat layouts for a phone lying flat in the middle of the table.
 *
 * Each seat is rotated so it reads upright for the player sitting on that edge
 * of the device. "Up" for a reader is the side of the page FURTHEST from them --
 * lay a book on a table and the top of the text is the far end -- so a seat's
 * rotation points its text away from the edge that player sits at, toward the
 * middle of the device: near edge 0deg, far edge 180deg, left edge 90deg, right
 * edge -90deg. Seat order runs around the table starting from the near edge.
 *
 * Layouts favour panels that are wider than they are tall, because a life total
 * is a wide, short thing. On a portrait phone that means putting players on the
 * left and right edges (rotated a quarter turn) rather than stacking narrow
 * columns.
 */

export type Rotation = 0 | 90 | 180 | -90;

export interface Seat {
  /** CSS grid-area: "rowStart / colStart / rowEnd / colEnd". */
  gridArea: string;
  rotation: Rotation;
}

export interface BoardLayout {
  /** Raw grid-template-rows / grid-template-columns values. */
  rows: string;
  cols: string;
  seats: Seat[];
}

export const SEAT_LAYOUTS: Record<number, BoardLayout> = {
  // Two players facing each other across the device.
  2: {
    rows: "1fr 1fr",
    cols: "1fr",
    seats: [
      { gridArea: "2 / 1 / 3 / 2", rotation: 0 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 180 },
    ],
  },

  // Near edge plus one on each side.
  3: {
    rows: "1.25fr 1fr",
    cols: "1fr 1fr",
    seats: [
      { gridArea: "2 / 1 / 3 / 3", rotation: 0 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
    ],
  },

  // Two per side, one to each corner.
  4: {
    rows: "1fr 1fr",
    cols: "1fr 1fr",
    seats: [
      { gridArea: "2 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "2 / 2 / 3 / 3", rotation: -90 },
    ],
  },

  // Three down the left, two down the right. Sixths let the two columns
  // divide the same height into three and into two, with nothing left over.
  5: {
    rows: "repeat(6, 1fr)",
    cols: "1fr 1fr",
    seats: [
      { gridArea: "5 / 1 / 7 / 2", rotation: 90 },
      { gridArea: "3 / 1 / 5 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 4 / 3", rotation: -90 },
      { gridArea: "4 / 2 / 7 / 3", rotation: -90 },
    ],
  },

  // Three down each side.
  6: {
    rows: "1fr 1fr 1fr",
    cols: "1fr 1fr",
    seats: [
      { gridArea: "3 / 1 / 4 / 2", rotation: 90 },
      { gridArea: "2 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "2 / 2 / 3 / 3", rotation: -90 },
      { gridArea: "3 / 2 / 4 / 3", rotation: -90 },
    ],
  },
};

export function layoutFor(playerCount: number): BoardLayout {
  return SEAT_LAYOUTS[playerCount] ?? SEAT_LAYOUTS[4];
}

