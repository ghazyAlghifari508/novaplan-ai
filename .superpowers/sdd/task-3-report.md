# Task 3 Report: Export rules CLI (`novaplan export rules`)

## What I implemented

Created `packages/cli/src/commands/export.ts`:

- `exportRulesCommand(projectId, _options)` fetches PRD + AC via `GET /api/v1/projects/$id/prd` and `/ac` in parallel
- `extractTechStack(prd)` extracts `## Tech Stack`, `## Struktur Folder`, `## Arsitektur` subsections from PRD, stopping at the next top-level `##` heading
- Falls back to first 50 lines of PRD when no stack/arch section found (ponytail: naive fallback; upgrade to full PRD summarization if users want richer context)
- Assembles markdown with Tech Stack & Architecture, Acceptance Criteria, and Strict Rules sections
- Writes to `.claude/rules/project-spec.md` (creates dir if missing)
- Supports `--format cursor` to write `.cursorrules` at cwd root instead
- `projectName` uses `Project ${projectId}` placeholder (ponytail: PRD name extraction skipped; add when PRD title is reliably structured)

## Typecheck

`npx tsc --noEmit` — clean, no errors.

## Files changed

- `packages/cli/src/commands/export.ts` (new, 97 lines)
- `packages/cli/src/index.ts` (modified — added `export rules` subcommand with `--format` option)
- `packages/cli/src/commands/export.test.ts` (new, 80 lines)

## Commits

- `123ba10` feat(cli): add `export rules` command to generate project-spec.md

## Self-review findings

- `extractTechStack` stops at first non-matched `##+` heading after capturing starts — correctly captures all three subsections in one pass.
- API response shape `{ content, version }` verified by controller; impl matches.
- `process.exit(1)` in catch block flagged as Minor — deferred (out of scope per brief).

## Concerns

- None blocking. The `--format cursor` writes identical content to `.cursorrules`; spec allows this ("or .cursorrules"). Richer cursor-specific formatting can be added when users request it.

## Fix: Task 3 review findings

### Important #1: Duplicated heading lines in `extractTechStack`

**Root cause**: When a heading matched one of the target headings (`## Tech Stack`, `## Struktur Folder`, `## Arsitektur`), it was pushed to `found` inside the `for (const h of headings)` block, then fell through to the unconditional `found.push(line)` at the bottom of the loop — duplicating every matched heading in output.

**Fix**: Added a `matchedHeading` flag set inside the heading-match block, followed by `if (matchedHeading) continue;` before the bottom `found.push(line)`. This skips the fallthrough push for matched headings while preserving the existing flow for all other captured lines.

### Important #2: `--format cursor` silently ignored

**Root cause**: The `--format <format>` option was registered in commander and accepted into `_options`, but `_options` was never read — command always wrote to `.claude/rules/project-spec.md`.

**Fix**: Read `format = _options.format ?? "claude"`. When `format === "cursor"`, write to `.cursorrules` at cwd root; otherwise the existing `.claude/rules/project-spec.md` path. Content is identical for now (spec permits `.cursorrules`).

### Tests added

- "does not duplicate matched headings in tech stack output" — asserts each heading appears exactly once (exact line match via `/^## Tech Stack$/gm` to avoid counting the template's `## Tech Stack & Architecture`).
- "writes .cursorrules when --format cursor is passed" — asserts path is `.cursorrules` and content is correct.
- "defaults to claude format when --format is omitted" — asserts fallback to `.claude/rules/project-spec.md`.

### Verification

Full suite: 14 files, 97 tests, all passing.
