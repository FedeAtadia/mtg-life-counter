"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DamageReadout from "./DamageReadout";
import HoldHint from "./HoldHint";
import ManaPip from "./ManaPip";
import { identityOf, trimFor, washFor } from "@/lib/identity";
import {
  displayName,
  eliminationReason,
  formatLabel,
  startingLifeFor,
} from "@/lib/rules";
import { useGame } from "@/lib/useGame";
import { useHoldSlider } from "@/lib/useHoldSlider";
import type { Rotation } from "@/lib/seatLayout";
import type { Player } from "@/lib/types";

const DELTA_CHIP_MS = 1600;

/**
 * Font sizes track their own box, so every seat scales on its own. The life
 * total measures against the art box rather than the whole card, because the
 * type line and the text box below it are no longer free space.
 */
const SIZE = {
  // Type line and collector text measure against the card: their own heights
  // come from this text, so measuring against them would be circular and
  // collapse them to nothing.
  name: "min(9.5cqh, 6cqw, 24px)",
  pip: "min(11cqh, 6cqw, 26px)",
  typeline: "min(6.4cqh, 3.6cqw, 14px)",
  collector: "min(5cqh, 2.9cqw, 11px)",
  // These live inside the art box, which has a definite height.
  hint: "min(24cqh, 13cqw, 54px)",
  // Deliberately a fraction of the total it lies over. A plate sized to match
  // covers the digits instead of crossing them, and a total you cannot read
  // mid-slide is the thing the chip exists to help you read.
  chip: "min(19cqh, 9cqw, 34px)",
};

/**
 * The readout is usually two characters wide but has to survive more ("100", or
 * a thoroughly beaten "-115"). The width allowance follows the number actually
 * on screen so a two player game is not sized for a case it never reaches.
 *
 * The height share is most of the card at two players and about a third of a
 * short panel at six, which is what the text box costs: 150 px down to 45.
 */
function lifeSizeFor(life: number): string {
  const characters = Math.max(2, String(life).length);
  const widthShare = Math.min(44, Math.round(88 / characters));
  return `min(72cqh, ${widthShare}cqw, 150px)`;
}

const formatDelta = (value: number) => (value > 0 ? `+${value}` : `${value}`);

interface Props {
  player: Player;
  /** The seat this panel sits in, so a slide knows which way is up for them. */
  rotation: Rotation;
  onToggleDamage: () => void;
}

export default function PlayerPanel({
  player,
  rotation,
  onToggleDamage,
}: Props) {
  const { state, dispatch } = useGame();
  const colors = identityOf(player);
  const trim = trimFor(colors);
  const reason = eliminationReason(player, state.format);
  const showCommanderDamage = state.format === "commander";
  const opponents = state.players.filter((p) => p.id !== player.id);
  const seatNumber = state.players.findIndex((p) => p.id === player.id) + 1;

  /**
   * A seat that is out recedes. Applied band by band rather than to the card as
   * a whole so that it skips the type line, which is carrying the mark saying
   * why (OUT-3) — greyscaling the one red thing on a dead seat is exactly
   * backwards, and that mark is the reason anybody looks at the card at all.
   */
  const dim = reason
    ? { filter: "grayscale(0.85) brightness(0.62)" }
    : undefined;

  const [recent, setRecent] = useState(0);
  const recentTimer = useRef<number | null>(null);

  const applyLife = useCallback(
    (delta: number) => {
      dispatch({ type: "ADJUST_LIFE", id: player.id, delta });
      setRecent((value) => value + delta);
      if (recentTimer.current !== null) {
        window.clearTimeout(recentTimer.current);
      }
      recentTimer.current = window.setTimeout(
        () => setRecent(0),
        DELTA_CHIP_MS,
      );
    },
    [dispatch, player.id],
  );

  useEffect(
    () => () => {
      if (recentTimer.current !== null) {
        window.clearTimeout(recentTimer.current);
      }
    },
    [],
  );

  // One point per tap; travel far enough and it becomes a slider worth five a
  // notch. Which half you press is the only thing that decides the direction —
  // the slide only ever says how far (HOLD-9).
  const minus = useHoldSlider(rotation, (points) => applyLife(-points));
  const plus = useHoldSlider(rotation, (points) => applyLife(points));

  return (
    <div
      className="no-select relative h-full w-full"
      style={{ containerType: "size" }}
    >
      {/*
        The card itself. Painted, not pressed: the tap zones sit underneath and
        catch everything that falls through, which is why this whole layer is
        pointer-events-none with one exception — the damage block, which turns
        them back on for itself.

        It sits above the tap zones rather than below so that exception can be
        pressed at all. Being out puts a filter on this element, and a filter
        makes a stacking context that a child cannot climb out of, so a lower
        card would trap the damage block underneath the zones exactly when a
        player most needs to correct the damage that knocked them out (OUT-2).
      */}
      <div
        className="pointer-events-none absolute inset-0 z-20 flex flex-col gap-[0.9cqh] rounded-[3.4cqh] px-[1.6cqh] pt-[1.6cqh] pb-[1.4cqh]"
        style={{ background: "var(--border-black)" }}
      >
        <div
          className="pointer-events-none absolute inset-[1.5cqh] rounded-[2cqh]"
          style={{
            boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${trim} 42%, transparent), inset 0 1px 0 rgba(255,255,255,0.10), inset 0 -1px 0 rgba(0,0,0,0.55)`,
          }}
        />

        {/* Title bar: name at the far end from the centre hub, pips closing it
            where a card keeps its mana cost. */}
        <div
          className="flex shrink-0 items-center gap-[2cqw] rounded-t-[1.3cqh] px-[2.2cqw] py-[0.9cqh]"
          style={{
            background: `linear-gradient(180deg, color-mix(in oklab, ${trim} 26%, var(--parchment-bg)), var(--parchment-bg))`,
            boxShadow:
              "inset 0 1px 0 rgba(255,255,255,0.10), 0 1px 0 rgba(0,0,0,0.5)",
            ...dim,
          }}
        >
          <span
            className="min-w-0 flex-1 truncate font-[family-name:var(--font-display)] leading-[1.2] font-semibold tracking-wide"
            style={{ fontSize: SIZE.name, color: "var(--parchment)" }}
          >
            {displayName(player)}
          </span>
          <span data-identity-pips className="flex shrink-0 gap-[0.7cqw]">
            {colors.length === 0 ? (
              <ManaPip color="c" size={SIZE.pip} />
            ) : (
              colors.map((color) => (
                <ManaPip key={color} color={color} size={SIZE.pip} />
              ))
            )}
          </span>
        </div>

        {/* Art box: where the life total lives. */}
        <div
          className="relative flex min-h-0 flex-1 items-center justify-center gap-[4cqw] overflow-hidden"
          style={{
            containerType: "size",
            background: washFor(colors),
            boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6)",
            ...dim,
          }}
        >
          <HoldHint
            sign="minus"
            armed={minus.armed}
            size={SIZE.hint}
            color={`color-mix(in oklab, ${trim} 40%, var(--ink-faint))`}
          />
          <span
            className="tnum font-semibold"
            style={{
              fontSize: lifeSizeFor(player.life),
              lineHeight: 0.9,
              textShadow: "0 2px 10px rgba(0,0,0,0.65)",
            }}
          >
            {player.life}
          </span>
          <HoldHint
            sign="plus"
            armed={plus.armed}
            size={SIZE.hint}
            color={`color-mix(in oklab, ${trim} 40%, var(--ink-faint))`}
          />

          {/* Running tally of the exchange, so a slide shows what it is
              dialling in before the finger lifts (LIFE-4). Laid over the total
              rather than beside it, on a plate that occludes: there is no room
              beside the number once the card carries a text box, and bare
              translucent digits merge with it — "−5" over "41" reads as "45"
              (LIFE-6). */}
          <div
            className="tnum absolute inset-0 grid place-items-center transition-opacity duration-150"
            style={{ opacity: recent === 0 ? 0 : 1 }}
          >
            <span
              className="rounded-full px-[0.5em] py-[0.12em] leading-none font-semibold"
              style={{
                fontSize: SIZE.chip,
                color: recent < 0 ? "var(--lethal)" : "#6fce93",
                background: "rgba(6,5,8,0.72)",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.09)",
              }}
            >
              {formatDelta(recent)}
            </span>
          </div>
        </div>

        {/*
          Type line and text box: two bands, one target (CMDR-8). A card's type
          line sits directly above its text box, so it labels it — and it is
          also where the elimination mark belongs, in place of what the line
          normally reads (OUT-3).

          In Standard there is nothing to open, so it is a plain band carrying
          the format, and the art box above takes back the height (CMDR-16).
        */}
        {showCommanderDamage ? (
          <button
            type="button"
            onClick={onToggleDamage}
            aria-label={`${displayName(player)}: commander damage`}
            className="pointer-events-auto relative z-20 flex shrink-0 flex-col gap-[0.9cqh] text-left active:brightness-110"
          >
            <TypeLine trim={trim} reason={reason} hint="Tap to enter">
              Commander damage
            </TypeLine>
            <DamageReadout player={player} opponents={opponents} dim={dim} />
          </button>
        ) : (
          <TypeLine trim={trim} reason={reason}>
            {formatLabel(state.format)}
          </TypeLine>
        )}

        {/* The small print a card keeps along its bottom edge. Reference, never
            a target — a real card would hang a power/toughness box off the
            right end, and nothing here earned that corner. */}
        <div
          className="shrink-0 px-[1.4cqw] leading-[1.35] tracking-wider uppercase"
          style={{
            fontSize: SIZE.collector,
            color: "var(--metal-dim)",
            ...dim,
          }}
        >
          Seat {seatNumber} &middot; {formatLabel(state.format)} &middot;{" "}
          {startingLifeFor(state.format)} start
        </div>
      </div>

      {/* Tap zones, beneath the painted card and catching everything the card
          lets through. */}
      <button
        type="button"
        aria-label={`${displayName(player)}: lose life. Tap for 1, slide for 5 at a time`}
        className="absolute top-0 left-0 z-10 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...minus.handlers}
      />
      <button
        type="button"
        aria-label={`${displayName(player)}: gain life. Tap for 1, slide for 5 at a time`}
        className="absolute top-0 right-0 z-10 h-full w-1/2"
        style={{ touchAction: "none" }}
        {...plus.handlers}
      />
    </div>
  );
}

/**
 * The card's type line, and the elimination mark when there is one.
 *
 * The mark replaces the line's text rather than sitting beside it: a seat that
 * is out has nothing else worth saying there, and swapping the text is what
 * keeps the mark from costing any height of its own (OUT-3).
 *
 * When out, the text is a direct child rather than wrapped, so a test looking
 * for it finds this one element and not every ancestor as well.
 */
function TypeLine({
  trim,
  reason,
  hint,
  children,
}: {
  trim: string;
  reason: string | null;
  /** What pressing does, where pressing does anything. */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 items-baseline justify-between gap-[2cqw] px-[2.2cqw] py-[0.7cqh] font-[family-name:var(--font-display)] leading-[1.25] font-semibold tracking-[0.14em] uppercase"
      style={{
        background: `linear-gradient(180deg, color-mix(in oklab, ${trim} 22%, var(--parchment-bg)), var(--parchment-bg))`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), 0 1px 0 rgba(0,0,0,0.5)",
        fontSize: SIZE.typeline,
        color: reason
          ? "color-mix(in oklab, var(--lethal) 78%, white)"
          : "var(--metal)",
      }}
    >
      {reason ? (
        `Out — ${reason}`
      ) : (
        <>
          <span>{children}</span>
          {hint && (
            <span
              className="shrink-0 tracking-[0.1em]"
              style={{ color: "var(--ink-faint)" }}
            >
              {hint}
            </span>
          )}
        </>
      )}
    </div>
  );
}
