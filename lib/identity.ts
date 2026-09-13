import type { ManaColor, Player } from "./types";

/** WUBRG: the order Magic always lists colours in. */
export const MANA_COLORS: readonly ManaColor[] = ["w", "u", "b", "r", "g"];

export const MANA: Record<ManaColor, { label: string; hex: string }> = {
  w: { label: "White", hex: "#e8dcc0" },
  u: { label: "Blue", hex: "#3181c6" },
  b: { label: "Black", hex: "#7d7589" },
  r: { label: "Red", hex: "#c0402b" },
  g: { label: "Green", hex: "#3f9160" },
};

/**
 * The pip's disc, in its own 24x24 box: centred, and touching every edge.
 *
 * Exported because the wedges below are built from them and the tests measure
 * against them — a wedge that stops short of the rim leaves a notch in the
 * circle, and one that overshoots spills outside the box.
 */
export const PIP_CENTRE = 12;
export const PIP_RADIUS = 12;

export const COLORLESS_HEX = "#9aa0a6";
export const GOLD_HEX = "#c9a227";

/** Where the frame darkens to, behind every wash. */
const GROUND = "#14121a";
const GROUND_DEEP = "#0d0b11";

/** Puts an identity into WUBRG order and drops duplicates. */
export function normalizeColors(colors: readonly ManaColor[]): ManaColor[] {
  return MANA_COLORS.filter((color) => colors.includes(color));
}

export interface PipWedge {
  color: ManaColor;
  /** An SVG path: centre, out to the rim, round, and back. */
  d: string;
  /** Where this wedge's leading edge meets the rim, for the hairline on it. */
  cut: readonly [number, number];
}

/** A point on the pip's rim, at an angle measured from straight up. */
function onRim(turns: number): readonly [number, number] {
  const radians = (turns - 0.25) * 2 * Math.PI;
  return [
    PIP_CENTRE + PIP_RADIUS * Math.cos(radians),
    PIP_CENTRE + PIP_RADIUS * Math.sin(radians),
  ];
}

const round = (n: number) => Number(n.toFixed(2));

/**
 * An identity cut into wedges of one circle (COLOR-7).
 *
 * Empty for one colour or none: those keep the disc and glyph the pip has
 * always drawn, because a glyph says more than a wedge and a lone colour has
 * nothing to be divided from. Past one there is no room for two glyphs, let
 * alone five, so the colours themselves have to do the identifying.
 *
 * Wedges start at the top and run clockwise in WUBRG order, so the same
 * identity is always cut the same way and two players' pips can be told apart
 * at a glance rather than compared.
 */
export function pipWedges(colors: readonly ManaColor[]): PipWedge[] {
  const ids = normalizeColors(colors);
  if (ids.length < 2) return [];

  return ids.map((color, index) => {
    const from = onRim(index / ids.length);
    const to = onRim((index + 1) / ids.length);
    // Never more than half the circle once there are two or more wedges, so
    // the large-arc flag is always 0.
    return {
      color,
      d:
        `M${PIP_CENTRE} ${PIP_CENTRE} L${round(from[0])} ${round(from[1])} ` +
        `A${PIP_RADIUS} ${PIP_RADIUS} 0 0 1 ${round(to[0])} ${round(to[1])} Z`,
      cut: [round(from[0]), round(from[1])] as const,
    };
  });
}

/** A sensible starting identity: one colour per seat, cycling WUBRG. */
export function defaultColorsForSeat(seatIndex: number): ManaColor[] {
  return [MANA_COLORS[seatIndex % MANA_COLORS.length]];
}

/**
 * The frame and type line colour.
 *
 * Three or more colours turn gold, exactly as a real multicolour card does.
 * Blending three hues into a single border only makes mud, and Magic settled
 * this question long ago.
 */
export function trimFor(colors: readonly ManaColor[]): string {
  if (colors.length === 0) return COLORLESS_HEX;
  if (colors.length >= 3) return GOLD_HEX;
  return MANA[colors[0]].hex;
}

/**
 * The art box wash, which always uses the player's real colours even when the
 * trim has gone gold.
 *
 * This is the point: if gold applied to the whole panel, a pod of three-colour
 * commanders would be six identical gold panels and nobody could pick out their
 * own at a glance — which is most of what the colour is for.
 */
export function washFor(colors: readonly ManaColor[]): string {
  if (colors.length === 0) {
    return `radial-gradient(120% 90% at 50% 8%, color-mix(in oklab, ${COLORLESS_HEX} 20%, ${GROUND}), ${GROUND_DEEP} 78%)`;
  }
  if (colors.length === 1) {
    return `radial-gradient(120% 90% at 50% 8%, color-mix(in oklab, ${MANA[colors[0]].hex} 30%, ${GROUND}), ${GROUND_DEEP} 78%)`;
  }
  const stops = colors
    .map(
      (color, index) =>
        `color-mix(in oklab, ${MANA[color].hex} 30%, ${GROUND}) ${Math.round(
          (index * 100) / (colors.length - 1),
        )}%`,
    )
    .join(", ");
  return `linear-gradient(118deg, ${stops})`;
}

export function identityOf(player: Player): ManaColor[] {
  return normalizeColors(player.colors ?? []);
}

/** "Blue, Red and Green", or "Colourless". For screen readers. */
export function describeIdentity(colors: readonly ManaColor[]): string {
  if (colors.length === 0) return "Colourless";
  const labels = colors.map((color) => MANA[color].label);
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}
