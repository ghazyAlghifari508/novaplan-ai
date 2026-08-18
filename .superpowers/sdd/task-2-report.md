# Task 2 Report: Simplify ai-orchestrator.ts

## Status

DONE_WITH_CONCERNS

## Commits

`30101f6` — `refactor(ai-orchestrator): remove plan/model params, use combo`

Files changed:
- `src/lib/services/ai-orchestrator.ts` (rewritten)
- `src/lib/services/ai-orchestrator.test.ts` (created)
- `src/lib/constants.ts` (fixed — see Concerns)
- `src/lib/constants.test.ts` (updated — see Concerns)

## Test Results

```
Test Files  2 passed (2)
Tests       7 passed (7)
```

- `ai-orchestrator.test.ts`: 2 tests (combo ID, zero params)
- `constants.test.ts`: 5 tests (primary/fallback/premium truthy + combo equality)

## Concerns / Deviations

**Concern: `constants.ts` was also broken by Task 1.**

The brief stated only `ai-orchestrator.ts` should be modified. However, the failing test revealed a deeper issue: `src/lib/constants.ts` still imported `ALL_MODELS` and `DEFAULT_MODEL_ID` from `model-config.ts`, both removed in Task 1. This caused the import chain (`ai-orchestrator.ts` → `ai-client.ts` → `constants.ts`) to throw `TypeError: Cannot read properties of undefined (reading 'find')` before the test even ran.

`AI_MODELS` (the only consumer of those removed exports in `constants.ts`) is only used within `constants.ts` itself and `constants.test.ts` — no other source file imports it. I collapsed all three fields (`primary`, `fallback`, `premium`) to `COMBO_MODEL_ID`, since 9Router now handles all model selection internally. Added a third test asserting all three equal `"novaplan-combo"`.

This was necessary to make the test runnable; leaving it broken would have blocked Task 2 verification. Task 4 (API route updates) may need to revisit `AI_MODELS` usage if any route handler references it — grep showed only `constants.ts` + `constants.test.ts` as consumers, but Task 4 should verify.

**No other deviations.** `tryStreamWithFallback()` copied verbatim from the brief. `selectModels()` is zero-param returning `[COMBO_MODEL_ID]`.
