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
  counter, and puts the clock back to zero and stopped (TIMER-5).
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
  clears 1.6 seconds after the last change. It counts a slide notch by notch,
  so the number being dialled in is visible before the finger lifts.
- **LIFE-6** The chip is drawn over the life total, on a plate opaque enough to
  occlude it. There is no room beside the total once the card carries a text
  box (CMDR-13), and bare translucent digits laid over it merge with it: a
  "−5" over a "41" reads as "45", which is worse than showing nothing.
- **LIFE-5** A seat that is already out keeps counting.

## HOLD — How a press counts

*Enforced by `lib/holdSlider.ts`, `lib/useHoldSlider.ts`. Covered by
`lib/holdSlider.test.ts`, `lib/useHoldSlider.test.ts`.*

A press is one of two things: a tap, or a slider. Moving far enough is what
turns one into the other — there is no clock in this anywhere.

- **HOLD-1** A tap is worth exactly one point, paid when the finger lifts.
  Until it lifts there is no telling a tap from the start of a slide.
- **HOLD-2** A press becomes a slider by travelling, never by waiting. A press
  that stays put is a tap however long it is held.
- **HOLD-3** Points are derived from the distance travelled, never from a count
  of move events. A pointer stream that coalesces or drops moves — every phone
  does under load — must not miscount.
- **HOLD-4** Releasing, cancelling, or losing pointer capture all settle the
  gesture and then stop counting.
- **HOLD-5** Life totals and commander damage counters use the same rule, so a
  press behaves the same wherever the thumb lands.
- **HOLD-6** Unmounting mid-gesture stops counting.
- **HOLD-7** A press never counts into a stale callback after a re-render.
- **HOLD-8** The first 16 px of travel is free, and every 32 px after it is
  worth 5 points at a rate that never changes: nothing at 47 px, 5 at 48 px, 10
  at 80 px, and the tenth notch worth exactly what the first was.
- **HOLD-9** The half that was pressed stays the only thing that sets the
  direction (LIFE-1). A slide sets how much and never which way, so travel
  either way along the axis counts the same and a press that began on "−" can
  never leave the total higher than it found it.
- **HOLD-10** Travel is measured from where the finger landed, and only along
  the axis that seat reads as up and down (SEAT-6). Drift across that axis is
  discarded, and the free 16 px is what keeps drift along it from turning a tap
  into a slide.
- **HOLD-11** A press is worth its tap until the slide is first worth
  something. From that moment the tap is gone and the slide has it: sliding
  back gives the points back notch for notch, and returning to where the finger
  landed leaves the total untouched, which is how a slide is called off.
- **HOLD-12** The moment a press becomes a slide it says so: the hint on the
  pressed side lights up, and the device buzzes briefly where it can.
- **HOLD-13** A slide is never worth more than there is to take. Removing is
  capped at what the counter held when the press landed, so a slide that runs
  past the floor at zero (CMDR-3) and part of the way back cannot pay the
  difference out as damage on the half of the tile that removes it. A life
  total has no floor and so has no cap.

## CMDR — Commander damage

*Enforced by `lib/gameReducer.ts`, `lib/rules.ts`,
`components/CommanderDamageOverlay.tsx`, `components/DamageReadout.tsx`.
Covered by `lib/gameReducer.test.ts`, `lib/rules.test.ts`,
`components/CommanderDamageOverlay.test.tsx`, `components/PlayerPanel.test.tsx`.*

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
- **CMDR-8** One damage panel is open at a time. It opens by pressing the
  commander damage block on a card — the type line and the readout beneath it
  are one target — and closes on Done, on the backdrop, on that same block, and
  when the player it belongs to leaves.
- **CMDR-9** Every row of tiles fills the width. Up to three opponents share a
  single row; four split two and two; five split three and two. No tile is ever
  left alone beside an empty cell — a three-column grid did that to five
  opponents, and the hole is what the eye goes to.
- **CMDR-10** The panel opens centred over the whole board rather than inside
  its own seat, so the counters get the width of the device instead of the
  width of one panel. Entering commander damage is a deliberate, occasional
  act — unlike a life total, which has to stay under the thumb.
- **CMDR-11** It is turned to face the player whose damage it is. Centring it
  without rotating would leave it sideways to four seats out of six, which
  would cost more legibility than the extra size buys.
- **CMDR-12** It is reachable only in Commander, and a format change while it
  is open closes it.
- **CMDR-13** A card shows what every opponent's commander has dealt its player
  without anything being opened, in a text box where a real card keeps its
  rules. Reading the table is the common act; entering damage is the rare one,
  and only the rare one should cost a tap.
- **CMDR-14** Named lines go only to a card with the height for them: an upright
  seat with no more than three opponents. Every quarter-turned seat gets pips
  and values instead, and so does any seat with four or more opponents. A turned
  seat's height, as its player reads it, comes from half the board's width —
  about 192px whatever the player count — and named lines there cost more than
  twice what the strip costs, straight out of the life total. Counting opponents
  alone gave a four-player board a smaller life total than a six-player one.
- **CMDR-17** A lone named line is drawn large. One opponent on a two-player
  board has room the third of three has not, and sizing all of them alike left
  that card as cramped as the busiest one. Two and three lines are unchanged:
  the only card that draws two is the near-edge seat at three players, which
  has a tall panel and nothing to gain from the height.
- **CMDR-15** A counter at lethal is marked on the readout itself, so a seat
  that is out can be traced to the commander that did it without opening
  anything.
- **CMDR-16** The readout is drawn only in Commander (FMT-6). In Standard the
  text box goes with it, and the life total takes back the height.

## OUT — Elimination

*Enforced by `lib/rules.ts`. Covered by `lib/rules.test.ts`,
`components/PlayerPanel.test.tsx`.*

- **OUT-1** A player is out at zero life or below, or — in Commander only — at
  lethal commander damage from one source.
- **OUT-2** Elimination is derived, never destructive. The seat stays on the
  board, and the mark clears the moment the total is corrected.
- **OUT-3** The mark says why: "0 life" or "21 cmdr damage". Life takes
  precedence when both apply. It is carried on the card's type line, in place
  of what that line normally reads — which is where a card says what a thing
  is, and costs no height of its own.

## ROSTER — Who is at the table

*Enforced by `lib/rules.ts`, `lib/gameReducer.ts`,
`components/SettingsSheet.tsx`. Covered by `lib/gameReducer.test.ts`,
`components/SettingsSheet.test.tsx`.*

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
- **ROSTER-6** A player can be moved to another seat from settings, by dragging
  their row's handle. People do not sit in the same chairs every game, and the
  alternative was renaming everyone.
- **ROSTER-7** Everything of theirs moves with them: life, name, colour
  identity, and the damage every other commander has dealt them. All of it is
  kept against the player and none of it against the seat, so a move is a
  reorder and nothing else.
- **ROSTER-8** The seat number on a card follows the move, because it is a seat
  number. Names do not: "Player 3" comes from who they are, not where they sit,
  so nobody is renamed by being moved.

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
- **COLOR-7** A pip drawn for a whole identity shows every colour in it, as
  wedges of one circle in WUBRG order (COLOR-1), so the pip is the same size
  whether someone plays one colour or five. A single colour keeps its glyph;
  past one there is no room for even two, let alone five. This is not the gold
  trim rule — the trim goes gold at three (COLOR-3) precisely so the card reads
  as multicolour, and the pip shows the real colours for the same reason the
  wash does (COLOR-4): so a pod of three-colour commanders is not six
  identical panels.

## SEAT — Board layout

*Enforced by `lib/seatLayout.ts`, `components/PlayerSeat.tsx`,
`components/CenterHub.tsx`. Covered by `lib/seatLayout.test.ts`,
`components/GameBoard.test.tsx`, `components/CenterHub.test.tsx`.*

- **SEAT-1** Each seat is rotated so its text reads upright for the player on
  that edge of the device: near edge 0°, far edge 180°, left 90°, right −90°.
- **SEAT-2** The layout is derived from the player count, never stored beside
  it, and uses quarter turns only.
- **SEAT-3** *Retired.* The hub used to turn a quarter at five and six players,
  because it floated over the centre seam and would otherwise lie across the
  two middle names. It has its own row now at every count (SEAT-7), which
  covers nothing, so there is nothing left to turn it away from.
- **SEAT-4** An unsupported player count falls back to a real layout rather
  than rendering nothing.
- **SEAT-5** A rotated panel is authored with its width and height swapped, in
  CSS alone — no measuring and no resize observers.
- **SEAT-6** A seat and the slide gesture take their sense of “up” from one
  function, so the two can never disagree about which way a player is facing.
- **SEAT-7** The centre hub sits in a row of its own across the full width of
  the board, at every player count, so nothing is ever drawn over a card. Seats
  and hub together tile the board exactly once.
- **SEAT-10** Five players sit as four quarter-turned seats in a block at the
  far end and one wide seat along the near edge — the shape three players
  already use. Three seats down one side and two down the other share no
  horizontal seam, so no row could cross the board between them.
- **SEAT-11** At five and six the hub's row sits below the second row of seats
  rather than at the middle. There is no seam across the middle of a board
  three seats deep; the lower one keeps the hub nearer the near edge.
- **SEAT-8** That track is a fixed size rather than a share of the board, so a
  larger screen gives its extra room to the seats and not to the gap.
- **SEAT-9** It is one depth for the whole game. Nothing in it resizes, and no
  card grows or shrinks, when the clock starts or a game is reset — the
  controls in the row stay exactly where a hand last found them.

## TIMER — The game clock

*Enforced by `lib/timer.ts`, `lib/useElapsed.ts`, `components/CenterHub.tsx`.
Covered by `lib/timer.test.ts`, `lib/useElapsed.test.ts`,
`lib/gameReducer.test.ts`, `components/CenterHub.test.tsx`,
`components/SettingsSheet.test.tsx`.*

- **TIMER-1** Elapsed time is derived from timestamps, not counted in ticks, so
  locking the phone, backgrounding the app or reloading all keep the right
  total.
- **TIMER-2** Below an hour the readout is `m:ss`; from an hour it is `h:mm`.
- **TIMER-3** Pause banks what has run so far; resume continues from the banked
  total. Repeated pause/resume cycles do not drift.
- **TIMER-4** A fresh board waits to be started: it comes up at 0:00 with the
  clock stopped. A saved game comes back with the timer exactly as it was saved
  — a paused game does not silently resume.
- **TIMER-5** Reset, a new game and a format change all put the clock back to
  zero and stopped, so a game is started when the table is ready rather than
  while the decks are still being shuffled.
- **TIMER-6** The readout repaints once a second, and only every 15 seconds
  once the seconds are hidden. A stopped clock schedules nothing.
- **TIMER-7** A clock that has never run — zero on the readout, and stopped —
  carries a Start button in the hub, beside the clock. Starting it is what
  takes the button away: a game already under way has no use for it.
- **TIMER-8** The one timer control in settings reads Start before the clock
  has ever run, Pause while it is running, and Resume once there is time
  banked.
- **TIMER-9** The clock keeps the centre of the hub's track whether or not the
  Start button is beside it. Start is there for the first few seconds of a
  game; the clock is there for all of it, and the thing that stays is never
  displaced along the band by the thing that goes — nor by anything else the
  band holds, however many things that is.

## ROLL — Dice and a coin

*Enforced by `lib/dice.ts`, `lib/useLongPress.ts`, `components/DiceButton.tsx`,
`components/DicePicker.tsx`, `components/RollResult.tsx`. Covered by
`lib/dice.test.ts`, `lib/useLongPress.test.tsx`,
`components/DiceButton.test.tsx`.*

The first thing in the app that is random, and the first press that means
something by waiting. Both are fenced off from the rest: randomness never
reaches a render or the reducer, and a wait means something only on this one
button — the life and damage sliders still take no notice of time at all
(HOLD-2), because there travel is the input and here there is no travel that
could mean anything.

- **ROLL-1** One button in the hub's row throws a d4, d6, d8, d10, d12 or d20,
  or flips a coin. It sits on the clock's far side from Start, so the clock
  keeps its centre (TIMER-9).
- **ROLL-2** A tap opens the picker. A press held for 350 ms opens it too, with
  the finger still down, so sliding onto an option and lifting throws it — a
  die chosen and thrown in one gesture.
- **ROLL-3** Lifting a held press anywhere but on an option leaves the picker
  open, as if it had been tapped open. Nothing is thrown that nobody chose.
- **ROLL-4** A die of `n` sides lands on a whole number from 1 to `n`, each
  equally likely; a coin lands heads or tails, each equally likely.
- **ROLL-5** The result stays up until it is pressed away, however long that
  takes, and names the die it came off — "17" alone does not settle an
  argument about which die was thrown.
- **ROLL-6** *Retired.* The result used to be drawn twice, upright for the near
  edge and turned for the far one, on the grounds that a throw belongs to no
  one seat. It is drawn once now, as the die itself (ROLL-10) — a die on a
  table has one face up, and two of them read as two throws. The cost, put to
  the table and accepted: the far side reads it upside down, as they would a
  real die.
- **ROLL-7** A throw changes nothing in the game and is not saved. It is not a
  life total.
- **ROLL-8** Nothing random is read while rendering — only when an option is
  chosen — so the prerendered board and the hydrated one agree (PLAT-3).
- **ROLL-9** Each option is drawn as the die's own silhouette with its number
  inside it, rather than as the word for it. A d8, d10 and d12 are nearly the
  same outline, so the number is what tells them apart; the shape is what makes
  them findable without reading. Every option still answers to its name — "d20",
  "Coin" — for anything that reads names rather than shapes.
- **ROLL-10** A throw is drawn once, in the middle of the board, as the die it
  was thrown as (ROLL-9) with its result on the face. The board stays visible
  behind it: a throw is something that happened on the table, not another
  screen.
- **ROLL-11** It tumbles for about a second and settles, and the number arrives
  upright rather than spinning into place — the shape turns, the number does
  not. A coin turns through its own edge instead, because that is what a coin
  does. A phone set to reduce motion is given the settled result immediately.

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

*Enforced by `lib/gameReducer.ts`, `components/ConfirmReset.tsx`,
`components/CenterHub.tsx`, `components/SettingsSheet.tsx`. Covered by
`lib/gameReducer.test.ts`, `components/ConfirmReset.test.tsx`,
`components/SettingsSheet.test.tsx`.*

- **RESET-1** Reset asks first, on a panel that says what it will do, with
  Reset and Cancel. Cancel — or a press anywhere outside the panel — changes
  nothing. A format change still takes two taps (FMT-5); it is a different
  action and says so in its own words.
- **RESET-2** It restores starting life, clears all commander damage and puts
  the clock back to zero, waiting to be started again (TIMER-5).
- **RESET-3** It keeps the seats, the names and the colour identities — those
  are not part of a life total.
- **RESET-4** It closes the settings sheet, because the game has started over.
  Cancelling a reset started from settings goes back to settings.
- **RESET-5** Reset is one press away in the hub's row for the whole game, as
  well as at the bottom of settings where it has always been. Both open the
  same panel: one destructive action, one way of confirming it.

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

## AWAKE — Keeping the screen lit

*Enforced by `lib/useWakeLock.ts`, `components/GameBoard.tsx`. Covered by
`lib/useWakeLock.test.ts`, `components/SettingsSheet.test.tsx`.*

A phone left face-up in the middle of the table is not being touched, so it
dims and locks in the middle of somebody's turn. A screen wake lock is the only
thing a page can do about that.

- **AWAKE-1** While the board is on screen the app holds a screen wake lock, so
  the phone stays lit through a turn nobody touches it during.
- **AWAKE-2** It is asked for again every time the page becomes visible, because
  the browser drops the lock whenever the tab is hidden or the phone is locked.
- **AWAKE-3** A browser with no Wake Lock API plays exactly as it did before:
  nothing is called and nothing throws.
- **AWAKE-4** A refused lock — battery saver, an insecure origin — is recorded
  and left alone until the page next becomes visible. It is never retried in a
  loop.
- **AWAKE-5** The lock is released when the board goes away, including when the
  board unmounts while the request is still in flight.
- **AWAKE-6** Settings says which of the three is happening, so a screen that
  still goes black has an explanation rather than looking like a bug.

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

## PWA — Installing it, and playing with no signal

*Enforced by `app/manifest.ts`, `lib/useServiceWorker.ts`, `public/sw.js`,
`app/layout.tsx`. Covered by `app/manifest.test.ts`,
`lib/useServiceWorker.test.ts`.*

A counter belongs on a table, not in a browser tab. Installed to the home
screen it opens without browser chrome and keeps working in a room with no
signal, which is most of the rooms this gets played in.

- **PWA-1** A web app manifest is served, so a phone offers to install the app.
- **PWA-2** Installed, it opens standalone — no browser chrome — and starts on
  the board.
- **PWA-3** The manifest carries the icon sizes an installer asks for,
  including a maskable one, so Android does not letterbox the icon inside its
  own shape.
- **PWA-4** The manifest's colours are the board's colours, so launching does
  not flash a colour the app never uses.
- **PWA-5** A service worker takes a copy of the app shell on first visit, so a
  later visit with no signal still deals a board.
- **PWA-6** It answers from its copy first and refreshes that copy behind the
  game, so play never waits on the network.
- **PWA-7** A build clears the caches left by the one before it, so an install
  does not accumulate them.
- **PWA-8** Registration is best-effort. A browser with no service worker
  support, or one that refuses, plays exactly as it did before: nothing is
  called and nothing throws (as AWAKE-3).
- **PWA-9** No worker is registered on a development server, where a cached
  shell would serve yesterday's code back to whoever is working on it.
- **PWA-10** Settings says which of those happened, so a phone that will not
  play offline has an explanation rather than looking like a bug (as AWAKE-6).

---

## Deliberately not specified

These are open, not forgotten. Anything here needs a requirement written before
it is built.

- Partner commanders — a second commander per player. The state shape already
  keys damage per source, which is what this needs.
- Poison, energy and experience counters.
- Undo history.
- Turn order, or a per-player turn timer.
- Prompting for the install rather than leaving it to the browser, and telling
  the player when a new version has been cached and is waiting for a reload.
  Installing and playing offline are specified above (PWA).

## Known gaps

Things the tests do not cover, recorded so nobody assumes otherwise.

- **Visual layout.** The seat rotations, container-query sizing and the card
  frame are asserted structurally (grid areas, rotations, tile columns) but
  never rendered for real — jsdom does not lay anything out. `SEAT-5` in
  particular is checked by eye, not by test.
- **That the card frame fits.** `CMDR-13` costs the life total height, and
  `CMDR-14` decides how much. Measured at 393×760, with the clock running:

  | Players | Block | Life total |
  | --- | --- | --- |
  | 2 | 84px, one large line | 142px |
  | 3, near edge | 77px, two lines | 121px |
  | 3, the facing pair | 56px, strip | 62px |
  | 4 | 56px, strip | 62px |
  | 5, near edge | 65px, strip | 78px |
  | 5 and 6, turned seats | 43px, strip | 77px |

  Counting opponents alone used to put three named lines on every four-player
  card: a 78px block and a 43px life total, smaller than a six-player board's.
  Which mode a card gets is tested; that the chosen one is legible on a real
  phone is not, and cannot be here.
- **That the hub's band holds its controls.** `SEAT-7` is tested as grid
  areas, which is what stops a *card* reaching into the band. Whether the
  controls stay inside it is a question about their rendered sizes against a
  `2.75rem` row the width of the phone, and jsdom lays nothing out. It is
  checked in a browser by measuring every control against the row's own
  rectangle, at the narrowest phone worth supporting: four controls at 360px
  wide, with Start on one side of the clock and dice and reset on the other,
  because Start and reset together overflow their half. It has failed there
  before — when the hub still turned a quarter at five and six, centring by
  layout let the turned track size itself to its widest control and spill
  over a card. The hub no longer turns, which is what makes layout safe again;
  `TIMER-9` asserts the clock's column, not its pixels.
- **That the chip occludes.** `LIFE-6` is a rule about one thing being drawn
  over another, which jsdom has no way to disagree with. What is covered is
  that the chip is there and reads correctly; that it does not merge into the
  total behind it is checked by eye.
- **Real pointer capture.** jsdom has no `setPointerCapture`, so the path where
  a thumb slides off a button and the gesture survives is exercised only
  through the guard around it. Any slide worth much leaves the button it
  started on, so capture is what makes HOLD-8 work on a phone, and nothing
  here proves it. The same goes for the dice button (ROLL-2): once the picker
  is up, capture is what keeps the finger's moves coming to the button that
  reports them.
- **Which option is under a real finger.** `ROLL-2` and `ROLL-3` are tested
  with a stand-in `elementFromPoint`, because jsdom lays nothing out and has
  none of its own — so the tests say what is under the finger and check what
  the picker does about it. That the browser's own hit test finds the option a
  thumb is actually on is checked in a browser with dispatched pointer events,
  and on a phone.
- **Timers in a hidden page.** The long press (ROLL-2) waits on a timer, and a
  browser throttles timers in a page it is not showing — a 350 ms wait has
  been measured at two seconds in a hidden tab. Nobody plays on a hidden page,
  but anybody checking the hold in a background tab will see it late, and it
  is not the code.
- **Reordering seats needs a pointer.** `ROSTER-6` is a drag and nothing else:
  there is no keyboard or screen-reader path to it, so a player using either
  cannot change who sits where. That was raised and decided rather than
  overlooked — the alternative was two more controls on a row that already
  holds a name field, five colour buttons and a remove. The move itself is
  fully covered at the reducer, and the wiring is covered with a stood-in
  `elementFromPoint`; what no test here can reach is the gesture — whether a
  thumb finds the handle, and whether dragging fights the sheet's own scroll.
- **The tumble.** `ROLL-11` is CSS: keyframes in `app/globals.css` and two
  classes. jsdom runs no animation and its `matchMedia` never matches, so what
  the tests hold is the wiring — the shape carries the tumble, the number
  carries the counter-turn — and not that either actually moves, or that
  `prefers-reduced-motion` lands it immediately. Both are checked in a browser,
  where the reduced-motion path is the one worth remembering to look at: it is
  the branch nobody exercises by accident.
- **The buzz.** jsdom has no `navigator.vibrate`. The feature test guarding it
  is covered; the buzz itself (HOLD-12, and the one a long press gives) is
  checked by hand on a device.
- **The screen staying lit.** `navigator.wakeLock` is stubbed in the tests, so
  what is covered is the asking, the asking again and the release — not that a
  real phone stays awake. AWAKE-1 is checked by hand on a device, like the buzz.
- **Touch behaviour.** `touch-action: none` and the absence of scroll-on-hold
  are not testable here.
- **The service worker itself.** What is covered is the registering: that it is
  asked for, skipped where it cannot work, and never throws (PWA-8, PWA-9).
  `public/sw.js` runs in a worker scope jsdom does not provide, so caching the
  shell, answering from it and clearing old caches (PWA-5, PWA-6, PWA-7) are
  checked by hand — load the board, go offline, reload. Same shape as the wake
  lock: the asking is tested, the effect is not.
- **Installability.** That a phone actually offers to install the app depends
  on the browser's own criteria, which no test here can stand in for. The
  manifest's contents are asserted; the offer is checked on a device.
- **Render scope.** The clock is kept in the centre hub so a passing second
  repaints that pill alone rather than every seat, and the context value is
  memoised for the same reason (STATE-5). The memoisation is tested; that the
  hub is where the tick lives is held by review, not by a test.
