# Credit Exhaustion UX Fix — Design

**Date:** 2026-08-05
**Status:** Approved (design), pending spec review

## Problem

Bug report (user, verbatim): "ini aneh banget coba kamu cari tau penyebab errornya apa dan deepaudit ya. pokoknya gw mau fitur pricing dan kredit ini berjalan mulus flownya tanpa error 1 pun!"

User on `hengker` plan, credits exhausted, creates new project → answers onboarding → clicks "Generate PRD". `LimitModal` ("Kredit Habis") correctly appears, but the page has already navigated to `/prd/$id`, which renders a misleading fallback error ("PRD Gagal Dibuat" / "Gangguan pada model AI...") behind/around the modal.

**Root cause** (`src/components/chat/chat-panel.tsx`, `streamApiCall`, lines 305-323):

```ts
if (!response.ok) {
  const err = await response.json();
  setStreaming(false);
  setGeneratingPRD(false);        // <-- fires first
  isSubmittingRef.current = false;

  if (response.status === 403 && err.code === "NO_CREDITS") {
    setLimitErrorMsg(err.error || "Kredit habis");
    setShowLimitModal(true);       // <-- correct modal fires second
  } else if (...) { ... }
  return;
}
```

`setGeneratingPRD(false)` fires unconditionally before the credits branch runs. `prd-detail.tsx`'s fallback UI reads `isGeneratingPRD === false` + no PRD content and renders the generic AI-failure error, which the user sees layered with (or flashing before) the correct "Kredit Habis" modal.

The same duplicate pattern exists in `ac-detail.tsx` (lines 96-106) and `task-detail.tsx` (lines 101-111): on 403 `NO_CREDITS`, both `showToast(...)` then `router.push("/pricing")` — a jarring redirect that abandons the in-progress project page and loses the resume context entirely.

## Scope

Four changes, all in the same credit-exhaustion surface:

1. Stop the misleading fallback error from ever showing when the real cause is credits-exhausted.
2. Replace `LimitModal` (and AC/Task's redirect-to-`/pricing` behavior) with a shared `CreditExhaustedModal` that embeds `PricingComponent` directly and auto-resumes the interrupted operation after payment — no navigation away from the project page.
3. History page resume logic: clicking a halted-by-credits project either shows the credits-exhausted state immediately (still no credits) or a manual "Lanjutkan" trigger (credits now available) — never auto-fires generation on landing.
4. Delete the obsolete Pro/Hengker plan badge from Settings → Profile (leftover from the pre-credit lifecycle-plan system).

## D1 — New store field

`src/store/index.ts`, `ChatState` — add one field, purely additive (verified current shape has no such field):

```ts
interface ChatState {
  // ...existing fields unchanged...
  creditsExhausted: { stage: "prd" | "ac" | "task"; message: string } | null;
  setCreditsExhausted: (v: ChatState["creditsExhausted"]) => void;
}
```

`chatInitialState.creditsExhausted = null`. `resetChat` clears it (already resets to `chatInitialState`).

## D2 — Fix the misleading-error root cause

`chat-panel.tsx` `streamApiCall`, NO_CREDITS branch: replace `setLimitErrorMsg` + `setShowLimitModal(true)` with `setCreditsExhausted({ stage: "prd", message: err.error || "Kredit habis" })`. Do **not** change the `setGeneratingPRD(false)` ordering — instead, `prd-detail.tsx`'s fallback-error condition must additionally check `!creditsExhausted` before rendering the generic error, so the two states become mutually exclusive by construction rather than by fixing a race.

`ac-detail.tsx` / `task-detail.tsx`: replace the `router.push("/pricing")` branch with `setCreditsExhausted({ stage: "ac"|"task", message })` and stop showing the toast for this case (the modal communicates it).

## D3 — Resume-intent sessionStorage helpers

`src/lib/prompt-handoff.ts` — new helpers, following the file's established conventions exactly (SSR-safe `getStorage()` guard, try/catch JSON.parse with `removeItem` fallback on corruption, consume-pattern removes on read):

```ts
const RESUME_INTENT_KEY = "novaplan:resume-intent";
interface ResumeIntentPayload {
  projectId: string;
  stage: "prd" | "ac" | "task";
  createdAt: number;
}
const RESUME_INTENT_MAX_AGE_MS = 15 * 60 * 1000; // survives full Midtrans redirect round-trip

export function saveResumeIntent(projectId: string, stage: "prd" | "ac" | "task"): void { ... }
export function consumeResumeIntent(projectId: string): "prd" | "ac" | "task" | null { ... }
```

`consumeResumeIntent` returns null (and clears the key) if `projectId` doesn't match or the payload is older than `RESUME_INTENT_MAX_AGE_MS` — mirrors `SetupPromptPayload`'s expiry check exactly.

## D4 — `/api/payments/create` returnUrl support

`src/routes/api/payments/create.ts` currently hardcodes (line 73):

```ts
finish: `${safeOrigin}/pricing?payment=success&order_id=${orderId}`,
```

Change: accept optional `returnUrl` in the request body, validate it's a same-origin project-internal path via `isValidHistoryUrl` (imported from `flow-progress.ts` — already handles the `/(ask|prd|ac|task|kanban)/<uuid>` allowlist + anti-spoof UUID match), fall back to `/pricing` if absent/invalid:

```ts
const { planId, returnUrl, projectId } = await request.json();
// ...
const finishPath =
  returnUrl && projectId && isValidHistoryUrl(returnUrl, projectId)
    ? returnUrl
    : "/pricing";
const finishUrl = `${safeOrigin}${finishPath}${finishPath.includes("?") ? "&" : "?"}payment=success&order_id=${orderId}`;
```

`CreditExhaustedModal`'s embedded purchase flow calls `/api/payments/create` with `returnUrl: window.location.pathname` (e.g. `/prd/<id>`) and `projectId`, and calls `saveResumeIntent(projectId, stage)` immediately before redirecting to Midtrans.

## D5 — `CreditExhaustedModal` (replaces `LimitModal`)

New file `src/components/chat/credit-exhausted-modal.tsx`. Structure mirrors `LimitModal` (same overlay/card shell, same `AlertCircle` icon, same close-on-backdrop-click), but body replaces the two-button footer with an embedded `PricingComponent` (imported from `src/components/ui/pricing-card.tsx`):

```ts
interface CreditExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  projectId: string;
  stage: "prd" | "ac" | "task";
  currentPlan: string;
}
```

On mount (isOpen transition to true), fetch current plan same as `PricingWrapper` does (`/api/user/plan`) if `currentPlan` isn't passed reliably from parent — reuse `PricingWrapper`'s exact fetch-on-mount effect pattern. On plan select: same `handlePlanSelect` as `PricingWrapper`, except call `/api/payments/create` with `{ planId, returnUrl: currentPath, projectId }` and `saveResumeIntent(projectId, stage)` before `window.location.href = data.redirect_url`.

Delete `src/components/chat/limit-modal.tsx` after `chat-panel.tsx`'s only usage (lines 1047-1052, confirmed sole reference) is swapped to `CreditExhaustedModal`.

## D6 — Wire `CreditExhaustedModal` into the three detail pages

- `chat-panel.tsx`: replace `<LimitModal isOpen={showLimitModal} ... />` with `<CreditExhaustedModal isOpen={!!creditsExhausted} stage="prd" projectId={...} errorMessage={creditsExhausted?.message} onClose={() => setCreditsExhausted(null)} />`, reading from the new store field (D1/D2).
- `ac-detail.tsx` / `task-detail.tsx`: add local `creditsExhausted` state (or reuse the Zustand field with stage `"ac"`/`"task"` — Zustand chosen for consistency, single source of truth across the 3 stages), render `CreditExhaustedModal` in place of the removed toast+redirect.

## D7 — Auto-resume after payment

Each of `prd-detail.tsx` (loads inside `/ask/$id` → PRD chat flow, actually `chat-panel.tsx` is the PRD orchestrator, mounted on `/prd/$id`), `ac-detail.tsx`, `task-detail.tsx` adds an effect mirroring `PricingWrapper`'s existing sync-on-return pattern (`pricing-card.tsx` lines 309-337):

```ts
useEffect(() => {
  const orderId = searchParams.get("order_id");
  const payment = searchParams.get("payment");
  if (!orderId || payment !== "success") return;
  (async () => {
    const res = await syncPaymentStatus({ data: orderId });
    if (!res.success) return;
    const resumedStage = consumeResumeIntent(projectId);
    if (resumedStage === "prd") handleSend(); // or equivalent generate trigger for that stage
    else if (resumedStage === "ac") handleGenerate();
    else if (resumedStage === "task") handleGenerate();
    router.replace(window.location.pathname); // strip query params
  })();
}, [searchParams]);
```

Each page wires this to its own existing generate function (`chat-panel.tsx`'s PRD-generate path, `ac-detail.tsx`'s `handleGenerate`, `task-detail.tsx`'s `handleGenerate`) — no new generation logic, only a triggered call into what already exists. `consumeResumeIntent` returning null (wrong project, expired, or no intent saved) means no auto-trigger — user lands on the page normally.

## D8 — History resume logic (no auto-generate on cold landing)

Extend `HistoryItem` (`src/routes/history.tsx`) with `acStatus`/`taskStatus` (columns already exist on `projects`, just not selected/exposed today — verified `src/db/schema.ts:113-114`):

```ts
export interface HistoryItem {
  id: string;
  name: string;
  step: string | null;
  lastUrl: string | null;
  updatedAt: Date;
  preview: string | null;
  acStatus: string | null;
  taskStatus: string | null;
}
```

Add `acStatus: projects.acStatus, taskStatus: projects.taskStatus` to the `loadHistory` SQL select and to the mapped `items` array.

**Halted-by-credits signal:** a project is "halted mid-generation" when its `step` is at/past a stage whose status is still `"pending"` (never flipped to `"generating"` successfully-completed or "completed") — i.e. `step === "ac" && acStatus === "pending"`, or `step === "task" && taskStatus === "pending"`. This reuses existing columns; no new DB field.

**`history-page.tsx` click handling:** intercept the card's `<a>` click when the target item is halted (per above). On click:
1. Call `/api/user/plan` (or a lighter credits-check endpoint) to check current `remaining` credits.
2. If `remaining === 0` (or `"unlimited"` is falsy and remaining is 0): navigate to the resolved URL as normal, but set a one-shot sessionStorage marker (new helper `saveSuppressAutoGen(projectId)` in `prompt-handoff.ts`, same convention as D3) so the landing page's auto-generate effect skips firing, and immediately show the credits-exhausted modal state (reuse `CreditExhaustedModal` via the Zustand field, pre-populated for that stage) instead of letting the page attempt generation.
3. If `remaining > 0`: navigate normally, set the same suppress-marker (auto-generate must not silently fire without an explicit user action even when credits exist — matches the approved decision: manual button, not auto-generate), and the landing page shows a "Lanjutkan Generate" button instead of the auto-generate effect firing.

**`ac-detail.tsx` / `task-detail.tsx` auto-generate effects**: both gated by `hasAutoGenerated.current` ref (existing). Add a check at the top of the effect: if `consumeSuppressAutoGen(projectId)` returns true (one-shot, clears itself), skip the auto-generate for this landing (do NOT set `hasAutoGenerated.current = true` — a manual click should still work normally afterward since the effect's dependency array won't re-fire on its own, so the manual "Lanjutkan" button calls `handleGenerate()` directly, bypassing the effect entirely).

## D9 — Settings/Profile badge removal

`src/components/settings/profile-form.tsx`: delete the badge `<span>` block (lines 60-71) and the `plan?: string` field from the `profile` prop type (line 12).

`src/routes/settings/profile.tsx`: remove the `subscriptions` query (lines 13-14: `db.select({ plan, status }).from(subscriptions)...` and the `plan` computation), remove `plan` from `loadProfile`'s return value and from the `profile` object passed to `<ProfileForm>` (line 45). Remove now-unused `subscriptions` import from `@/db/schema` (verify no other use in the file — confirmed file is only 51 lines, `subscriptions` used solely for this).

## Files touched (summary)

| File | Change |
|---|---|
| `src/store/index.ts` | Add `creditsExhausted` field (D1) |
| `src/components/chat/chat-panel.tsx` | Fix NO_CREDITS branch (D2), swap modal (D6), add resume effect (D7) |
| `src/lib/prompt-handoff.ts` | Add resume-intent + suppress-autogen helpers (D3, D8) |
| `src/routes/api/payments/create.ts` | Add `returnUrl`/`projectId` support (D4) |
| `src/components/chat/credit-exhausted-modal.tsx` | New file (D5) |
| `src/components/chat/limit-modal.tsx` | Delete (D5) |
| `src/components/ac/ac-detail.tsx` | Fix 403 branch, wire modal, add resume effect, suppress-autogen check (D2, D6, D7, D8) |
| `src/components/task/task-detail.tsx` | Same as ac-detail (D2, D6, D7, D8) |
| `src/routes/history.tsx` | Add `acStatus`/`taskStatus` to `HistoryItem` + query (D8) |
| `src/components/history/history-page.tsx` | Click-intercept + credits-check logic (D8) |
| `src/components/settings/profile-form.tsx` | Remove badge (D9) |
| `src/routes/settings/profile.tsx` | Remove plan loader logic (D9) |

## Testing

- Manual E2E per skill instructions (start dev server, exercise in browser): exhaust credits → generate PRD → confirm only `CreditExhaustedModal` shows, no fallback error flash.
- Buy credits inside modal → confirm redirect to Midtrans sandbox → confirm return lands back on the same project page and auto-resumes generation (no manual re-click needed).
- History: halted-by-credits project with 0 credits → click → immediate credits-exhausted state, no generation attempt. Same project after topping up → click → manual "Lanjutkan" button shown, no auto-fire.
- Settings/Profile: badge no longer rendered, page still loads without error (no orphaned `plan` reference).
