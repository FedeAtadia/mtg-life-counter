"use client";

/**
 * The small "−" and "+" beside a counter, and the light that says a slider has
 * armed under the thumb (HOLD-12).
 *
 * Shared by the life totals and the commander damage tiles so the two cannot
 * drift apart: the arming cue is the only thing telling a player that their
 * press has stopped being a tap, and it has to mean the same in both places.
 * The resting colour differs between them, so that stays a prop.
 */
export default function HoldHint({
  sign,
  armed,
  size,
  color,
}: {
  sign: "minus" | "plus";
  armed: boolean;
  /** Font size, in whatever units the surrounding container is measured in. */
  size: string;
  /** What it looks like at rest. Armed, it lights up regardless. */
  color: string;
}) {
  return (
    <span
      data-hint={sign}
      data-armed={armed ? "true" : "false"}
      style={{
        fontSize: size,
        lineHeight: 1,
        // Transforms do not apply to a plain inline element.
        display: "inline-block",
        color: armed ? "var(--text)" : color,
        transform: armed ? "scale(1.35)" : "scale(1)",
        textShadow: armed ? "0 0 12px rgba(233,226,212,0.55)" : undefined,
        transition: "transform 120ms ease-out, color 120ms ease-out",
      }}
    >
      {sign === "minus" ? "−" : "+"}
    </span>
  );
}
