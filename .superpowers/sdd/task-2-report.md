# Task 2 Report — CLI `novaplan task next` AC Context

**Status:** DONE
**Commit:** `6d1abc2` — feat(cli): display matched acceptance criteria in novaplan task next

## What changed

- `packages/cli/src/commands/task.ts`
  - `TaskResponse` interface: added `acContext: string | null;`
  - `taskNextCommand` only: after the Subtasks block and before the "Mulai:" hint,
    if `task.acContext?.trim()` is truthy, prints:
    ```
      Acceptance Criteria (AC):
        <line 1>
        <line 2...>
    ```
    (header in `chalk.yellow`, content lines in `chalk.white`, split on `\n` so
    multi-line AC text stays readable). Null/undefined/empty/whitespace-only
    `acContext` → no output, no message (matches brief: silence is correct).
  - `taskListCommand` and `taskUpdateCommand` untouched — confirmed via diff review.
- `packages/cli/src/commands/task.test.ts` (new) — 3 tests for `taskNextCommand`.
- `vitest.config.ts` — added `"packages/cli/src/**/*.test.ts"` to `test.include`.
- `package.json` — added `chalk: 5.6.2` as a root devDependency (see "Unexpected
  blocker" below).
- `pnpm-lock.yaml` — updated by `pnpm add` (see concern below).

## Test approach (brief's option 2, chosen deliberately)

Brief offered two options: extract a pure `formatTaskDetails()` helper, or mock
`api-client` + spy on `console.log`. I picked the mock/spy approach:

- `taskNextCommand`'s only untestable parts are the network call and the final
  `process.exit(1)` in the catch block — neither is exercised by the happy-path
  AC-rendering behavior under test.
- Extracting a formatter would touch the function's structure (new exported
  symbol, call site change) for a feature that's inherently about *what gets
  logged*, which `vi.spyOn(console, "log")` already observes directly.
- Net diff: 1 new test file, 0 refactor risk to existing command behavior.

3 tests, all passing:
1. AC block appears with `acContext` present (checks header text + content).
2. No AC block when `acContext: null`.
3. No AC block when `acContext` is whitespace-only (`"   "`) — covers the
   trim-before-check requirement.

## Verification

- `npx vitest run` (full suite, run from repo root per corrected instructions):
  **13 files / 91 tests passed**, 0 failures.
- `npx biome check packages/cli/src/commands/task.ts packages/cli/src/commands/task.test.ts vitest.config.ts`:
  clean (exit 0) after normalizing the 3 touched files from CRLF→LF (see below).
  `vitest.config.ts` is outside biome's configured include set, so it reports
  "Checked 2 files" — expected, not an error.

## Unexpected blocker: `chalk` was not resolvable from the test run

The brief's corrections already flagged that `packages/cli` isn't a pnpm
workspace member and has no `node_modules`. What the brief didn't anticipate:
running `vitest` from repo root and importing `task.ts` (which does
`import chalk from "chalk"`) fails at module resolution, because:

- `packages/cli`'s own `chalk`/`commander` dependencies exist in the pnpm
  virtual store (`node_modules/.pnpm/chalk@5.6.2`) but are **not** symlinked to
  a `node_modules/chalk` anywhere reachable from `packages/cli/src/commands/`,
  since `packages/cli` isn't a workspace importer.
- Root `node_modules` also had no `chalk` (root `package.json` never listed it).

I verified this empirically (ran the test before installing anything — got
`Error: Cannot find package 'chalk'`), then added `chalk@5.6.2` (same version
already present in the lockfile, via `--save-exact` implied by pinning the
version) as a root devDependency. Confirmed the test then imports and runs
correctly.

## Concern: `pnpm-lock.yaml` diff is larger than expected

`git status` at the start of this task already showed `pnpm-lock.yaml` and
`package.json` as modified (pre-existing, not from this task). Running
`pnpm add -D chalk@5.6.2` triggered pnpm to also re-resolve several unrelated
`@tanstack/*` packages to newer caret-range-satisfying versions in the
lockfile (package.json itself only gained the one `chalk` line — verified via
`git diff -- package.json`, clean). This looks like pnpm reconciling
pre-existing lockfile/package.json drift that was already sitting uncommitted
in this worktree before I started, not something my single `pnpm add` command
chose to change on its own. I did not attempt to hand-edit the lockfile to
undo those bumps — that's riskier than leaving pnpm's own resolution in place,
and the full test suite still passes after the change. Worth a second look if
those `@tanstack/*` bumps weren't already intended by other in-flight work on
this branch.

## Side note: fixed CRLF line endings on the 3 files I touched

`core.autocrlf=true` on this Windows checkout means on-disk files are CRLF
while git blobs are stored LF — this affects the *entire* repo (verified
`npx biome check src/lib/prompts-task.ts`, an untouched file, fails the same
way) and is pre-existing, out of this task's scope to fix repo-wide. I did
normalize the 3 files I actually edited (`task.ts`, `task.test.ts`,
`vitest.config.ts`) to LF before committing, since biome flagged them and it
was a one-line `sed` fix scoped to files already in my diff — not a
repo-wide cleanup.

## Scope self-check

- Only `taskNextCommand` behavior changed in `task.ts`. `taskListCommand` and
  `taskUpdateCommand` diffs: none (confirmed via `git diff`).
- No new files beyond the one test file requested.
- `vitest.config.ts` change is exactly the one glob string, as instructed.

## Fix: Task 2 review findings

**Status:** DONE
**Commit:** `fix(cli): address Task 2 review findings` (separate from `6d1abc2`, not pushed, not amended)

### Changes

1. **`packages/cli/src/commands/task.test.ts:23`** — `loggedText` now uses `call.map(String).join(" ")` instead of `call.join(" ")`, so it no longer assumes each `console.log` call is a single string arg. Future multi-arg calls won't silently drop the join.

2. **`packages/cli/src/commands/task.ts:134`** — Header changed from `"Acceptance Criteria (AC):"` to `"Acceptance Criteria:"` to match the brief verbatim.

3. **`packages/cli/src/commands/task.test.ts`** — Added one test for multi-line `acContext` (`"Line 1\nLine 2\nLine 3"`), asserting each line renders as a separate indented line under the header. Also updated the three existing assertions to check for `"Acceptance Criteria:"` instead of `"Acceptance Criteria (AC)"`.

### Verification

- `npx vitest run packages/cli/src/commands/task.test.ts`: **4/4 passed** (was 3).
- `npx vitest run` (full suite): **13 files / 92 tests passed**, 0 failures (was 91).
- `pnpm-lock.yaml` / `package.json`: untouched (per out-of-scope instruction).
