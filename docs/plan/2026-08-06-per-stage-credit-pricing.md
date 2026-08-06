# Per-Stage Credit Pricing — Implementation Plan

> **Model:** Opsi A — setiap tahap (PRD, AC, Task) bakar 1 credit mandiri.

**Goal:** Ganti lifecycle credit (1 credit = 1 full project) jadi per-stage credit (PRD/AC/Task masing-masing makan 1 credit). Free tier tetap PRD-only via plan gate.

**Architecture:** Credit gate + burn ditambahkan di `ac/generate.ts` dan `task/generate.ts`. `chat.ts` sudah punya credit gate/burn, tetap. Plan gate (`hasFullWorkflow`) tetap jalan untuk free tier. Error code `NO_CREDITS` dipakai konsisten di semua 3 route. Frontend handle `NO_CREDITS` → limit modal.

**Tech Stack:** Drizzle ORM, PostgreSQL, TanStack Start, SSE streaming.

---

## Deep Audit Findings

### Current State (verified with tools)

| Route | Plan gate | Credit gate | Credit burn | Ownership |
|---|---|---|---|---|
| `chat.ts` (generate) | no | `checkCredits` L85 | `consumeCredit` L397 | N/A |
| `ac/generate.ts` | `hasFullWorkflow` L46 | **none** | **none** | `and(id,userId)` L67 |
| `task/generate.ts` | `hasFullWorkflow` L57 | **none** | **none** | `and(id,userId)` L78 |
| `ac/revise.ts` | none | none | none | **absent** |
| `chat.ts` (revise) | none | none | none | **IDOR L126** |

### Bugs Found (fix during implementation)

1. **`chat.ts:397`** — `consumeCredit` return value discarded. Concurrent burn that loses race silently produces free PRD. Fix: check return, rollback or error.
2. **`chat.ts:126`** — IDOR. `mode === "revise"` project lookup uses `eq(projects.id, projectId)` with no `userId` predicate. Any authed user can overwrite any project's PRD.
3. **`ac/revise.ts`** — No ownership check. Free-tier user can revise any project's AC, bypassing `hasFullWorkflow` gate on create.
4. **`chat-input.tsx:221`** — "3 PRD Gratis" hardcoded, actual free credits = 2.
5. **`chat-panel.tsx:311`** — Matches on `status === 403` only, ignores `code`. Non-credit 403s (ownership errors) show "Kredit Habis" modal.
6. **`billing.tsx:60`** — Credit block gated on `credits > 0`. Free user with `credits === 0` sees no balance at all.

### Constraints

- DB: `credits`/`credits_used` columns exist (migration 0005). No CHECK constraints, no indexes.
- `PLAN_CREDITS` in `database.ts:89`: `free:2, pro:10, hengker:35`.
- `FEATURES[plan].fullWorkflow`: `free:false, pro:true, hengker:true`.
- `consumeCredit` atomic: `WHERE creditsUsed < credits` in `credits.ts:71-83`.
- All AI calls route through `tryStreamWithFallback` → `streamChat` → 9router.

---

## Changes Required

### 1. Update PLAN_CREDITS for per-stage model

**File:** `src/types/database.ts`

Current: `free:2, pro:10, hengker:35` (lifecycle model).
New: `free:2, pro:30, hengker:105` (per-stage model — 1 lifecycle = 3 credits).

Pro user gets 10 full lifecycles (30/3), Hengker gets 35 (105/3). Free user gets 2 PRD-only credits.

### 2. Update pricing-data.ts display text

**File:** `src/lib/pricing-data.ts`

Change credit display from lifecycle count to credit count. Feature text updates.

### 3. Add `consumeCredit` to ac/generate.ts

**File:** `src/routes/api/ac/generate.ts`

After plan gate passes and before stream starts:
- `checkCredits(userId)` → 403 `NO_CREDITS` if `remaining <= 0`
- After stream `done` event + save: `consumeCredit(userId)` → check return value

### 4. Add `consumeCredit` to task/generate.ts

**File:** `src/routes/api/task/generate.ts`

Same pattern as ac/generate.

### 5. Fix `consumeCredit` return handling in chat.ts

**File:** `src/routes/api/chat.ts`

Line 397: check `consumeCredit` return. If `false` (lost race), emit error event instead of silently giving free PRD.

### 6. Fix IDOR in chat.ts revise mode

**File:** `src/routes/api/chat.ts`

Line 126: add `userId` to project lookup: `and(eq(projects.id, projectId), eq(projects.userId, user.id))`.

### 7. Fix ownership check in ac/revise.ts

**File:** `src/routes/api/ac/revise.ts`

Add project ownership check before allowing revision. Query `projects` with `and(id, userId)`.

### 8. Update frontend error handling for NO_CREDITS

**Files:**
- `src/components/ac/ac-detail.tsx` — handle `NO_CREDITS` code same as `UPGRADE_REQUIRED`
- `src/components/task/task-detail.tsx` — same
- `src/components/chat/chat-panel.tsx` — check `err.code === "NO_CREDITS"` before showing limit modal

### 9. Update chat-input.tsx credit display

**File:** `src/components/layout/chat-input.tsx`

- Fix "3 PRD Gratis" → "2 Kredit Gratis" (or dynamic from PLAN_CREDITS)
- Change "Sisa N PRD Pro" → "Sisa N Kredit"
- Change "Sisa N PRD Gratis" → "Sisa N Kredit"

### 10. Update billing.tsx credit display

**File:** `src/routes/settings/billing.tsx`

- Remove `credits > 0` gate on credit block (show for all users)
- Update labels to use "kredit" not PRD-specific

### 11. Update pricing card credits display

**Files:**
- Verify: `src/components/ui/pricing-card.tsx` reads credits from `novaPlanPlans` (auto-updates from PLAN_CREDITS)
- Verify: feature matrix matches new per-stage model

---

## Task List

### Task 1: Update PLAN_CREDITS constants

**Files:**
- Modify: `src/types/database.ts:89-93`

**Steps:**

- [ ] **Step 1:** Change `PLAN_CREDITS`:
  ```typescript
  export const PLAN_CREDITS: Record<Plan, number> = {
    free: 2,
    pro: 30,
    hengker: 105,
  };
  ```
- [ ] **Step 2:** Run `npm run lint` — verify no errors
- [ ] **Step 3:** Commit

### Task 2: Update pricing-data.ts

**Files:**
- Modify: `src/lib/pricing-data.ts`

**Steps:**

- [ ] **Step 1:** Update `novaPlanPlans` credits field (already reads from PLAN_CREDITS, verify)
- [ ] **Step 2:** Update feature text — "Kredit" instead of "PRD" where applicable
- [ ] **Step 3:** Run `npm run lint`
- [ ] **Step 4:** Commit

### Task 3: Add credit gate + burn to ac/generate.ts

**Files:**
- Modify: `src/routes/api/ac/generate.ts`

**Interfaces:**
- Consumes: `checkCredits(userId)`, `consumeCredit(userId)` from `@/lib/credits`
- Produces: 403 `{ error, code: "NO_CREDITS", plan, remaining }` — same shape as chat.ts

**Steps:**

- [ ] **Step 1:** Add imports: `import { checkCredits, consumeCredit, hasFullWorkflow } from "@/lib/credits";`
- [ ] **Step 2:** After plan gate (L46), before rate limit, add credit check:
  ```typescript
  const creditCheck = await checkCredits(user.id);
  if (!creditCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Kredit kamu sudah habis. Beli kredit untuk generate AC.",
        code: "NO_CREDITS",
        plan: creditCheck.plan,
        remaining: creditCheck.remaining,
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  ```
- [ ] **Step 3:** After stream `done` event (before `return`), add burn:
  ```typescript
  try { await consumeCredit(user.id); } catch (e) { console.error("Credit burn failed:", e); }
  ```
- [ ] **Step 4:** Verify: stream still works, 403 returned when credits exhausted
- [ ] **Step 5:** Commit

### Task 4: Add credit gate + burn to task/generate.ts

**Files:**
- Modify: `src/routes/api/task/generate.ts`

Same pattern as Task 3. Error message: "Kredit kamu sudah habis. Beli kredit untuk generate Task."

**Steps:**

- [ ] **Step 1:** Add imports
- [ ] **Step 2:** Add credit check after plan gate
- [ ] **Step 3:** Add burn after stream done
- [ ] **Step 4:** Verify
- [ ] **Step 5:** Commit

### Task 5: Fix consumeCredit return in chat.ts

**Files:**
- Modify: `src/routes/api/chat.ts:397`

**Steps:**

- [ ] **Step 1:** Change L397 from `await consumeCredit(user.id);` to:
  ```typescript
  const burned = await consumeCredit(user.id);
  if (!burned) {
    emitSSE({ type: "error", error: "Kredit habis. Silakan beli kredit." });
    return;
  }
  ```
- [ ] **Step 2:** Verify: concurrent double-submit no longer produces free PRD
- [ ] **Step 3:** Commit

### Task 6: Fix IDOR in chat.ts revise mode

**Files:**
- Modify: `src/routes/api/chat.ts:126`

**Steps:**

- [ ] **Step 1:** Change project lookup from `eq(projects.id, projectId)` to `and(eq(projects.id, projectIdToUse), eq(projects.userId, user.id))`
- [ ] **Step 2:** Verify: unauthorized project access returns 403
- [ ] **Step 3:** Commit

### Task 7: Fix ownership check in ac/revise.ts

**Files:**
- Modify: `src/routes/api/ac/revise.ts`

**Steps:**

- [ ] **Step 1:** After project ID validation, add ownership query:
  ```typescript
  const [project] = await db.select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
  if (!project) {
    return new Response(
      JSON.stringify({ error: "Project not found or unauthorized" }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }
  ```
- [ ] **Step 2:** Verify: unauthorized revision returns 403
- [ ] **Step 3:** Commit

### Task 8: Update frontend NO_CREDITS handling

**Files:**
- Modify: `src/components/ac/ac-detail.tsx:96-107`
- Modify: `src/components/task/task-detail.tsx:101-112`
- Modify: `src/components/chat/chat-panel.tsx:311-316`

**Steps:**

- [ ] **Step 1:** In `ac-detail.tsx`, extend the 403 handler to also catch `NO_CREDITS`:
  ```typescript
  if (response.status === 403) {
    if (error.code === "UPGRADE_REQUIRED") {
      showToast("Generate AC hanya tersedia di paket Pro dan Hengker.", "error");
    } else {
      showToast(error.error || "Kredit habis.", "error");
    }
    router.push("/pricing");
    return;
  }
  ```
- [ ] **Step 2:** Same pattern in `task-detail.tsx`
- [ ] **Step 3:** In `chat-panel.tsx`, check `err.code` before showing limit modal:
  ```typescript
  if (response.status === 403) {
    if (err.code === "NO_CREDITS") {
      setLimitErrorMsg(err.error || "Kredit habis");
      setShowLimitModal(true);
    } else {
      showToast(err.error || "Akses ditolak", "error");
    }
  } else if (response.status === 429) {
    // rate limit handling
  }
  ```
- [ ] **Step 4:** Verify: NO_CREDITS → limit modal, UPGRADE_REQUIRED → toast+redirect, other 403 → toast
- [ ] **Step 5:** Commit

### Task 9: Fix chat-input.tsx credit display

**Files:**
- Modify: `src/components/layout/chat-input.tsx:219-227`

**Steps:**

- [ ] **Step 1:** Fix "3 PRD Gratis" → "2 Kredit Gratis":
  ```typescript
  {!planStatus
    ? `${PLAN_CREDITS.free} Kredit Gratis`
    : planStatus.plan === "hengker"
      ? "Akses Unlimited"
      : planStatus.plan === "pro"
        ? `Sisa ${planStatus.remaining} Kredit`
        : `Sisa ${planStatus.remaining} Kredit`}
  ```
- [ ] **Step 2:** Import `PLAN_CREDITS` from `@/types/database`
- [ ] **Step 3:** Verify: display matches actual credit counts
- [ ] **Step 4:** Commit

### Task 10: Fix billing.tsx credit display

**Files:**
- Modify: `src/routes/settings/billing.tsx:60`

**Steps:**

- [ ] **Step 1:** Remove `credits > 0` gate — show credit block for all users
- [ ] **Step 2:** For free users with 0 credits, show "Kredit habis. Beli kredit untuk melanjutkan."
- [ ] **Step 3:** Verify: free user sees credit section
- [ ] **Step 4:** Commit

### Task 11: Update pricing card credits display

**Files:**
- Verify: `src/components/ui/pricing-card.tsx` reads credits from `novaPlanPlans` (auto-updates from PLAN_CREDITS)
- Verify: feature matrix matches new per-stage model

**Steps:**

- [ ] **Step 1:** Read pricing-card.tsx, verify it uses dynamic credits from plan data
- [ ] **Step 2:** If hardcoded, update to use `PLAN_CREDITS` or `novaPlanPlans`
- [ ] **Step 3:** Commit if changed

---

## Execution Order

Tasks 1-2: constants/data (no runtime impact, foundation)
Tasks 3-4: backend credit gates (core feature)
Task 5: fix consumeCredit race (security)
Tasks 6-7: fix IDOR/ownership (security)
Task 8: frontend error handling
Tasks 9-11: UI text fixes

Each task ends with commit. All tasks are independently testable.

---

## Out of Scope (document for later)

- PricingModal component (spec item 9) — not blocking per-stage credits
- Version history simplification (spec item 14)
- DB CHECK constraints on credits — add in separate migration
- Unique constraint on `subscriptions.user_id` — add in separate migration
