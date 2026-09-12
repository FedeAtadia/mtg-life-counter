import { DICE } from "@/lib/dice";
import type { ThrowKind } from "@/lib/dice";

/**
 * The dice, as silhouettes (ROLL-9).
 *
 * Outlines only, on purpose. The first pass drew the interior facet lines that
 * make a polyhedron look like one, and at the size these are used every single
 * one of them ran straight through the number — which is the part that actually
 * says which die it is. The outline makes an option findable without reading;
 * the number tells a d8 from a d12.
 *
 * Drawn here rather than pulled from an icon set: there is no icon dependency
 * in this project and these are six polygons.
 */
const OUTLINES: Record<ThrowKind, React.ReactNode> = {
  d4: <path d="M12 3 21.5 20H2.5Z" />,
  d6: <rect x="3.5" y="3.5" width="17" height="17" rx="3.2" />,
  d8: <path d="M12 2.4 21 12l-9 9.6L3 12Z" />,
  d10: <path d="M12 2.4 21 9.6 17 21.6H7L3 9.6Z" />,
  d12: <path d="M12 2.4 21.3 9.2 17.8 20.2H6.2L2.7 9.2Z" />,
  d20: <path d="M12 2.4 20.7 7.2v9.6L12 21.6 3.3 16.8V7.2Z" />,
  coin: (
    <>
      <circle cx="12" cy="12" r="9.2" />
      <circle cx="12" cy="12" r="5.6" />
    </>
  ),
};

/** What is written inside the shape. A coin has no number to show. */
export function sidesOf(kind: ThrowKind): string {
  return kind === "coin" ? "" : String(DICE[kind]);
}

export default function DieShape({
  kind,
  className,
  strokeWidth = 1.5,
}: {
  kind: ThrowKind;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {OUTLINES[kind]}
    </svg>
  );
}
