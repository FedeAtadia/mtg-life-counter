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
 * How much of the board the hub's own track takes (SEAT-7).
 *
 * Enough for the settings pill and the Start button beside it, and not a pixel
 * more: every one of these is taken off a card. Fixed rather than a share
 * (SEAT-8), so a larger screen spends its extra room on the seats.
 *
 * Which direction it costs depends on the seats either side of it, and the
 * answer is better than it sounds. At four players the seats are turned a
 * quarter, so a band lying across the board shortens their panels rather than
 * flattening them — and a life total is sized by the panel's height. It is at
 * five and six, where the band runs down the board between two columns of
 * seats, that it comes out of the height and the totals actually shrink.
 */
export const HUB_TRACK = "2.75rem";

export interface BoardLayout {
  /** Raw grid-template-rows / grid-template-columns values. */
  rows: string;
  cols: string;
  /**
   * How the centre hub is turned.
   *
   * With five or six players the two middle seats sit either side of the
   * centre with their names against the seam, so a hub lying across that seam
   * covers them. Turning it a quarter keeps it in line with the gap.
   *
   * It also says which way the hub's track runs: upright means a row across
   * the board, turned means a column down it.
   */
  hubRotation: Rotation;
  /** The hub's own cell, in the same grid-area form the seats use. */
  hubArea: string;
  seats: Seat[];
}

export const SEAT_LAYOUTS: Record<number, BoardLayout> = {
  // Two players facing each other across the device.
  2: {
    rows: `1fr ${HUB_TRACK} 1fr`,
    cols: "1fr",
    hubRotation: 0,
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
    hubRotation: 0,
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
    // The band runs between the two rows of seats, clear of every name.
    hubRotation: 0,
    hubArea: "2 / 1 / 3 / 3",
    seats: [
      { gridArea: "3 / 1 / 4 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 2 / 2 / 3", rotation: -90 },
      { gridArea: "3 / 2 / 4 / 3", rotation: -90 },
    ],
  },

  // Three down the left, two down the right. Sixths let the two columns
  // divide the same height into three and into two, with nothing left over.
  5: {
    rows: "repeat(6, 1fr)",
    cols: `1fr ${HUB_TRACK} 1fr`,
    // Middle seats sit either side of the centre with their names on the seam,
    // so the band runs down between the two columns rather than across them.
    hubRotation: 90,
    hubArea: "1 / 2 / 7 / 3",
    seats: [
      { gridArea: "5 / 1 / 7 / 2", rotation: 90 },
      { gridArea: "3 / 1 / 5 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 3 / 4 / 4", rotation: -90 },
      { gridArea: "4 / 3 / 7 / 4", rotation: -90 },
    ],
  },

  // Three down each side.
  6: {
    rows: "1fr 1fr 1fr",
    cols: `1fr ${HUB_TRACK} 1fr`,
    // Middle seats sit either side of the centre with their names on the seam.
    hubRotation: 90,
    hubArea: "1 / 2 / 4 / 3",
    seats: [
      { gridArea: "3 / 1 / 4 / 2", rotation: 90 },
      { gridArea: "2 / 1 / 3 / 2", rotation: 90 },
      { gridArea: "1 / 1 / 2 / 2", rotation: 90 },
      { gridArea: "1 / 3 / 2 / 4", rotation: -90 },
      { gridArea: "2 / 3 / 3 / 4", rotation: -90 },
      { gridArea: "3 / 3 / 4 / 4", rotation: -90 },
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


