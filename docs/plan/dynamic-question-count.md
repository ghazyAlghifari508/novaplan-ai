# Dynamic Non-Technical Question Count

## Problem
`ASK_OPTIONS_GENERATION_PROMPT` hardcodes "5-7 pertanyaan". AI always hits 7. Simple apps get over-questioned; complex apps under-questioned.

## Fix
AI selects question count based on prompt complexity. No code heuristic — prompt carries the decision.

### Tiers
- **Sederhana** (landing page, portfolio, single-feature tool): 3-4 questions
- **Menengah** (CRUD app, blog with auth, small dashboard): 5-6 questions
- **Kompleks** (multi-role SaaS, marketplace, real-time collab): 7-10 questions

### Changes

**`src/lib/prompts-ask.ts`** — rewrite rule 1:
- Remove "5-7" hardcode
- Add 3-tier guidance with examples
- Add rule: "JANGAN paksakan jumlah maksimum. Setiap pertanyaan harus menambah info yang benar-benar mengubah PRD. Jika ragu, tanyakan lebih sedikit."
- Keep JSON schema, pill options, non-tech constraints unchanged

**`src/lib/services/ask-service.ts`** — `parseAskOptionsJson`:
- Add bounds check: `< 3 || > 10` → return null (reject)
- Existing per-question validation unchanged

**`src/lib/services/ask-service.test.ts`** — add 2 cases:
- Rejects < 3 questions
- Rejects > 10 questions

### Not changed
- `ask-flow.tsx` — already handles dynamic `questions.length`
- `options.ts` route — already passes through whatever count AI returns
- `prompt-handoff.ts` — persistence already stores whatever questions exist
- `question-card.tsx` — renders N cards, no count assumption

## Verification
- `npx tsc --noEmit`
- `npx vitest run src/lib/services/ask-service.test.ts`
- Manual: prompt "portfolio landing page" → expect 3-4 questions; prompt "multi-tenant SaaS marketplace with realtime chat" → expect 7-10