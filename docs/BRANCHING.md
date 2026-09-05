# Branches and what guards them

`main` is production — the host builds from it. Nothing reaches it that has not
been through `development` and a green test run.

```
feature branch ──PR──▶ development ──PR──▶ main ──▶ production
   (cut from            (everything          (release)
    development)         accumulates)
```

| | `development` | `main` |
| --- | --- | --- |
| Direct pushes | blocked — pull request required | blocked — pull request required |
| CI (`ci`) must pass | yes | yes |
| Vercel build must succeed | yes | yes |
| Approving reviews | 0 | **1**, from someone with write access |
| Branch must be up to date first | no | yes |
| Force push / delete | blocked | blocked |
| Admin can bypass | yes | yes |

Two gates, deliberately uneven. Both branches demand the same of a machine: a
green test run, and a build that actually deploys. What `main` adds is a
person — the release is the one that changes what players see, so somebody
signs it off. Day-to-day work into `development` never waits on the other
person to be awake.

## Why each rule is there

- **Pull request required.** No direct pushes to either branch, so every change
  is visible before it lands and CI has something to run against.
- **`ci` must pass** — lint, the full test suite, and the production build. The
  build is part of it on purpose: it runs TypeScript and proves the static
  export still comes out, and that export is what the host serves. See
  [`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
- **`Vercel` must succeed, on both branches.** The host's own build, so nothing
  merges on a green test run while the thing that actually ships fails to
  deploy. On `development` it catches a broken build at the feature that caused
  it, rather than at the release, when it is somebody else's problem to unpick.
  Two details worth being precise about:
  - The required context is **`Vercel`** — the deployment status, whose
    description reads "Deployment has completed". Vercel also posts a check
    named `Vercel Preview Comments`, which only manages the comment on the pull
    request. Requiring that one would gate releases on a comment bot.
  - It is a **preview** deployment being gated, not the production one. Vercel
    builds the release pull request as a preview; production deploys after the
    merge. Nothing can gate a deploy on itself — what this buys is that a build
    which fails cannot reach `main` in the first place.
- **One approving review on `main`.** GitHub only counts approvals from users
  with write access or above, which is exactly "contributors of the repo".
- **Up to date before merging, on `main` only.** This forces the release PR to
  be rebuilt against the current `main`, so the thing that was tested is the
  thing that ships. It is off for `development` because it would mean rebasing
  every feature PR whenever anything else merges, which is friction for no
  safety on an integration branch.
- **Dismiss stale approvals on `main`.** New commits after an approval drop it.
  Otherwise "approved" can quietly come to mean "approved something else".
- **No force pushes, no deletion.** Both branches are shared history.
- **Admins can bypass.** With one admin on the repo, absolute rules mean a
  broken CI runner — or a Vercel integration that stops reporting — blocks
  every merge, on both branches, not just a production hotfix. Two required
  checks on two branches is four things that can jam. The bypass is an escape
  hatch, not a habit; it is recorded in the rules' audit log.

## Applying them

**Only a repository admin can do this** (`FedeAtadia` — `Saparipitopo` has
write, which is not enough). Either method works; the JSON is the same.

### With the CLI

```bash
gh api --method POST repos/FedeAtadia/mtg-life-counter/rulesets --input .github/rulesets/development.json
```

```bash
gh api --method POST repos/FedeAtadia/mtg-life-counter/rulesets --input .github/rulesets/main.json
```

### Or in the browser

**Settings → Rules → Rulesets → New ruleset → Import a ruleset**, then upload
`.github/rulesets/development.json` and `.github/rulesets/main.json`.

If the import objects to the bypass entry, drop `bypass_actors` from the file
and add it afterwards in the ruleset's **Bypass list → Repository admin**. The
`actor_id: 5` in these files is GitHub's id for the repository admin role.

### Do it in this order

The `ci` check can only pass once the workflow exists on the branch being
merged into. So:

1. Merge this branch into `development` (its CI is already green).
2. Open `development` → `main` and merge that, so `main` has the workflow and
   the tests before it is guarded.
3. Apply both rulesets.

Applying them earlier is not dangerous — a pull request runs the workflow from
its own head, so a branch carrying `ci.yml` still reports the check. But a PR
opened from a branch cut *before* the workflow existed will never report `ci`
and will sit blocked until it is rebased.

## Checking it took

```bash
gh api repos/FedeAtadia/mtg-life-counter/rulesets --jq '.[] | "\(.name) — \(.enforcement)"'
```

```bash
gh api repos/FedeAtadia/mtg-life-counter/rules/branches/main --jq '.[].type'
```

The second command lists the rules actually in force on `main`, which is the
one worth trusting — it accounts for enforcement status and your own bypasses.

## Day to day

```bash
git checkout development && git pull
```

```bash
git checkout -b feat/whatever
```

```bash
gh pr create --base development
```

Cut every branch from `development`, never from `main` — a branch off `main` is
missing whatever has accumulated since the last release, and merging it back
into `development` drags that gap along with it.

Releasing is a pull request like any other:

```bash
gh pr create --base main --head development --title "Release"
```

## Worth considering later

- **A `CODEOWNERS` file**, if review should always route to a particular person
  rather than to whoever is around.
- **Squash-only merges into `development`**, if the feature-branch history
  turns out to be noisier than it is useful.

Changing behaviour is specified in [SPEC.md](SPEC.md); how to work on it is in
[WORKFLOW.md](WORKFLOW.md).
