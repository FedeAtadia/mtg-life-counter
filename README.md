# MTG Life Counter

A life and commander damage tracker for 2–6 player Magic: The Gathering games,
built for a phone lying flat in the middle of the table.

Static Next.js app — no server, no accounts, no network calls at runtime.

## Documentation

- **[docs/SPEC.md](docs/SPEC.md)** — what the app is required to do, as
  numbered, testable requirements. The source of truth for behaviour: if the
  code and the spec disagree, one of them is a bug.
- **[docs/WORKFLOW.md](docs/WORKFLOW.md)** — how to add or change behaviour
  here. Spec first, then the failing test, then the code.
- **[docs/BRANCHING.md](docs/BRANCHING.md)** — the branch model and the rules
  guarding `main`, which is what the host builds from.

This README explains how the app is built; the spec says what it must do.

## Running it

```bash
npm run dev
```

Then open http://localhost:3000.

```bash
npm test      # the whole suite: rules, reducer, storage, hooks, components
npm run lint
npm run build # static export into out/
```

### Trying it on a phone

A board meant to lie flat in the middle of a table can only really be judged on
one, and the dependable way to get it there is the preview deployment Vercel
builds for every pull request. That build already exists whether you want it or
not — it is a required check on both branches, see
[docs/BRANCHING.md](docs/BRANCHING.md) — so there is nothing to set up:

```bash
gh pr create --base development
```

The Vercel bot comments the link on the pull request. It is a per-branch URL,
so pushing again updates the same link rather than minting a new one. Two
things worth knowing:

- Preview deployments sit behind Vercel Authentication. A phone that is not
  signed in to the same Vercel team gets a login page instead of the board.
- `mtg-life-counter.vercel.app` is production, built from `main`. It will not
  have the branch you are trying to test.

`next dev` does also listen on the network and print a second address, and
opening that from a phone on the same Wi‑Fi is the obvious thing to reach for:

```
- Local:         http://localhost:3000
- Network:       http://192.168.1.23:3000
```

It has not been reliable here, though, and the usual explanations do not cover
it: on a machine where the phone could not load the board, the dev server was
verifiably answering on its LAN address and Node already held inbound firewall
rules on both the private and public profiles. Two things are still worth
checking before spending an evening on it.

- **The address it prints may not be the one to use.** `next dev` picks a
  single interface, and on a machine running Tailscale or a VPN that is often a
  `100.x` carrier-grade NAT address, which nothing on your Wi‑Fi can reach.
  `ipconfig` — or `Get-NetIPAddress -AddressFamily IPv4` in PowerShell — will
  show the `192.168.x` one to try instead.
- **The firewall**, which is the usual reason a bound port is still
  unreachable: Node has to be allowed to accept incoming connections, and
  Windows blocks that by default on a network it has classified as public.

## Deploying

`npm run build` writes a plain static site to `out/`. Any free static host works:

- **Vercel** — import the repo, no configuration needed.
- **Cloudflare Pages / Netlify** — build command `npm run build`, output
  directory `out`.
- **GitHub Pages** — serve `out/`, and if it lives under `https://user.github.io/<repo>`
  add `basePath: "/<repo>"` and `assetPrefix: "/<repo>"` to `next.config.ts`.

## How it works

### Seats

The board is a CSS grid, and each seat is rotated so it reads upright for the
player sitting on that edge of the phone. "Up" for a reader is the side of the
page furthest from them — lay a book on a table and the top of the text is the
far end — so a seat points its text away from that player's edge, toward the
middle of the device: near edge 0°, far edge 180°, left edge 90°, right edge
−90°. The arrangement changes with the player count — see `lib/seatLayout.ts`:

| Players | Arrangement |
| --- | --- |
| 2 | Facing each other across the device |
| 3 | Near edge, plus one on each side |
| 4 | Two columns — one player to each corner |
| 5 | Two columns — three down the left, two down the right |
| 6 | Two columns — three down each side |

A rotated element keeps its original box, so a quarter-turned panel has to be
authored with its width and height swapped. `PlayerSeat` does that purely in CSS
with `container-type: size` and `100cqh` / `100cqw` — no measuring, no resize
observers. Font sizes are container-query units too, so every panel scales itself.

### Colour identity

Each player carries their commander's colour identity, and the frame follows it
(`lib/identity.ts`):

- **Three or more colours turn the trim gold**, exactly as a real multicolour
  card does. Blending three hues into one border only makes mud.
- **The art box always keeps the real colours**, as a gradient. This is the point
  of splitting trim from wash: if gold applied to the whole panel, a pod of
  three-colour commanders would be six identical gold panels and nobody could
  pick out their own seat at a glance.
- **No colours is colourless**, a real identity with a silver frame and a diamond
  pip — not a missing value.

Pips are hand-drawn inline SVG in `components/ManaPip.tsx`: no icon font, no
network request, crisp at every panel size, and no Wizards artwork.

### Rules

All game rules live in one pure reducer, `lib/gameReducer.ts`. The full set is
specified in [docs/SPEC.md](docs/SPEC.md); the ones worth knowing up front:

- Starting life is 40 in Commander, 20 in Standard.
- Life is never clamped — players go negative and can gain back. Elimination is
  derived, not destructive; an eliminated player stays on the board so mistakes
  can be corrected.
- **Commander damage is real damage.** Adding 1 commander damage also removes 1
  life. Removing damage gives the life back. Pressing `−` on a counter already at
  zero does nothing at all — not to the counter, not to the life total.
- 21+ damage from a single commander eliminates a player regardless of life
  total. That is the case worth remembering: from 40 life, 21 commander damage
  leaves them at 19 and still out.
- Commander damage is only tracked and shown in Commander.
- Adding or removing a player re-syncs every damage map, so there are never
  stale entries for a departed player or missing entries for a new one.

### State

One `useReducer` in a context (`lib/useGame.tsx`), mirrored to `localStorage`
under `mtg-life-counter:v1` on a 250 ms debounce. Storage is read in an effect
after mount, never during render, so the prerendered HTML and the first client
render always agree; anything read back goes through `parseGameState` in
`lib/storage.ts`, which rejects junk and repairs damage maps.

### The clock

Elapsed time is derived from timestamps rather than counted in ticks
(`lib/timer.ts`), so locking the phone, backgrounding the app or reloading all
keep the right total.

A board comes up at 0:00 with the clock stopped. The Start button at the centre
of the board is what sets it running, and it takes itself away once the game is
under way — a game already being played has no use for it. Reset and a format
change put the clock back to zero and stopped, so the next game is timed from
the moment the table is ready rather than from the moment somebody cleared the
totals.

A clock that has never run is not stored as a flag: it is simply a stopped
clock with nothing on it (`hasStarted`), which is why saved games written
before the button existed still read correctly.

### Keeping the screen lit

`lib/useWakeLock.ts` holds a screen wake lock while the board is on screen, so
a phone lying face-up through somebody else's turn does not dim and lock. The
browser hands the lock back every time the page is hidden, so it is asked for
again whenever the page becomes visible rather than once at mount.

There is no permission prompt for this: the request is granted, refused
(battery saver, usually), or the API is not there at all — iOS before Safari
16.4, or any insecure origin. All three say so in the settings sheet, because a
screen that still goes black reads as a broken app unless it explains itself.

### Music

The settings sheet links out to YouTube or Spotify rather than playing anything
in the page (`lib/music.ts`). On a phone those links open the native app, which
owns background audio properly, so the music survives the counter staying on
screen and the phone locking. A player embedded in the page can do neither:
browsers suspend audio in a backgrounded tab, and using a hidden YouTube player
as a music source is against its terms of service. The links ship as searches,
not playlist ids — paste a real playlist URL over either one.

## Not in this version

Partner commanders (a second commander per player), poison/energy/experience
counters, undo history, and installable/offline PWA support. The state shape
leaves room for all of them — commander damage is already keyed per damage
source, which is what partner support needs.

These are open rather than forgotten; see `Deliberately not specified` in
[docs/SPEC.md](docs/SPEC.md), which is where a requirement for one of them goes
before it is built.
