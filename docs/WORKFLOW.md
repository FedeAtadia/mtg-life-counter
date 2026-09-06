# Working on this project

The rule: **behaviour is specified before it is built, and every requirement is
held up by a test.** [SPEC.md](SPEC.md) is the source of truth; the test suite
is the proof.

## The loop

1. **Write the requirement.** Add it to the right section of
   [SPEC.md](SPEC.md) with the next free id. One testable sentence. If you
   cannot state it in one sentence, it is more than one requirement.
2. **Write the test.** It should fail for the right reason — run it and read the
   failure before writing any code. A test that passes before the feature
   exists is testing nothing.
3. **Write the code.** The smallest change that makes the test pass.
4. **Check the whole suite**, not just your file. `npm test`.
5. **Check the build.** `npm run lint && npm run build`. The static export is
   the product.

Where that work lives — which branch to cut, what has to pass before it can
merge, and how a release reaches production — is [BRANCHING.md](BRANCHING.md).

Changing existing behaviour is the same loop, starting from editing the
requirement. Spec, test and code move in one commit — a requirement that no
longer matches the code is worse than no requirement.

## Where things go

| Kind of thing | Where | Why |
| --- | --- | --- |
| Game rules | `lib/gameReducer.ts` | One pure reducer, so rules are testable without a DOM |
| Constants and derivations | `lib/rules.ts` | Shared by the reducer and the UI; never duplicated in a component |
| Anything that reads the clock | The event handler | Actions carry `at`; the reducer stays pure — see STATE-1 |
| Reading state back from storage | `lib/storage.ts` | Everything is validated before it becomes state |
| Presentation | `components/` | No rules here. If a component decides something, it belongs in `lib/` |

Two consequences worth stating plainly:

- **A component must never own a rule.** If you find yourself writing
  `life <= 0` in a panel, it belongs in `lib/rules.ts` where the tests and the
  rest of the app can see it.
- **The reducer must never call `Date.now()`.** Actions that touch the timer
  carry the time. This is what makes every timer requirement testable.

## Writing tests here

Tests sit next to what they test (`lib/timer.ts` → `lib/timer.test.ts`).
`test/harness.tsx` holds the helpers for driving the real board.

**Name the behaviour, not the function.** `it("gives the life back when damage
is corrected downwards")` beats `it("handles negative delta")`. The test names
read as a description of the app, which is the point.

**Say why when the why is not obvious.** The existing tests carry short
comments explaining what would break if the rule were dropped. Keep that up —
it is what stops a future reader from "simplifying" a rule that exists for a
reason.

**Pick the right level:**

- Pure logic (`lib/*.ts` with no React) — call the function. Fast, and most of
  the suite lives here.
- Hooks — `renderHook`, with `vi.useFakeTimers()` for anything timed.
- Anything the player touches — go through the board with `renderBoard()` from
  `test/harness.tsx`. Components take their player as a prop but dispatch
  through the context, so a panel mounted alone shows a total that never moves.

**Four things that will catch you out:**

- **Fake timers need `act`.** `act(() => vi.advanceTimersByTime(ms))`, or React
  will not flush the state update. `fireEvent` wraps itself already.
- **React batches inside one `act`.** Five interval ticks in a single block
  repaint once. To count repaints, advance one period per `act`.
- **`renderBoard(state)` seeds storage**, so the provider hydrates that state
  rather than dealing a fresh board — including its timer. Pass a running timer
  if the test needs a running clock (see TIMER-4).
- **`localStorage` in tests is ours, not jsdom's.** Node ships its own Web
  Storage — on by default from Node 24 — and it shadows jsdom's with something
  that is not a Storage at all. `vitest.setup.ts` replaces it with a small
  in-memory one so the suite runs the same on any Node. It is writable, so
  spying on it or making it throw still works.

## Commands

```bash
npm test          # the whole suite, once
npm run lint
npm run build     # static export into out/ — this is the product
npm run dev
```

```bash
npx vitest        # watch mode while working
```

```bash
npx vitest run lib/gameReducer.test.ts -t "commander damage"
```

## A worked example

Adding poison counters, start to finish.

**1 — Specify.** In [SPEC.md](SPEC.md), a new section:

> ## POISON — Poison counters
>
> - **POISON-1** Each player carries a poison counter, starting at zero.
> - **POISON-2** Ten or more poison eliminates a player whatever their life
>   total.
> - **POISON-3** Poison is not damage: it never changes a life total.
> - **POISON-4** A saved game from before poison existed loads with every
>   counter at zero rather than being rejected.

Add the elimination reason to **OUT-1** in the same edit, and note in
`Deliberately not specified` that poison has moved out of that list.

**2 — Test, and watch it fail.** In `lib/rules.test.ts`:

```ts
it("eliminates at ten poison whatever the life total", () => {
  expect(eliminationReason(player({ life: 40, poison: 10 }), "commander"))
    .toBe("10 poison");
});
```

**3 — Build it,** in this order, because each step is a smaller blast radius
than the next:

- `lib/types.ts` — `poison: number` on `Player`, and a `ADJUST_POISON` action.
- `lib/rules.ts` — `LETHAL_POISON`, and the new branch in `eliminationReason`.
- `lib/gameReducer.ts` — the action, and `poison: 0` in `createPlayer`.
- `lib/storage.ts` — parse it, defaulting to zero. That is POISON-4, and it is
  the step most easily forgotten: bump nothing, just default it.
- `components/` — somewhere to press.

**4 — Cover the rest of the requirements** at the level each belongs to:
POISON-3 in `lib/gameReducer.test.ts`, POISON-4 in `lib/storage.test.ts`, and
the pressing in `components/PlayerPanel.test.tsx`.

**5 — Verify.** `npm test && npm run lint && npm run build`.

## Before opening a pull request

- Every new or changed behaviour has a requirement id in [SPEC.md](SPEC.md).
- Every requirement you added or changed has a test that fails without your
  code.
- `npm test`, `npm run lint` and `npm run build` all pass.
- No rule leaked into a component.
- If you changed the saved state shape, old saves still load — or are migrated,
  never rejected (SAVE-5).
- If a requirement turned out to be untestable here, it is written down under
  `Known gaps` in [SPEC.md](SPEC.md) rather than left implied.
