import ManaPip from "./ManaPip";
import { identityOf } from "@/lib/identity";
import {
  LETHAL_COMMANDER_DAMAGE,
  damageReadoutMode,
  displayName,
} from "@/lib/rules";
import type { Player } from "@/lib/types";

/**
 * The card's rules text box: what every opponent's commander has landed on this
 * player, on the card, all game (CMDR-13).
 *
 * Reading the table is the common act and entering damage is the rare one, so
 * only the rare one costs a tap. This draws; the panel above it owns the press
 * that opens the pad, because the type line and this box are one target
 * (CMDR-8).
 *
 * Sized against its own box rather than the panel, like the damage tiles are:
 * text scaled off the panel behind it gets bigger as the box it sits in gets
 * smaller, which is exactly backwards at five and six players.
 */
const SIZE = {
  pip: "min(7.6cqh, 4.2cqw, 20px)",
  name: "min(7.4cqh, 4.2cqw, 15px)",
  value: "min(8.4cqh, 5cqw, 18px)",
  tilePip: "min(8cqh, 5cqw, 20px)",
  tileValue: "min(9cqh, 5.4cqw, 19px)",
};

interface Props {
  player: Player;
  /** Everyone else at the table. Never includes `player` — see CMDR-1. */
  opponents: Player[];
  /** How a seat that is out recedes, applied by the panel band by band. */
  dim?: React.CSSProperties;
}

export default function DamageReadout({ player, opponents, dim }: Props) {
  const mode = damageReadoutMode(opponents.length);

  const entries = opponents.map((source) => ({
    source,
    value: player.commanderDamage[source.id] ?? 0,
  }));

  return (
    <div
      data-damage-readout={mode}
      className="pointer-events-none flex shrink-0 flex-col gap-[0.3cqh] rounded-[0.3cqh_0.3cqh_1.3cqh_1.3cqh] px-[2cqw] py-[0.6cqh]"
      style={{
        background: "linear-gradient(180deg, #1a1712, #14110d)",
        boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.55)",
        ...dim,
      }}
    >
      {mode === "tiles" ? (
        <div className="flex gap-[1.2cqw]">
          {entries.map(({ source, value }) => (
            <Entry key={source.id} source={source} value={value} mode={mode} />
          ))}
        </div>
      ) : (
        entries.map(({ source, value }) => (
          <Entry key={source.id} source={source} value={value} mode={mode} />
        ))
      )}
    </div>
  );
}

/**
 * One opponent's commander, and what it has done.
 *
 * Lethal is marked here rather than only on the elimination mark (CMDR-15):
 * the mark says a seat is out, and this says which commander did it, which is
 * the thing a table argues about.
 */
function Entry({
  source,
  value,
  mode,
}: {
  source: Player;
  value: number;
  mode: "rows" | "tiles";
}) {
  const lethal = value >= LETHAL_COMMANDER_DAMAGE;
  const colors = identityOf(source);
  // The pip is the only thing identifying a commander once the names go, so a
  // colourless one gets its own diamond rather than nothing at all (COLOR-2).
  const pip = colors.length === 0 ? "c" : colors[0];

  const tone = lethal
    ? {
        background: "color-mix(in oklab, var(--lethal) 18%, transparent)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in oklab, var(--lethal) 45%, transparent)",
      }
    : undefined;

  const valueColor = lethal
    ? "color-mix(in oklab, var(--lethal) 72%, white)"
    : value === 0
      ? "var(--ink-faint)"
      : "var(--text)";

  if (mode === "tiles") {
    return (
      <span
        data-damage-from={source.id}
        data-lethal={lethal ? "true" : "false"}
        className="flex min-w-0 flex-1 flex-col items-center gap-[0.2cqh] rounded-[0.8cqh] py-[0.4cqh] leading-none"
        style={
          tone ?? {
            background: "rgba(0,0,0,0.35)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.05)",
          }
        }
      >
        <ManaPip color={pip} size={SIZE.tilePip} />
        <span
          data-damage-value
          className="tnum font-semibold"
          style={{ fontSize: SIZE.tileValue, color: valueColor }}
        >
          {value}
        </span>
      </span>
    );
  }

  return (
    <span
      data-damage-from={source.id}
      data-lethal={lethal ? "true" : "false"}
      className="flex min-h-[min(8cqh,24px)] items-center gap-[1.6cqw] rounded-[0.6cqh] px-[0.6cqw] leading-[1.15]"
      style={tone}
    >
      <ManaPip color={pip} size={SIZE.pip} />
      <span
        className="min-w-0 flex-1 truncate"
        style={{
          fontSize: SIZE.name,
          color: lethal
            ? "color-mix(in oklab, var(--lethal) 72%, white)"
            : value === 0
              ? "var(--ink-faint)"
              : "var(--parchment)",
        }}
      >
        {displayName(source)}
      </span>
      <span
        data-damage-value
        className="tnum shrink-0 font-semibold"
        style={{ fontSize: SIZE.value, color: valueColor }}
      >
        {value}
      </span>
    </span>
  );
}
