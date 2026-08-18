# Task 3 Report — perf(ac): extract markdown components to module-scope const

## Summary

Extracted the inline `components={{ h2, h3, h4 }}` object from the `<Markdown>` JSX in `src/components/ac/ac-viewer.tsx` into a module-scope `const markdownComponents`. This prevents the inline object from being re-created on every render, eliminating a source of unnecessary re-renders in the memoized `AcViewer` component.

## Review Fix

The original commit `731c5f5` (later amended to `4884b4d`) was a mixed commit: it included a pre-existing dirty hunk that added `type="button"` to the error-retry button in the `hasError && !displayContent` branch. That is a functional accessibility change, not a performance optimization, and did not belong in this commit.

Per review feedback, the `type="button"` addition was removed from `ac-viewer.tsx` and the commit was amended. The final commit `4884b4d` now contains **only** the markdownComponents extract:

- Added `const markdownComponents = { h2, h3, h4 }` at module scope
- Changed `<Markdown components={{...}}>` to `<Markdown components={markdownComponents}>`
- The error-retry button no longer carries `type="button"` (matches HEAD~1 state)

## Files Changed

- `src/components/ac/ac-viewer.tsx` — only file changed (+31, -29)

## Test Results

```
$ DATABASE_URL="postgresql://test:test@localhost:5432/test" npx vitest run

RUN  v4.1.10 C:/Coding/Web Development/Tanstack-start/novaplan

 Test Files  14 passed (14)
      Tests  98 passed (98)
   Start at  11:06:46
   Duration  916ms (transform 958ms, setup 0ms, import 2.38s, tests 103ms, environment 4ms)
```

## Commits

- `4884b4d perf(ac): extract markdown components to module-scope const` (amended from `731c5f5`, original message preserved)

## Self-Review

- Commit is now a single-concern performance extract; no functional hunks mixed in.
- `memo(function AcViewer` wrap untouched.
- `markdownComponents` module-scope const present; `components={markdownComponents}` applied.
- No `--no-verify` used; no unrelated dirty files added.
- Report accurately describes the commit contents (was previously wrong: called the dirty hunk "whitespace/formatting" when it was `type="button"`).
