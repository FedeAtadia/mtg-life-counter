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

export const COLORLESS_HEX = "#9aa0a6";
export const GOLD_HEX = "#c9a227";

/** Where the frame darkens to, behind every wash. */
const GROUND = "#14121a";
const GROUND_DEEP = "#0d0b11";

/** Puts an identity into WUBRG order and drops duplicates. */
export function normalizeColors(colors: readonly ManaColor[]): ManaColor[] {
  return MANA_COLORS.filter((color) => colors.includes(color));
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
