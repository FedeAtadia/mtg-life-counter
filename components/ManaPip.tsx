import { COLORLESS_HEX, MANA } from "@/lib/identity";
import type { ManaColor } from "@/lib/types";

/**
 * Mana pips drawn for this project.
 *
 * Deliberately not Wizards' own symbols, and not the `mana` icon font either:
 * these are simple enough to own outright, they cost no network request, and
 * they stay crisp at every panel size.
 */
const GLYPHS: Record<ManaColor | "c", React.ReactNode> = {
  w: (
    <>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 1.4 13.5 6 12 5.4 10.5 6Z" />
      <path d="M12 22.6 10.5 18 12 18.6 13.5 18Z" />
      <path d="M1.4 12 6 10.5 5.4 12 6 13.5Z" />
      <path d="M22.6 12 18 13.5 18.6 12 18 10.5Z" />
      <path d="M4.5 4.5 8.9 6.6 7.8 7.8 6.6 8.9Z" />
      <path d="M19.5 19.5 15.1 17.4 16.2 16.2 17.4 15.1Z" />
      <path d="M19.5 4.5 17.4 8.9 16.2 7.8 15.1 6.6Z" />
      <path d="M4.5 19.5 6.6 15.1 7.8 16.2 8.9 17.4Z" />
    </>
  ),
  u: (
    <path d="M12 2.6c3.6 5.2 6.9 8.6 6.9 11.7a6.9 6.9 0 0 1-13.8 0C5.1 11.2 8.4 7.8 12 2.6Z" />
  ),
  b: (
    <>
      <path d="M12 3a7.4 7.4 0 0 0-7.4 7.4c0 2.6 1.3 4.3 2.7 5.4v2.9c0 1.3 1 2.3 2.3 2.3h4.8c1.3 0 2.3-1 2.3-2.3v-2.9c1.4-1.1 2.7-2.8 2.7-5.4A7.4 7.4 0 0 0 12 3Z" />
      <circle cx="9.2" cy="10.4" r="1.9" fill="#12100e" />
      <circle cx="14.8" cy="10.4" r="1.9" fill="#12100e" />
      <rect x="10.9" y="16.4" width="2.2" height="4.6" rx=".7" fill="#12100e" />
    </>
  ),
  r: (
    <path d="M13.2 2.2c.4 4.2 4.8 5.4 4.8 10.2a6 6 0 0 1-12 0c0-2.6 1.5-4 2.6-5.6.5 1 .9 1.6 1.7 2 .3-2.8 1.4-5 2.9-6.6Z" />
  ),
  g: (
    <>
      <path d="M12 2.4C6.4 6 4.2 12.4 6.8 17.1c2 3.6 7 4.6 10.1 1.6 3.4-3.3 3-9.6-.4-13.5-.6 2.7-2 4.1-3.6 4.6.3-2.7-.2-5.2-.9-7.4Z" />
      <path d="M11.4 21.6V12.2h1.3v9.4Z" fill="#12100e" />
    </>
  ),
  c: (
    <>
      <path d="M12 2.6 20 12l-8 9.4L4 12Z" />
      <path d="M12 7.4 16.2 12 12 16.7 7.8 12Z" fill="#12100e" />
    </>
  ),
};

interface Props {
  /** A mana colour, or "c" for the colourless diamond. */
  color: ManaColor | "c";
  /** Any CSS length; defaults to filling its box. */
  size?: string;
  className?: string;
}

export default function ManaPip({ color, size, className }: Props) {
  const fill = color === "c" ? COLORLESS_HEX : MANA[color].hex;
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="12" fill={fill} opacity="0.92" />
      <g fill="#12100e" transform="translate(2.6 2.6) scale(0.78)">
        {GLYPHS[color]}
      </g>
    </svg>
  );
}
