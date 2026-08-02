# Refresh-Induced Data Loss Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the class of "/ask tolol bug" (browser refresh wipes generated state the user reasonably expects to survive) across the PRD generation flow, the onboarding wizard, and the home seed-prompt textarea.

**Architecture:** Two mechanical patterns, both already proven in-repo via the just-shipped `/ask` fix (`saveAskState`/`getAskState` at `src/lib/prompt-handoff.ts:120-162`):
1. **Client-side ephemeral-persistence** — debounce-snapshot React state to `sessionStorage`, replay on mount. Used for input drafts and multi-step form accumulators. No DB writes; tab-scoped; dies on tab close (correct — this is session work, not durable data).
2. **Server-side resilience** — stop the PRD generation stream from deleting the project + conversation row on client disconnect, and from dropping the originating user prompt. These are real DB-state holes, not just client UX.

A third concern (consume-before-success in `consumePendingPrdPrompt`) is deferred (see end of plan).

**Tech Stack:** TanStack Start (file-route server fns), React, `sessionStorage` (already the repo convention — `window.sessionStorage`, no localStorage anywhere in `src/`), Drizzle/PostgreSQL, Biome (not ESLint) for lint/format. No new dependencies.

## Global Constraints

- **No new dependencies.** `sessionStorage`, `useState`, `useEffect` only. The repo has no Debounce lib and no need for one — a 300ms `setTimeout` in an effect is the pattern (see `chat-panel.tsx` for existing effect idioms).
- **No `localStorage`.** Repo convention is `sessionStorage` exclusively (grep `localStorage` in `src/` → 0). Persisting these drafts across tab-close would be wrong: a stale onboarding or draft prompt re-appearing days later is a worse UX than losing it on tab close. Keep tab-scoped.
- **`sessionStorage` access is guarded** by `getStorage()` (`prompt-handoff.ts:23-26`) which returns `null` when `typeof window === "undefined"`. All new helpers MUST go through `getStorage()` or use the same `typeof window === "undefined"` guard, never raw `window.sessionStorage`.
- **Biome lint suppressions** use `// biome-ignore lint/<rule>: <reason>` directly above the offending construct (per repo convention, see `ask-flow.tsx:107`). The exhaustive-deps rule will fire on every debounce/replay effect here — suppress each with the real reason.
- **Backend changes (Tasks 1–2) are server-route edits** in `src/routes/api/chat.ts` and `src/lib/services/chat-service.ts`. These run server-side; no client-guard needed.
- **Test convention:** co-located `*.test.ts` (see `src/lib/constants.test.ts`, `src/utils.test.ts`). The backend services are pure functions (`rollbackStreamInserts` gate logic is testable in isolation; the chat API SSE handler is not unit-testable without heavy harness — verify by typecheck + manual dev-server probe instead, per existing project practice for SSE routes).
- **Never hand-edit `src/routeTree.gen.ts`** — run `pnpm generate-routes` if routes change (none of these tasks add/remove routes, so this won't be needed).
- **One commit per task.** Conventional-commit messages: `fix(chat): ...`, `feat(onboarding): ...`, etc.

## File Structure

| File | Responsibility | Touch |
|---|---|---|
| `src/lib/prompt-handoff.ts` | All sessionStorage helpers (setup prompt, prd prompt, ask state, **NEW** draft + onboarding keys). Single source of truth for storage keys. | Modify (Tasks 3,4,5) |
| `src/routes/api/chat.ts` | PRD generation SSE handler. **NEW**: gate rollback on abort; widen `saveMessages` to generate/resume. | Modify (Tasks 1,2) |
| `src/components/chat/chat-panel.tsx` | PRD chat input textarea. **NEW**: draft autosave/restore. | Modify (Task 3) |
| `src/components/layout/chat-input.tsx` | Home seed-prompt textarea. **NEW**: draft autosave/restore. | Modify (Task 4) |
| `src/components/auth/onboarding-form.tsx` | 3-step onboarding wizard. **NEW**: per-step accumulator persistence. | Modify (Task 5) |
| `src/lib/services/chat-service.ts` | Read-only reference for Task 1/2 (rollback + saveMessages signatures). | Reference only |

No new files. No DB migration. No `routeTree` regen.

---

### Task 1: Gate PRD-stream rollback on client abort (stop project deletion on refresh)

**The bug:** Refreshing mid-PRD-generation aborts the client `fetch`. The server's `ReadableStream` `controller.enqueue` at `chat.ts:147`/`:151` (those two delta-emit lines are NOT wrapped, unlike the guarded `emit()` at `:110-112`) throws on the errored controller. That throw falls into the `catch` at `chat.ts:237`, which calls `rollbackStreamInserts` (`chat-service.ts:99-110`), **deleting the freshly-created `conversations` AND `projects` rows**. Net effect: refresh → project erased → `/prd/$id` loader throws `NOT_FOUND` → "PRD tidak ditemukan". The user's intent (the prompt) is also never saved (generate mode skips `saveMessages`, see Task 2).

A client refresh is a NORMAL network condition, not an error worth destroying a project over. The project will just be empty/incomplete; the loader-based PRD page already handles a project-with-no-PRD gracefully (shows empty chat). Deletion is the wrong default.

**Files:**
- Modify: `src/routes/api/chat.ts` (catch block lines 237-246; delta emit lines 147, 151)

**Interfaces:**
- Consumes: `rollbackStreamInserts(userId, createdConversationId?, createdProjectId?)` from `src/lib/services/chat-service.ts:99` (unchanged signature).
- Produces: no new export. Behavior change only.

**Approach (root-cause, not symptom):** The root cause is treating "controller broke because the client went away" as a DATA error warranting a rollback. Two coordinated changes:

1. **Wrap the two bare delta `controller.enqueue` calls** (`chat.ts:147` and `chat.ts:151`) in the SAME try/catch idiom `emit()` already uses (`chat.ts:111`: `try { ... } catch {}`).

2. **Detect client disconnect and distinguish it from a real streaming error.** In the `catch` at `:237`, keep the project when content was already being delivered (the user re-enters to an empty-but-real chat). Roll back only when the failure is a genuine server-side generation error that produced NO content (pre-existing behavior for a hard fail before any insert committed).

Detection that needs no new request plumbing: an aborted client stream surfaces as a thrown `Error` with `name === "AbortError"` OR (undici fetch) `TypeError: aborted` / `DOMException` AbortError. Detect broadly:

```ts
const isClientAbort =
  (error as Error)?.name === "AbortError" ||
  /aborted|Invalid state: The stream closed|Controller is already closed/i.test(
    (error as Error)?.message ?? "",
  );
```

- [ ] **Step 1: Wrap the two bare delta enqueues**

Add a local `enqueueDelta` near the existing `emit` closure (after `chat.ts:124`):

```ts
const enqueueDelta = (chunk: string) => {
  try {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`));
  } catch {}
};
```

Then line 147 becomes `enqueueDelta(firstChunk);` and line 151 becomes `enqueueDelta(chunk);`. (Leave the `fullResponse += ...` accumulation lines intact — those are the source of truth for whether content streamed.)

- [ ] **Step 2: Differentiate abort from real error in the catch block**

Replace the `catch` block body (`chat.ts:238-243`) with abort-aware logic:

```ts
} catch (error) {
  const errMsg = (error as Error)?.message ?? String(error);
  const errName = (error as Error)?.name ?? "";
  const isClientAbort =
    errName === "AbortError" ||
    /aborted|Invalid state: The stream closed|Controller is already closed/i.test(errMsg);

  // ponytail: A client disconnect mid-stream is a normal condition (refresh,
  // tab close, network blip), NOT a reason to delete the just-created project +
  // conversation. Only roll back on a real generation failure that produced no
  // content yet. A project with a partial/no PRD is recoverable; a deleted
  // project loses the user's entry entirely.
  if (isClientAbort && fullResponse.length > 0) {
    console.warn("Chat stream: client disconnected mid-generation; kept project + conversation.");
  } else if (isClientAbort) {
    console.warn("Chat stream: client disconnected before content; kept project for retry.");
  } else {
    // Real generation error. Roll back only the rows created THIS request, and
    // only if nothing was delivered; if fullResponse > 0 we keep partial state.
    if (fullResponse.length === 0) {
      try {
        await rollbackStreamInserts(user.id, createdConversationId, createdProjectId);
      } catch (rollbackError) {
        console.error("Failed to roll back chat stream inserts:", rollbackError);
      }
    } else {
      console.error("Chat stream errored after content; kept partial state:", errMsg);
    }
    safeError(sanitizeErrorForClient(error));
  }
}
```

When `isClientAbort` we deliberately do NOT call `safeError` — the client is gone. The `finally` at `:244-246` still closes the controller.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: no errors in `chat.ts`. (`fullResponse` is declared with `let` at line 106 in the same `start(controller)` scope → in scope inside the catch.)

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(chat): keep project + conversation on client disconnect mid-PRD-generation

A refresh during PRD streaming aborted the fetch, threw in the bare
controller.enqueue, and the catch handler deleted the just-created project +
conversation rows (rollbackStreamInserts). Now: delta enqueues are guarded; the
catch distinguishes client-abort from real generation errors; rollback only
fires on a content-less genuine failure. A partial/no-PRD project survives so
the user re-enters to a real (if empty) chat instead of NOT_FOUND."
```

---

### Task 2: Persist the originating user prompt for generate/resume modes

**The bug:** `chat.ts:172` gates `saveMessages` on `mode === "chat" || mode === "revise"`. For `generate` and `resume`, the user's prompt is NEVER inserted into `messages`. After generation the PRD body IS saved (`savePrdVersion` at `:220`), but the originating question bubble is gone. On refresh, the loader (`prd/$id.tsx:29-35`) reads `messages` from DB → the first user turn is missing → the chat history shows an orphaned assistant turn with no prompt above it. Breaks chat context for follow-ups.

**Files:**
- Modify: `src/routes/api/chat.ts` (line 172 condition)

**Interfaces:**
- Consumes: `saveMessages(conversationId, userMessage, assistantReply, plan)` from `chat-service.ts:87` (unchanged).
- Produces: no new export.

**Approach:** Widen the `saveMessages` guard to include `generate` and `resume`. The `userMessageToSave` derivation at lines 164-170 already strips the `Generate PRD lengkap...` template wrapper for those modes (so the bubble shows the user's actual answer text) and builds a sensible `assistantReply` per mode at lines 154-162. Just remove the mode gate.

Edge case: for `generate`, `assistantReply` is the literal `"Selesai menyusun PRD awal."` (line 159), NOT the full PRD body — correct, because the full body goes to `savePrdVersion` (line 220), not messages. The message pair (user prompt + short confirmation) is the chat-history artifact; the PRD itself is a separate versioned doc. Keep this split.

- [ ] **Step 1: Widen the saveMessages condition**

Edit `src/routes/api/chat.ts` line 172. Before:

```ts
if (conversationIdToUse && (mode === "chat" || mode === "revise")) {
  await saveMessages(conversationIdToUse, userMessageToSave, assistantReply, plan);
}
```

After:

```ts
if (conversationIdToUse) {
  await saveMessages(conversationIdToUse, userMessageToSave, assistantReply, plan);
}
```

- [ ] **Step 2: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(chat): persist user prompt bubble for generate/resume PRD turns

saveMessages was gated to chat/revise only, so the originating user prompt for
an initial PRD generation was never written to the messages table. On refresh
the loader returned conversation history missing the first user turn. Widen to
all modes; the existing userMessageToSave wrapper-stripping and per-mode
assistantReply summary keep the stored pair correct."
```

---

### Task 3: Persist PRD chat follow-up draft (survive refresh)

**The bug:** `chat-panel.tsx:127` `const [input, setInput] = useState("")`. A follow-up question typed in the PRD chat box is bare React state. Refresh mid-draft wipes it. Same tolol-bug class.

**Files:**
- Modify: `src/lib/prompt-handoff.ts` (add `PRD_DRAFT_KEY`, `savePrdDraft`, `getPrdDraft`, `clearPrdDraft`)
- Modify: `src/components/chat/chat-panel.tsx` (mount-restore + onChange debounce-save + clear on successful send)

**Interfaces:**
- Produces in `prompt-handoff.ts`:
  - `export function savePrdDraft(projectId: string, draft: string): void`
  - `export function getPrdDraft(projectId: string): string` (returns `""` if missing or for a different project)
  - `export function clearPrdDraft(): void`
- `chat-panel.tsx` already has `projectId` in scope (verify by grep `projectId` in the file before wiring).

**Approach:** Keyed by project (so navigating between projects doesn't cross-load drafts). 300ms debounce. Restore on mount only (lazy `useState` initializer). Clear on successful send.

- [ ] **Step 1: Add the PRD draft helpers to prompt-handoff.ts**

Append after the `/ask flow persistence` block (after line 162, end of file) in `src/lib/prompt-handoff.ts`:

```ts
/* ---------- PRD chat follow-up draft (survives refresh) ---------- */
const PRD_DRAFT_KEY = "novaplan:prd-draft";

/** Persist the PRD chat input draft, keyed per project so drafts don't leak
 *  between projects. Tab-scoped (sessionStorage): a draft is session work. */
export function savePrdDraft(projectId: string, draft: string) {
  const storage = getStorage();
  if (!storage) return;
  if (!draft) {
    storage.removeItem(PRD_DRAFT_KEY);
    return;
  }
  storage.setItem(PRD_DRAFT_KEY, JSON.stringify({ projectId, draft }));
}

/** Read-only restore. Returns "" if missing or for a different project. */
export function getPrdDraft(projectId: string): string {
  const storage = getStorage();
  const raw = storage?.getItem(PRD_DRAFT_KEY);
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as { projectId: string; draft: string };
    if (!parsed || parsed.projectId !== projectId) return "";
    return parsed.draft ?? "";
  } catch {
    storage?.removeItem(PRD_DRAFT_KEY);
    return "";
  }
}

export function clearPrdDraft() {
  getStorage()?.removeItem(PRD_DRAFT_KEY);
}
```

- [ ] **Step 2: Wire restore + debounced save into chat-panel.tsx**

First confirm `input`/`setInput` and `projectId` locations in `src/components/chat/chat-panel.tsx` (read around lines 120-135 and the send handler). Assumes `input`/`setInput` at ~line 127 and `projectId` in scope.

**Import:** add to the existing `prompt-handoff` import block:
```ts
import { getPrdDraft, savePrdDraft, clearPrdDraft, /* existing... */ } from "@/lib/prompt-handoff";
```

**Restore on mount** — change line 127 from:
```ts
const [input, setInput] = useState("");
```
to:
```ts
const [input, setInput] = useState(() => getPrdDraft(projectId));
```

(`useState` lazy initializer runs once on mount → restores the draft; no extra effect for restore. Confirms `projectId` in component scope before this line.)

**Debounced save on change** — add an effect near the other mount effects:
```ts
// ponytail: 300ms debounce — cheap, matches typing cadence. Keeps the PRD
// follow-up draft in sessionStorage so a refresh mid-typing doesn't wipe it.
// biome-ignore lint/correctness/useExhaustiveDependencies: intentional draft snapshot
useEffect(() => {
  const t = setTimeout(() => savePrdDraft(projectId, input), 300);
  return () => clearTimeout(t);
}, [input, projectId]);
```

**Clear on successful send** — in the send handler, after the request resolves OK (locate the success path by reading the send function), add `clearPrdDraft();` alongside the existing `setInput("")`. After `setInput("")` runs, the debounce effect calls `savePrdDraft(projectId, "")` → removes the key (per Step 1 empty-guard). Adding `clearPrdDraft()` is belt-and-suspenders for immediate clear; keep both.

- [ ] **Step 3: Verify typecheck + Biome**

Run: `npx tsc --noEmit`
Expected: clean. If Biome flags suppressions/formatting, run `pnpm exec biome check --write src/components/chat/chat-panel.tsx src/lib/prompt-handoff.ts` and confirm the biome-ignore comments remain.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompt-handoff.ts src/components/chat/chat-panel.tsx
git commit -m "feat(chat): persist PRD follow-up draft across refresh

The PRD chat input was bare useState; a refresh wiped a half-typed follow-up
question. Add per-project sessionStorage draft helpers (savePrdDraft/
getPrdDraft/clearPrdDraft), restore on mount via lazy useState initializer,
debounce-save on change (300ms), clear on successful send. Tab-scoped —
match the repo's sessionStorage-only convention."
```

---

### Task 4: Persist home seed-prompt draft (survive refresh before send)

**The bug:** `chat-input.tsx:49` `const [message, setMessage] = useState("")`. The home textarea is where the user types the (typically long) product description that seeds the entire flow. `saveSetupPrompt` only fires inside `handleSend` (`chat-input.tsx:125`). Refresh before pressing send wipes the whole draft. Most expensive single-field input loss in the app.

**Files:**
- Modify: `src/lib/prompt-handoff.ts` (add `HOME_DRAFT_KEY`, `saveHomeDraft`, `getHomeDraft`, `clearHomeDraft`)
- Modify: `src/components/layout/chat-input.tsx` (restore + debounced save)

**Interfaces:**
- Produces:
  - `export function saveHomeDraft(draft: string): void` (not project-scoped — pre-dates any project)
  - `export function getHomeDraft(): string` (returns `""` if missing)
  - `export function clearHomeDraft(): void`

**Approach:** Same debounce pattern as Task 3, not project-scoped (home textarea pre-dates a project). 300ms debounce. Restore on mount via lazy `useState` initializer. Distinct from `saveSetupPrompt` (which is the enriched, post-send payload written only on send).

- [ ] **Step 1: Add home draft helpers to prompt-handoff.ts**

Append after the PRD draft block (end of `src/lib/prompt-handoff.ts`):

```ts
/* ---------- Home seed-prompt draft (survives refresh before send) ---------- */
const HOME_DRAFT_KEY = "novaplan:home-draft";

/** Persist the home textarea draft before the user presses send. Tab-scoped.
 *  Distinct from saveSetupPrompt (which fires on send with the enriched payload). */
export function saveHomeDraft(draft: string) {
  const storage = getStorage();
  if (!storage) return;
  if (!draft) {
    storage.removeItem(HOME_DRAFT_KEY);
    return;
  }
  storage.setItem(HOME_DRAFT_KEY, draft);
}

export function getHomeDraft(): string {
  return getStorage()?.getItem(HOME_DRAFT_KEY) ?? "";
}

export function clearHomeDraft() {
  getStorage()?.removeItem(HOME_DRAFT_KEY);
}
```

- [ ] **Step 2: Wire into chat-input.tsx**

**Import:** update `src/components/layout/chat-input.tsx:7`:
```ts
import { saveAskPlatform, saveSetupPrompt, getHomeDraft, saveHomeDraft, clearHomeDraft } from "@/lib/prompt-handoff";
```

**Restore + save:** change line 49:
```ts
const [message, setMessage] = useState("");
```
to:
```ts
const [message, setMessage] = useState(() => getHomeDraft());
```

Add a debounce effect after the existing mount effect (after line 108, before `handleSend`):
```ts
// ponytail: 300ms debounce keeps the home seed-prompt draft alive across
// refresh, so a long product description isn't lost before send.
// biome-ignore lint/correctness/useExhaustiveDependencies: intentional draft snapshot
useEffect(() => {
  const t = setTimeout(() => saveHomeDraft(message), 300);
  return () => clearTimeout(t);
}, [message]);
```

**Clear on send:** in `handleSend`, place `clearHomeDraft()` at the END, right before `router.push(\`/ask/${project.id}\`)` (line 154) — the success path only, so a failed send preserves the draft for retry.

- [ ] **Step 3: Verify typecheck + Biome**

Run: `npx tsc --noEmit` then `pnpm exec biome check --write src/components/layout/chat-input.tsx src/lib/prompt-handoff.ts`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompt-handoff.ts src/components/layout/chat-input.tsx
git commit -m "feat(home): persist seed-prompt draft across refresh before send

The home textarea is the most expensive single input in the app — the long
product description that seeds the whole flow — and it was bare useState. A
refresh before pressing send wiped it. Add sessionStorage home-draft helpers
(not project-scoped; predates any project), restore on mount, debounce-save on
change (300ms), clear only on a successful project-creation send. Distinct from
saveSetupPrompt which fires post-send with the enriched payload."
```

---

### Task 5: Persist onboarding multi-step accumulator (survive refresh)

**The bug:** `onboarding-form.tsx`: 3-step wizard (name → role → goals). All state is `useState` (lines 27-30): `step`, `fullName`, `role`, `tujuan`. No loader, no sessionStorage. The only persistence is the FINAL `fetch("/api/auth/onboarding")` at line 64, reached only after step 3's "Selesai". Refresh at step 2 or 3 wipes `fullName` + `role`, restarts at step 1. Identical class to the `/ask` bug.

**Files:**
- Modify: `src/lib/prompt-handoff.ts` (add `ONBOARDING_STATE_KEY`, `saveOnboardingState`, `getOnboardingState`, `clearOnboardingState`, `OnboardingState`)
- Modify: `src/components/auth/onboarding-form.tsx` (restore + persist + clear on submit)

**Interfaces:**
- Produces in `prompt-handoff.ts`:
  - `export interface OnboardingState { step: number; fullName: string; role: string; goals: string[]; }`
  - `export function saveOnboardingState(state: OnboardingState): void`
  - `export function getOnboardingState(): OnboardingState | null`
  - `export function clearOnboardingState(): void`

**Approach:** Mirror `saveAskState`/`getAskState` (`prompt-handoff.ts:120-162`). No `projectId` (onboarding pre-dates projects). 200ms debounce (clicks + name field). Restore on mount. Clear on successful submit. Use `number` for `step` (not `1|2|3` union) to avoid `s + 1` cast churn at `setStep((s) => s + 1)` (line 52); validate restored step is in range.

- [ ] **Step 1: Add onboarding helpers to prompt-handoff.ts**

Append at end of `src/lib/prompt-handoff.ts`:

```ts
/* ---------- Onboarding multi-step state (survives refresh) ---------- */
const ONBOARDING_STATE_KEY = "novaplan:onboarding-state";

export interface OnboardingState {
  step: number;
  fullName: string;
  role: string;
  goals: string[];
}

/** Persist the 3-step onboarding wizard state so a refresh mid-wizard
 *  (before the final submit) restores step + name + role + goals instead of
 *  restarting at step 1. Tab-scoped. */
export function saveOnboardingState(state: OnboardingState) {
  getStorage()?.setItem(ONBOARDING_STATE_KEY, JSON.stringify(state));
}

export function getOnboardingState(): OnboardingState | null {
  const storage = getStorage();
  const raw = storage?.getItem(ONBOARDING_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as OnboardingState;
    if (!parsed || typeof parsed.step !== "number") return null;
    return parsed;
  } catch {
    storage?.removeItem(ONBOARDING_STATE_KEY);
    return null;
  }
}

export function clearOnboardingState() {
  getStorage()?.removeItem(ONBOARDING_STATE_KEY);
}
```

- [ ] **Step 2: Wire restore into onboarding-form.tsx**

**Import:** update `src/components/auth/onboarding-form.tsx:3` to `import { useEffect, useRef, useState } from "react";` and add:
```ts
import {
  getOnboardingState,
  saveOnboardingState,
  clearOnboardingState,
} from "@/lib/prompt-handoff";
```

**Restore via lazy initializers.** Replace lines 27-30:

```ts
const [step, setStep] = useState(1);
const [fullName, setFullName] = useState("");
const [role, setRole] = useState("");
const [tujuan, setTujuan] = useState<string[]>([]);
```

with read-once restore (useRef for the one-time read):

```ts
const restored = useRef(getOnboardingState()).current;
const stepInit = restored?.step ?? 1;
const [step, setStep] = useState<number>(stepInit < 1 || stepInit > 3 ? 1 : stepInit);
const [fullName, setFullName] = useState(restored?.fullName ?? "");
const [role, setRole] = useState(restored?.role ?? "");
const [tujuan, setTujuan] = useState<string[]>(restored?.goals ?? []);
```

- [ ] **Step 3: Add debounced persistence effect**

After the state declarations (around line 33), add:

```ts
// ponytail: 200ms debounce snapshots the wizard so a refresh mid-onboarding
// restores step + name + role + goals instead of wiping them to step 1.
// biome-ignore lint/correctness/useExhaustiveDependencies: intentional wizard snapshot
useEffect(() => {
  const t = setTimeout(() =>
    saveOnboardingState({ step, fullName, role, goals: tujuan }), 200);
  return () => clearTimeout(t);
}, [step, fullName, role, tujuan]);
```

- [ ] **Step 4: Clear on successful submit**

In `handleSubmit` (`onboarding-form.tsx:55`), on the success path right after `setUser(...)` and before `window.location.assign("/")` (lines 90-91), add:

```ts
clearOnboardingState();
```

So a user who completes onboarding never sees the wizard state again.

- [ ] **Step 5: Verify typecheck + Biome**

Run: `npx tsc --noEmit` then `pnpm exec biome check --write src/components/auth/onboarding-form.tsx src/lib/prompt-handoff.ts`
Expected: clean. Using `step: number` avoids the `setStep((s) => s + 1)` union-fit issue; the `stepInit < 1 || stepInit > 3 ? 1` guard rejects corrupted saved state.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompt-handoff.ts src/components/auth/onboarding-form.tsx
git commit -m "feat(onboarding): persist 3-step wizard state across refresh

Onboarding was a 3-step wizard (name -> role -> goals) with all state in
useState and no persistence until the final submit. A refresh at step 2 or 3
restarted at step 1, losing name + role + goals — same class as the /ask bug.
Mirror saveAskState: sessionStorage snapshot, restore on mount, debounce-save
on change (200ms), clear only on successful submit. Tab-scoped."
```

---

## Verification (whole plan)

- [ ] **Full typecheck:** `npx tsc --noEmit` — clean.
- [ ] **Biome lint/format:** `pnpm exec biome check --write src/` — clean, no new unsuppressed errors (the added biome-ignore lines are intentional and follow repo convention).
- [ ] **Manual smoke test (dev server, if user permits — they previously rejected running it this session; if not run, state typecheck-only).** For each fixed bug:
  1. **PRD mid-gen refresh (Task 1):** start a PRD generation, refresh mid-stream, observe the project + conversation still exist (no NOT_FOUND). Re-enter, generate succeeds (one quota burn, not the pre-fix double).
  2. **PRD prompt bubble (Task 2):** complete a PRD generation, refresh, confirm the first user prompt bubble is present in chat history above the assistant summary.
  3. **PRD draft (Task 3):** type a follow-up in the PRD chat, refresh, confirm draft restored. Send it, confirm it clears.
  4. **Home draft (Task 4):** type a long product description on home, refresh, confirm draft restored. Type < 20 chars, attempt send (rejected), confirm draft preserved. Send valid, confirm next visit starts empty.
  5. **Onboarding (Task 5):** fill name (step 1) + role (step 2), refresh, confirm restored to step 2 with name + role. Complete step 3, submit, confirm next onboarding starts fresh.

- [ ] **No DB migration needed** — none of these tasks touch schema; all persisted state is client sessionStorage or already-existing DB columns written via existing service signatures.

## What this plan deliberately does NOT fix (deferred / out of scope)

- **`consumePendingPrdPrompt` consume-before-success** (`prompt-handoff.ts:91` removes the key unconditionally before the auto-submit `fetch` resolves). A failed auto-submit (quota 403, 429, network) loses the prompt with no retry source. Fixing properly means splitting into `peekPendingPrdPrompt` (read, no delete) + `consumePendingPrdPrompt` (delete) and deleting only after the SSE `done` event confirms success. Behavioral change to the auto-submit effect in `chat-panel.tsx:652-672` with careful handling of the StrictMode double-invoke guard (`autoSubmitAttemptedRef`). Worth doing but DEFERRED to keep this plan's diff reviewable. Flag it.
- **PRD retry-card vs NOT_FOUND race + double quota burn** (`prd-detail.tsx:228` + `:185-196`): a mid-generate refresh can land on either the retry card OR the NOT_FOUND error (race), and the retry re-fires generation (second quota burn). Task 1 reduces this surface (project no longer deleted → NOT_FOUND less likely) but the retry-card path can still double-burn. A fuller fix would mark the project `prdStatus="generating"` and have the loader return that state, letting the UI show "generation in progress, reconnecting" instead of a retry button. Real schema/UI work — DEFERRED. Task 1 removes the worst symptom (project deleted).
- **`api-keys` raw key shown once, lost on refresh** (`api-keys-client.tsx:104-123`): a created secret is shown exactly once in client state. Standard API-key UX (show once, warn to copy) and arguably correct — persisting a raw secret to sessionStorage reintroduces it in cleartext. LEFT AS-IS unless real users report it.
- **`forgot-password.tsx`** — file missing from disk this session; user said to ignore it.

## Self-Review notes

- **Spec coverage:** Each tolol-bug-class finding maps to a task: PRD mid-gen deletion (T1), PRD prompt bubble (T2), PRD draft (T3), home draft (T4), onboarding (T5). Kanban, AC, Task, settings — confirmed SAFE/expected-ephemeral by the audit, no task (no scope creep).
- **Placeholder scan:** All steps show actual code or exact edit instructions with line anchors; no "TODO", "add error handling", "similar to Task N".
- **Type consistency:** `OnboardingState.goals: string[]` matches the existing `tujuan: string[]`. `OnboardingState.step: number` avoids the `setStep((s) => s + 1)` union-fit issue. Helper names (`savePrdDraft`/`saveHomeDraft`/`saveOnboardingState`) are unique across the file to avoid collision with existing `saveSetupPrompt`/`saveAskState`.
