# Specification

What this app is required to do. Every requirement here is a single, testable
statement with a stable id, and every one of them is covered by a test.

**This file is the source of truth for behaviour.** If the code and this file
disagree, one of them is a bug — decide which before writing anything else.

## How to use it

- **Adding a feature?** Write the requirement here first, give it the next free
  id in its section, then write the test, then the code. See
  [WORKFLOW.md](WORKFLOW.md).
- **Changing behaviour?** Edit the requirement in the same commit as the code
  and the test. A requirement that no longer matches the code is worse than no
  requirement at all.
- **Referencing one?** Use the id (`CMDR-3`) in commit messages, pull requests
  and test names. Ids are permanent; retire one rather than renumbering.

Ids are stable. Sections list the module that enforces the rule and the test
files that hold it up.

---

## FMT — Formats and starting life

*Enforced by `lib/rules.ts`, `lib/gameReducer.ts`. Covered by
`lib/rules.test.ts`, `lib/gameReducer.test.ts`, `components/SettingsSheet.test.tsx`.*

- **FMT-1** Two formats are supported: Standard and Commander.
- **FMT-2** Starting life is 40 in Commander and 20 in Standard.
- **FMT-3** Changing format resets every life total and every commander damage
  counter, and restarts the clock.
- **FMT-4** Selecting the format already in play changes nothing.
- **FMT-5** Changing format takes two taps: the first arms it and shows a
  warning, the second commits. Arming clears itself after 3.5 seconds.
- **FMT-6** Commander damage is tracked and shown only in Commander.

## LIFE — Life totals

*Enforced by `lib/gameReducer.ts`, `components/PlayerPanel.tsx`. Covered by
`lib/gameReducer.test.ts`, `components/PlayerPanel.test.tsx`.*

- **LIFE-1** Tapping the left half of a panel loses life; the right half gains
  it. Which half is pressed is the only thing that sets the direction.
- **LIFE-2** Life is never clamped. It goes below zero and can be gained back.
- **LIFE-3** A press changes only the seat it landed on.
- **LIFE-4** A chip shows the running net of the current exchange, signed, and
  clears 1.6 seconds after the last press.
- **LIFE-5** A seat that is already out keeps counting.

## HOLD — How a press counts

*Enforced by `lib/holdRate.ts`, `lib/useSteadyHold.ts`. Covered by
`lib/holdRate.test.ts`, `lib/useSteadyHold.test.ts`.*

- **HOLD-1** A tap is worth exactly one point, counted on press rather than on
  release, so the number moves under the thumb.
- **HOLD-2** Held past 500 ms, the total jumps by ten and then by another ten
  every second: from 40 a press passes through 41, lands on 50, then 60.
- **HOLD-3** Points are derived from elapsed time, never from a count of timer
  ticks. A throttled or late timer must not undercount.
- **HOLD-4** Releasing, cancelling, or losing pointer capture all pay out the
  remainder of the hold and then stop counting.
- **HOLD-5** Life totals and commander damage counters use the same rule, so a
  press behaves the same wherever the thumb lands.
- **HOLD-6** Unmounting mid-hold stops counting.
- **HOLD-7** A press never counts into a stale callback after a re-render.

## CMDR — Commander damage

*Enforced by `lib/gameReducer.ts`, `components/CommanderDamageOverlay.tsx`.
Covered by `lib/gameReducer.test.ts`, `components/CommanderDamageOverlay.test.tsx`.*

- **CMDR-1** Every player holds exactly one counter per opponent, and none for
  themselves.
- **CMDR-2** Commander damage is real damage: adding 1 also removes 1 life, and
  removing 1 gives that life back.
- **CMDR-3** Pressing "−" on a counter already at zero does nothing at all —
  not to the counter, and not to the life total.
- **CMDR-4** 21 or more damage from a single commander eliminates a player
  whatever their life total (rule 903.10a). From 40 life, 21 commander damage
  leaves them on 19 and still out.
- **CMDR-5** Damage from different commanders is never added together for that
  threshold. Twenty from each of two commanders is not a commander-damage loss.
- **CMDR-6** Damage never changes the life total of the player who dealt it.
- **CMDR-7** Self-damage and damage from a player who is not at the table are
  ignored.
- **CMDR-8** One damage panel is open at a time. It closes on Done, on the
  backdrop, on its own button, and when the player it belongs to leaves.
- **CMDR-9** Tiles stay roughly square as the table grows: up to three
  opponents get a column each, four get two columns, five get three.
- **CMDR-10** The panel opens centred over the whole board rather than inside
  its own seat, so the counters get the width of the device instead of the
  width of one panel. Entering commander damage is a deliberate, occasional
  act — unlike a life total, which has to stay under the thumb.
- **CMDR-11** It is turned to face the player whose damage it is. Centring it
  without rotating would leave it sideways to four seats out of six, which
  would cost more legibility than the extra size buys.
- **CMDR-12** It is reachable only in Commander, and a format change while it
  is open closes it.

## OUT — Elimination

*Enforced by `lib/rules.ts`. Covered by `lib/rules.test.ts`,
`components/PlayerPanel.test.tsx`.*

- **OUT-1** A player is out at zero life or below, or — in Commander only — at
  lethal commander damage from one source.
- **OUT-2** Elimination is derived, never destructive. The seat stays on the
  board, and the mark clears the moment the total is corrected.
- **OUT-3** The mark says why: "0 life" or "21 cmdr damage". Life takes
  precedence when both apply.

## ROSTER — Who is at the table

*Enforced by `lib/rules.ts`, `lib/gameReducer.ts`. Covered by
`lib/gameReducer.test.ts`, `components/SettingsSheet.test.tsx`.*

- **ROSTER-1** Between 2 and 6 players. The stepper stops at both ends.
- **ROSTER-2** A player who joins gets the current format's starting life, and
  damage counters are seeded in both directions.
- **ROSTER-3** A player who leaves takes their counters with them, and is
  dropped from everyone else's. No stale entries, no missing ones.
- **ROSTER-4** Player ids are deterministic (`p1`, `p2`, …) rather than random,
  so the prerendered markup and the hydrated client agree. A freed number is
  reused by the next player to join.
- **ROSTER-5** A player can be removed from the stepper, which takes the last
  seat, or from their own row, which takes that one.

## NAME — Player names

*Enforced by `lib/rules.ts`, `lib/gameReducer.ts`. Covered by
`lib/rules.test.ts`, `lib/gameReducer.test.ts`, `components/SettingsSheet.test.tsx`.*

- **NAME-1** A name is at most 16 characters. The input and the reducer both
  enforce it.
- **NAME-2** A blank or whitespace-only name falls back to "Player N", so a
  seat never loses its heading.
- **NAME-3** Names survive a reset and a format change.

## COLOR — Commander colour identity

*Enforced by `lib/identity.ts`. Covered by `lib/identity.test.ts`,
`lib/gameReducer.test.ts`, `components/SettingsSheet.test.tsx`,
`components/PlayerPanel.test.tsx`.*

- **COLOR-1** An identity is stored in WUBRG order with duplicates dropped,
  however the buttons were tapped.
- **COLOR-2** No colours is colourless — a real identity with its own pip and
  trim, not a missing value.
- **COLOR-3** Three or more colours turn the trim gold, as a real multicolour
  card does.
- **COLOR-4** The art wash always uses the player's real colours, even when the
  trim has gone gold, so a pod of three-colour commanders is not six identical
  gold panels.
- **COLOR-5** Each seat starts on a different single colour, cycling WUBRG.
- **COLOR-6** Identity survives a reset and a format change.

## SEAT — Board layout

*Enforced by `lib/seatLayout.ts`, `components/PlayerSeat.tsx`. Covered by
`lib/seatLayout.test.ts`, `components/GameBoard.test.tsx`.*

- **SEAT-1** Each seat is rotated so its text reads upright for the player on
  that edge of the device: near edge 0°, far edge 180°, left 90°, right −90°.
- **SEAT-2** The layout is derived from the player count, never stored beside
  it, and uses quarter turns only.
- **SEAT-3** At five and six players the hub turns a quarter, because the two
  middle seats put their names on the centre seam.
- **SEAT-4** An unsupported player count falls back to a real layout rather
  than rendering nothing.
- **SEAT-5** A rotated panel is authored with its width and height swapped, in
  CSS alone — no measuring and no resize observers.

## TIMER — The game clock

*Enforced by `lib/timer.ts`, `lib/useElapsed.ts`. Covered by
`lib/timer.test.ts`, `lib/useElapsed.test.ts`, `lib/gameReducer.test.ts`,
`components/SettingsSheet.test.tsx`.*

- **TIMER-1** Elapsed time is derived from timestamps, not counted in ticks, so
  locking the phone, backgrounding the app or reloading all keep the right
  total.
- **TIMER-2** Below an hour the readout is `m:ss`; from an hour it is `h:mm`.
- **TIMER-3** Pause banks what has run so far; resume continues from the banked
  total. Repeated pause/resume cycles do not drift.
- **TIMER-4** A fresh board starts its clock after mount. A saved game comes
  back with the timer exactly as it was saved — a paused game does not silently
  resume.
- **TIMER-5** Reset and a format change both restart the clock from zero.
- **TIMER-6** The readout repaints once a second, and only every 15 seconds
  once the seconds are hidden. A paused clock schedules nothing.

## SAVE — Persistence

*Enforced by `lib/storage.ts`, `lib/useGame.tsx`. Covered by
`lib/storage.test.ts`, `lib/useGame.test.tsx`, `lib/gameReducer.test.ts`.*

- **SAVE-1** State is mirrored to `localStorage` under `mtg-life-counter:v1` on
  a 250 ms debounce, so a held button does not write once per frame.
- **SAVE-2** Storage is read in an effect after mount, never during render, so
  the statically exported HTML and the first client render always agree.
- **SAVE-3** The pre-hydration default board is never written over a saved
  game.
- **SAVE-4** Anything read back is validated before it becomes state. Absent or
  corrupt data yields a fresh board rather than a broken one.
- **SAVE-5** Known older saves (v1, v2) are migrated rather than rejected —
  people have games in progress. A pre-v3 accent index becomes a colour
  identity.
- **SAVE-6** Storage failing — private mode, exceeded quota, blocked access —
  never interrupts play. Losing persistence is acceptable; losing the game is
  not.
- **SAVE-7** Damage maps are re-synced on load, so a save that no longer
  matches its roster is repaired instead of discarded.

## RESET — Starting over

*Enforced by `lib/gameReducer.ts`, `components/SettingsSheet.tsx`. Covered by
`lib/gameReducer.test.ts`, `components/SettingsSheet.test.tsx`.*

- **RESET-1** Reset takes two taps, like a format change.
- **RESET-2** It restores starting life, clears all commander damage and
  restarts the clock.
- **RESET-3** It keeps the seats, the names and the colour identities — those
  are not part of a life total.
- **RESET-4** It closes the settings sheet, because the game has started over.

## STATE — Shape and purity

*Enforced by `lib/gameReducer.ts`, `lib/types.ts`, `lib/useGame.tsx`. Covered
by `lib/gameReducer.test.ts`, `lib/useGame.test.tsx`.*

- **STATE-1** All game rules live in one pure reducer. It never reads the clock
  — actions that need the time carry it.
- **STATE-2** The reducer never mutates the state it was given.
- **STATE-3** An action that changes nothing returns the same state object, so
  the context can skip the re-render.
- **STATE-4** An unknown action is ignored.
- **STATE-5** The context value is memoised on state: a parent re-render must
  not repaint every seat, and `dispatch` keeps a stable identity.
- **STATE-6** `useGame` outside a provider throws rather than rendering a board
  with no state.

## PLAT — Platform

*Enforced by `next.config.ts`, `lib/music.ts`, `app/`. Covered by
`components/SettingsSheet.test.tsx` and by `npm run build`.*

- **PLAT-1** Static export. No server, no accounts, no network calls at
  runtime.
- **PLAT-2** Music links out to a native app rather than playing in the page,
  because a backgrounded tab has its audio suspended. Links open in a new tab
  with `rel="noopener noreferrer"`.
- **PLAT-3** The prerendered markup and the first client render must always
  agree: deterministic player ids, and a stopped, zeroed clock in the
  prerendered state.
- **PLAT-4** The board is built for a phone lying flat in the middle of a
  table, and honours the safe-area insets on all four edges.

---

## Deliberately not specified

These are open, not forgotten. Anything here needs a requirement written before
it is built.

- Partner commanders — a second commander per player. The state shape already
  keys damage per source, which is what this needs.
- Poison, energy and experience counters.
- Undo history.
- Installable / offline PWA support.
- Turn order, or a per-player turn timer.

## Known gaps

Things the tests do not cover, recorded so nobody assumes otherwise.

- **Visual layout.** The seat rotations, container-query sizing and the card
  frame are asserted structurally (grid areas, rotations, tile columns) but
  never rendered for real — jsdom does not lay anything out. `SEAT-5` in
  particular is checked by eye, not by test.
- **Real pointer capture.** jsdom has no `setPointerCapture`, so the path where
  a thumb slides off a button and the hold survives is exercised only through
  the guard around it.
- **Touch behaviour.** `touch-action: none` and the absence of scroll-on-hold
  are not testable here.
- **Render scope.** The clock is kept in the centre hub so a passing second
  repaints that pill alone rather than every seat, and the context value is
  memoised for the same reason (STATE-5). The memoisation is tested; that the
  hub is where the tick lives is held by review, not by a test.
