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

/**
 * How deep the hub's own row is (SEAT-7): one value, for the whole game
 * (SEAT-9).
 *
 * Deep enough for the tallest thing in it — the round buttons at the end of the
 * row — with a couple of pixels either side before the board's own gap. Fixed
 * rather than a share (SEAT-8), so a larger screen spends its extra room on the
 * seats, and named outright in the templates below rather than through a custom
 * property, so nothing can change it underneath them.
 *
 * It used to shrink once the clock started, giving back the room Start had
 * needed. It no longer does: with more than the clock living in the row all
 * game, a depth that changed at the start of play moved every card and every
 * control in the row at once, for a few pixels.
 *
 * Which axis it costs depends on the seats either side of it, and the answer is
 * better than it sounds. Every seat beside it is turned a quarter, so a row
 * lying across the board shortens their panels rather than flattening them —
 * and a life total is sized by how tall a panel is for its reader, which is how
 * wide it is on the screen.
 */
export const HUB_TRACK = "2.75rem";

export interface BoardLayout {
  /** Raw grid-template-rows / grid-template-columns values. */
  rows: string;
  cols: string;
  /**
   * The hub's own cell, in the same grid-area form the seats use: one row, the
   * full width of the board, at every count (SEAT-7).
   */
  hubArea: string;
  seats: Seat[];
}

export const SEAT_LAYOUTS: Record<number, BoardLayout> = {
  // Two players facing each other across the device.
  2: {
    rows: `1fr ${HUB_TRACK} 1fr`,
    cols: "1fr",
    hubArea: "2 / 1 / 3 / 2",
    seats: [
      { gridArea: "3 / 1 / 4 / 2", rotation: 0 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 180 },
    ],
  },

  // Near edge plus one on each side.
  3: {
    rows: `1.25fr ${HUB_TRACK} 1fr`,
    cols: "1fr 1fr",
    hubArea: "2 / 1 / 3 / 3",
    seats: [
      { gridArea: "3 / 1 / 4 / 3", rotation: 0 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
    ],
  },

  // Two per side, one to each corner.
  4: {
    rows: `1fr ${HUB_TRACK} 1fr`,
    cols: "1fr 1fr",
    hubArea: "2 / 1 / 3 / 3",
    seats: [
      { gridArea: "3 / 1 / 4 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "3 / 2 / 4 / 3", rotation: -90 },
    ],
  },

  // Two per side at the far end, and the near edge to one player — the shape
  // three players already has (SEAT-10). Three down one side and two down the
  // other would share no horizontal seam, and the hub needs one to cross.
  // The hub sits under the second row: a board three seats deep has no seam
  // across its middle, and the lower one is nearer the near edge (SEAT-11).
  5: {
    rows: `1fr 1fr ${HUB_TRACK} 1fr`,
    cols: "1fr 1fr",
    hubArea: "3 / 1 / 4 / 3",
    seats: [
      { gridArea: "4 / 1 / 5 / 3", rotation: 0 },
      { gridArea: "2 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "2 / 2 / 3 / 3", rotation: -90 },
    ],
  },

  // Three down each side, with the hub under the second row (SEAT-11).
  6: {
    rows: `1fr 1fr ${HUB_TRACK} 1fr`,
    cols: "1fr 1fr",
    hubArea: "3 / 1 / 4 / 3",
    seats: [
      { gridArea: "4 / 1 / 5 / 2", rotation: 90 },
      { gridArea: "2 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "2 / 2 / 3 / 3", rotation: -90 },
      { gridArea: "4 / 2 / 5 / 3", rotation: -90 },
    ],
  },
};

export function layoutFor(playerCount: number): BoardLayout {
  return SEAT_LAYOUTS[playerCount] ?? SEAT_LAYOUTS[4];
}

/**
 * The direction, in screen coordinates (+x right, +y down), that points away
 * from the player sitting at a seat with this rotation — the way their text
 * reads "up", and the way they push a slider to mean "more".
 *
 * This is the same rule the layouts above follow, kept in one place so that a
 * gesture and a seat can never disagree about which way a player is facing.
 */
export function upVectorFor(rotation: Rotation): readonly [number, number] {
  const radians = (rotation * Math.PI) / 180;
  // Rotating the text's up vector (0,-1) by the seat's CSS rotation. Rounded
  // because these are all quarter turns, and to avoid -0.
  const snap = (n: number) => (Math.round(n) === 0 ? 0 : Math.round(n));
  return [snap(Math.sin(radians)), snap(-Math.cos(radians))];
}


