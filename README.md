# MTG Life Counter

A life and commander damage tracker for 2–6 player Magic: The Gathering games,
built for a phone lying flat in the middle of the table.

Static Next.js app — no server, no accounts, no network calls at runtime.

## Running it

```bash
npm run dev
```

Then open http://localhost:3000. To use it on your phone while developing, run
`npm run dev -- -H 0.0.0.0` and visit `http://<your-computer-ip>:3000` from the
phone on the same Wi‑Fi.

```bash
npm test      # reducer / rules unit tests
npm run lint
npm run build # static export into out/
```

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

### Rules

All game rules live in one pure reducer, `lib/gameReducer.ts`, which is what the
test suite covers:

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

## Not in this version

Partner commanders (a second commander per player), poison/energy/experience
counters, undo history, and installable/offline PWA support. The state shape
leaves room for all of them — commander damage is already keyed per damage
source, which is what partner support needs.
