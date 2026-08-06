# Credit Exhaustion UX Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix misleading PRD error on credits-exhausted, embed pricing in modal, add history resume logic, remove obsolete badge.

**Architecture:** Zustand store gets a `creditsExhausted` field shared across PRD/AC/Task. New `CreditExhaustedModal` replaces `LimitModal` and embeds `PricingComponent`. sessionStorage resume-intent + suppress-autogen helpers coordinate payment-return auto-resume and history landing behavior. All 4 changes are additive — no schema migration.

**Tech Stack:** React, Zustand, TanStack Start (file-based routing), Midtrans Snap, sessionStorage, Drizzle ORM.

## Global Constraints

- TanStack Start framework (NOT Next.js despite legacy `next/navigation` imports — confirmed compat aliases).
- 1 credit = 1 stage (PRD, AC, or Task). `PLAN_CREDITS`: free:2, pro:30, hengker:105.
- SSE streaming for AI generation via `/api/chat`, `/api/ac/generate`, `/api/task/generate`.
- All 403 responses from credit-gated routes: `{ error, code: "NO_CREDITS", plan, remaining }`.
- Payment sync: `syncPaymentStatus` server function in `src/app/actions/payment.ts`.
- sessionStorage key pattern: `novaplan:<kebab-name>` (from `src/lib/prompt-handoff.ts`).
- No emojis in UI — use lucide icons only.

---

### Task 1: Add `creditsExhausted` to Zustand store (D1)

**Files:**
- Modify: `src/store/index.ts:41-106`

**Interfaces:**
- Consumes: nothing (purely additive)
- Produces: `useChatStore().creditsExhausted`, `useChatStore().setCreditsExhausted`

- [ ] **Step 1: Add field and setter to ChatState interface**

In `src/store/index.ts`, add to `ChatState` interface (after `completedSections` at line 51):

```ts
creditsExhausted: { stage: "prd" | "ac" | "task"; message: string } | null;
setCreditsExhausted: (v: ChatState["creditsExhausted"]) => void;
```

- [ ] **Step 2: Add to initialState and store**

Add to `chatInitialState` (after `completedSections` at line 77):

```ts
creditsExhausted: null as ChatState["creditsExhausted"],
```

Add setter in `useChatStore` (after `resetChat` at line 105):

```ts
setCreditsExhausted: (creditsExhausted) => set({ creditsExhausted }),
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS (no errors — `resetChat: () => set(chatInitialState)` now includes the new field automatically)

- [ ] **Step 4: Commit**

```bash
git add src/store/index.ts
git commit -m "feat(store): add creditsExhausted field to ChatState

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: Add sessionStorage helpers to prompt-handoff.ts (D3 + D8 suppress-autogen)

**Files:**
- Modify: `src/lib/prompt-handoff.ts` (append after `clearOnboardingState` at line 263)

**Interfaces:**
- Consumes: `getStorage()` (existing, line 23-26)
- Produces:
  - `saveResumeIntent(projectId: string, stage: "prd" | "ac" | "task"): void`
  - `consumeResumeIntent(projectId: string): "prd" | "ac" | "task" | null`
  - `saveSuppressAutoGen(projectId: string): void`
  - `consumeSuppressAutoGen(projectId: string): boolean`

- [ ] **Step 1: Append resume-intent helpers**

Append to `src/lib/prompt-handoff.ts`:

```ts
/* ---------- Resume intent (credit-exhaustion → payment → auto-resume) ---------- */
const RESUME_INTENT_KEY = "novaplan:resume-intent";
const RESUME_INTENT_MAX_AGE_MS = 15 * 60 * 1000;

interface ResumeIntentPayload {
  projectId: string;
  stage: "prd" | "ac" | "task";
  createdAt: number;
}

export function saveResumeIntent(projectId: string, stage: "prd" | "ac" | "task") {
  const payload: ResumeIntentPayload = { projectId, stage, createdAt: Date.now() };
  getStorage()?.setItem(RESUME_INTENT_KEY, JSON.stringify(payload));
}

/**
 * Consume-pattern: reads and removes. Returns the stage if the stored intent
 * matches `projectId` and hasn't expired, otherwise null (and clears stale data).
 */
export function consumeResumeIntent(projectId: string): "prd" | "ac" | "task" | null {
  const storage = getStorage();
  const raw = storage?.getItem(RESUME_INTENT_KEY);
  if (!raw) return null;
  storage?.removeItem(RESUME_INTENT_KEY);
  try {
    const parsed = JSON.parse(raw) as Partial<ResumeIntentPayload>;
    if (!parsed.projectId || !parsed.stage || !parsed.createdAt) return null;
    if (parsed.projectId !== projectId) return null;
    if (Date.now() - parsed.createdAt > RESUME_INTENT_MAX_AGE_MS) return null;
    return parsed.stage;
  } catch {
    return null;
  }
}

/* ---------- Suppress auto-generate on history resume landing ---------- */
const SUPPRESS_AUTOGEN_KEY = "novaplan:suppress-autogen";

export function saveSuppressAutoGen(projectId: string) {
  getStorage()?.setItem(SUPPRESS_AUTOGEN_KEY, projectId);
}

/**
 * One-shot check: returns true if `projectId` matches the stored suppress marker,
 * then clears it. Returns false otherwise.
 */
export function consumeSuppressAutoGen(projectId: string): boolean {
  const storage = getStorage();
  const stored = storage?.getItem(SUPPRESS_AUTOGEN_KEY);
  if (stored === projectId) {
    storage?.removeItem(SUPPRESS_AUTOGEN_KEY);
    return true;
  }
  return false;
}
```

- [ ] **Step 2: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompt-handoff.ts
git commit -m "feat(handoff): add resume-intent + suppress-autogen sessionStorage helpers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: Add returnUrl support to `/api/payments/create` (D4)

**Files:**
- Modify: `src/routes/api/payments/create.ts:16-111`

**Interfaces:**
- Consumes: `isValidHistoryUrl` from `src/lib/flow-progress.ts` (existing)
- Produces: POST body now accepts optional `{ planId, returnUrl?, projectId? }`. Response shape unchanged.

- [ ] **Step 1: Add import for isValidHistoryUrl**

At `src/routes/api/payments/create.ts:8`, add import:

```ts
import { isValidHistoryUrl } from "@/lib/flow-progress";
```

- [ ] **Step 2: Update request parsing and finish URL logic**

Replace lines 21 (`const { planId } = await request.json();`) with:

```ts
const { planId, returnUrl, projectId } = await request.json() as {
  planId: string;
  returnUrl?: string;
  projectId?: string;
};
```

Replace line 73 (the `callbacks.finish` line) with:

```ts
const finishPath =
  returnUrl && projectId && isValidHistoryUrl(returnUrl, projectId)
    ? returnUrl
    : "/pricing";
const finishUrl = `${safeOrigin}${finishPath}${finishPath.includes("?") ? "&" : "?"}payment=success&order_id=${orderId}`;
```

And update the `callbacks` object to use `finishUrl`:

```ts
callbacks: {
  finish: finishUrl,
},
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/payments/create.ts
git commit -m "feat(payments): add returnUrl support to /api/payments/create

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: Create `CreditExhaustedModal` component (D5)

**Files:**
- Create: `src/components/chat/credit-exhausted-modal.tsx`

**Interfaces:**
- Consumes:
  - `PricingComponent` from `src/components/ui/pricing-card.tsx` (named export)
  - `novaPlanPlans` from `src/lib/pricing-data` (existing)
  - `syncPaymentStatus` from `src/app/actions/payment` (existing)
  - `saveResumeIntent` from `src/lib/prompt-handoff` (Task 2)
  - `useUIStore().showToast` (existing)
- Produces: `CreditExhaustedModal` component with props `{ isOpen, onClose, errorMessage, projectId, stage, currentPlan }`

- [ ] **Step 1: Create the component file**

Create `src/components/chat/credit-exhausted-modal.tsx`:

```tsx
"use client";

import { AlertCircle, X } from "lucide-react";
import * as React from "react";
import { PricingComponent } from "@/components/ui/pricing-card";
import { novaPlanPlans, type PriceTier } from "@/lib/pricing-data";
import { saveResumeIntent } from "@/lib/prompt-handoff";
import { useUIStore } from "@/store";

interface CreditExhaustedModalProps {
  isOpen: boolean;
  onClose: () => void;
  errorMessage: string;
  projectId: string;
  stage: "prd" | "ac" | "task";
  currentPlan?: string;
}

export function CreditExhaustedModal({
  isOpen,
  onClose,
  errorMessage,
  projectId,
  stage,
  currentPlan = "free",
}: CreditExhaustedModalProps) {
  const [plan, setPlan] = React.useState(currentPlan);
  const showToast = useUIStore((s) => s.showToast);

  React.useEffect(() => {
    if (!isOpen) return;
    const fetchPlan = async () => {
      try {
        const res = await fetch("/api/user/plan");
        if (res.ok) {
          const data = await res.json();
          setPlan(data.plan || "free");
        }
      } catch {
        // keep currentPlan
      }
    };
    fetchPlan();
  }, [isOpen]);

  const handlePlanSelect = async (planId: string) => {
    if (planId === "free") return;
    try {
      saveResumeIntent(projectId, stage);
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          returnUrl: window.location.pathname,
          projectId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        } else {
          showToast(data.error || "Gagal memproses pembayaran.", "error");
        }
        return;
      }
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      }
    } catch {
      showToast("Gagal menghubungi server.", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl overflow-hidden rounded-xl bg-obsidian shadow-[var(--shadow-overlay)] animate-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-crimson/10 text-crimson">
              <AlertCircle size={20} strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-inter text-xl font-[510] text-snow">
                Kredit Habis
              </h3>
              <p className="mt-0.5 font-inter text-sm text-fog">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-fog transition-colors hover:text-snow"
          >
            <X size={20} />
          </button>
        </div>

        {/* Embedded pricing cards */}
        <div className="px-2 pb-4">
          <PricingComponent
            plans={novaPlanPlans as [PriceTier, PriceTier, PriceTier]}
            onPlanSelect={handlePlanSelect}
            currentPlan={plan}
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/chat/credit-exhausted-modal.tsx
git commit -m "feat(chat): add CreditExhaustedModal with embedded pricing cards

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: Wire `CreditExhaustedModal` into chat-panel.tsx (D2 + D6)

**Files:**
- Modify: `src/components/chat/chat-panel.tsx:21,305-323,1047-1052`

**Interfaces:**
- Consumes: `CreditExhaustedModal` (Task 4), `useChatStore().creditsExhausted/setCreditsExhausted` (Task 1)
- Produces: PRD NO_CREDITS branch now sets `creditsExhausted` store field instead of `showLimitModal`; renders `CreditExhaustedModal` in place of `LimitModal`

- [ ] **Step 1: Update imports**

In `src/components/chat/chat-panel.tsx`, replace line 21:

```ts
import { LimitModal } from "./limit-modal";
```

with:

```ts
import { CreditExhaustedModal } from "./credit-exhausted-modal";
```

- [ ] **Step 2: Update store selectors**

Add `creditsExhausted` and `setCreditsExhausted` to the destructured `useChatStore` values. Also remove `showLimitModal` / `setShowLimitModal` / `limitErrorMsg` / `setLimitErrorMsg` local state (search for `useState` with `showLimitModal` and `limitErrorMsg`). These local states are no longer needed.

- [ ] **Step 3: Fix the NO_CREDITS branch in streamApiCall**

Replace the NO_CREDITS handling at lines 311-313:

```ts
if (response.status === 403 && err.code === "NO_CREDITS") {
  setLimitErrorMsg(err.error || "Kredit habis");
  setShowLimitModal(true);
```

with:

```ts
if (response.status === 403 && err.code === "NO_CREDITS") {
  setCreditsExhausted({ stage: "prd", message: err.error || "Kredit habis" });
```

- [ ] **Step 4: Update the 429 branch too**

Replace the 429 branch (lines 314-316):

```ts
} else if (response.status === 429) {
  setLimitErrorMsg(err.error || "Terlalu banyak request. Coba lagi nanti.");
  setShowLimitModal(true);
```

with:

```ts
} else if (response.status === 429) {
  setCreditsExhausted({ stage: "prd", message: err.error || "Terlalu banyak request. Coba lagi nanti." });
```

- [ ] **Step 5: Replace LimitModal render with CreditExhaustedModal**

Replace lines 1047-1052:

```tsx
{/* Limit Modal */}
<LimitModal
  isOpen={showLimitModal}
  onClose={() => setShowLimitModal(false)}
  errorMessage={limitErrorMsg}
/>
```

with:

```tsx
{/* Credit Exhausted Modal */}
<CreditExhaustedModal
  isOpen={!!creditsExhausted}
  onClose={() => setCreditsExhausted(null)}
  errorMessage={creditsExhausted?.message || ""}
  projectId={projectId || ""}
  stage={creditsExhausted?.stage || "prd"}
  currentPlan={initialUserPlan}
/>
```

- [ ] **Step 6: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "fix(chat): wire CreditExhaustedModal, replace LimitModal + showLimitModal state

Root cause: setGeneratingPRD(false) fires before setShowLimitModal(true),
so prd-detail.tsx's fallback error renders alongside the correct modal.
Now uses shared creditsExhausted Zustand field — mutually exclusive with
the fallback error check in prd-detail.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: Fix prd-detail.tsx fallback error guard (D2)

**Files:**
- Modify: `src/components/prd/prd-detail.tsx:8,82-83,259`

**Interfaces:**
- Consumes: `useChatStore().creditsExhausted` (Task 1)
- Produces: prd-detail.tsx no longer renders misleading "PRD Gagal Dibuat" error when credits-exhausted is the cause

- [ ] **Step 1: Add creditsExhausted to store selector**

In `src/components/prd/prd-detail.tsx`, update the `useChatStore` destructuring (line 82-83):

```ts
const { isGeneratingPRD, streamingPRDContent, setGeneratingPRD, setStreamingPRDContent, setMessages, creditsExhausted } =
  useChatStore();
```

- [ ] **Step 2: Add guard to fallback error condition**

At line 259, change:

```tsx
{projectId && !isCheckingGeneration && !isGeneratingPRD && !streamingPRDContent && !latestVersion ? (
```

to:

```tsx
{projectId && !isCheckingGeneration && !isGeneratingPRD && !streamingPRDContent && !latestVersion && !creditsExhausted ? (
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/prd/prd-detail.tsx
git commit -m "fix(prd): guard fallback error against creditsExhausted state

When credits are exhausted, isGeneratingPRD is false and no PRD exists,
so the fallback error UI incorrectly fires. Now checks creditsExhausted
from Zustand — if set, the CreditExhaustedModal handles the UX instead.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: Fix ac-detail.tsx + task-detail.tsx 403 branches + auto-resume (D2 + D6 + D7 + D8)

**Files:**
- Modify: `src/components/ac/ac-detail.tsx:96-106,192-205`
- Modify: `src/components/task/task-detail.tsx:101-111,194-198`

**Interfaces:**
- Consumes:
  - `CreditExhaustedModal` (Task 4)
  - `useChatStore().creditsExhausted/setCreditsExhausted` (Task 1)
  - `consumeResumeIntent` from `src/lib/prompt-handoff` (Task 2)
  - `consumeSuppressAutoGen` from `src/lib/prompt-handoff` (Task 2)
  - `syncPaymentStatus` from `src/app/actions/payment` (existing)
- Produces: Both components show embedded modal instead of redirect; auto-resume on payment return; suppress auto-gen from history landing

- [ ] **Step 1: Update ac-detail.tsx imports**

Add imports at top of `src/components/ac/ac-detail.tsx`:

```ts
import { useSearchParams } from "next/navigation";
import { syncPaymentStatus } from "@/app/actions/payment";
import { CreditExhaustedModal } from "@/components/chat/credit-exhausted-modal";
import { consumeResumeIntent, consumeSuppressAutoGen } from "@/lib/prompt-handoff";
```

Update store selector to add `creditsExhausted` and `setCreditsExhausted`:

```ts
const { isGeneratingAC, setGeneratingAC, creditsExhausted, setCreditsExhausted } = useChatStore();
```

Add `const searchParams = useSearchParams();` near other hooks.

- [ ] **Step 2: Replace 403 handling in ac-detail.tsx handleGenerate**

Replace lines 96-106:

```ts
if (!response.ok) {
  const error = await response.json();
  if (response.status === 403) {
    if (error.code === "UPGRADE_REQUIRED") {
      showToast("Generate AC hanya tersedia di paket Pro dan Hengker.", "error");
    } else {
      showToast(error.error || "Kredit habis.", "error");
    }
    router.push("/pricing");
    return;
  }
  throw new Error(error.error || "Failed to generate AC");
}
```

with:

```ts
if (!response.ok) {
  const error = await response.json();
  if (response.status === 403) {
    if (error.code === "UPGRADE_REQUIRED") {
      showToast("Generate AC hanya tersedia di paket Pro dan Hengker.", "error");
    } else {
      setCreditsExhausted({ stage: "ac", message: error.error || "Kredit habis." });
    }
    return;
  }
  throw new Error(error.error || "Failed to generate AC");
}
```

- [ ] **Step 3: Add suppress-autogen check to ac-detail.tsx auto-generate effect**

Replace lines 192-205:

```ts
useEffect(() => {
  if (
    !latestPrdContent ||
    latestAcVersion ||
    hasAutoGenerated.current ||
    isGenerating
  )
    return;
  hasAutoGenerated.current = true;
  handleGenerate();
}, [latestPrdContent, latestAcVersion, handleGenerate]);
```

with:

```ts
useEffect(() => {
  if (
    !latestPrdContent ||
    latestAcVersion ||
    hasAutoGenerated.current ||
    isGenerating
  )
    return;
  // Suppress auto-generate when navigating from History (user must click explicitly)
  if (consumeSuppressAutoGen(projectId)) return;
  hasAutoGenerated.current = true;
  handleGenerate();
}, [latestPrdContent, latestAcVersion, handleGenerate, projectId]);
```

- [ ] **Step 4: Add payment-return auto-resume effect to ac-detail.tsx**

Add after the auto-generate effect:

```ts
// Auto-resume after payment return (CreditExhaustedModal → Midtrans → back here)
useEffect(() => {
  const orderId = searchParams.get("order_id");
  const payment = searchParams.get("payment");
  if (!orderId || payment !== "success") return;
  (async () => {
    try {
      const res = await syncPaymentStatus({ data: orderId });
      if (!res.success) return;
      const resumedStage = consumeResumeIntent(projectId);
      if (resumedStage === "ac") {
        handleGenerate();
      }
      // Strip query params from URL
      window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
      console.error("Auto-resume payment sync failed:", e);
    }
  })();
}, [searchParams]);
```

- [ ] **Step 5: Add CreditExhaustedModal render to ac-detail.tsx**

Add to the JSX return (near end of the component, before the closing `</div>`):

```tsx
<CreditExhaustedModal
  isOpen={creditsExhausted?.stage === "ac"}
  onClose={() => setCreditsExhausted(null)}
  errorMessage={creditsExhausted?.message || ""}
  projectId={projectId}
  stage="ac"
  currentPlan={plan}
/>
```

- [ ] **Step 6: Repeat for task-detail.tsx — imports**

Add imports at top of `src/components/task/task-detail.tsx`:

```ts
import { useSearchParams } from "next/navigation";
import { syncPaymentStatus } from "@/app/actions/payment";
import { CreditExhaustedModal } from "@/components/chat/credit-exhausted-modal";
import { consumeResumeIntent, consumeSuppressAutoGen } from "@/lib/prompt-handoff";
```

Update store selector:

```ts
const { isTaskGenerated, setTaskGenerated, creditsExhausted, setCreditsExhausted } = useChatStore();
```

Add `const searchParams = useSearchParams();` near other hooks.

- [ ] **Step 7: Replace 403 handling in task-detail.tsx handleGenerate**

Replace lines 101-111:

```ts
if (!response.ok) {
  const error = await response.json();
  if (response.status === 403) {
    if (error.code === "UPGRADE_REQUIRED") {
      showToast("Generate Task hanya tersedia di paket Pro dan Hengker.", "error");
    } else {
      showToast(error.error || "Kredit habis.", "error");
    }
    router.push("/pricing");
    return;
  }
  throw new Error(error.error || "Gagal generate");
}
```

with:

```ts
if (!response.ok) {
  const error = await response.json();
  if (response.status === 403) {
    if (error.code === "UPGRADE_REQUIRED") {
      showToast("Generate Task hanya tersedia di paket Pro dan Hengker.", "error");
    } else {
      setCreditsExhausted({ stage: "task", message: error.error || "Kredit habis." });
    }
    return;
  }
  throw new Error(error.error || "Gagal generate");
}
```

- [ ] **Step 8: Add suppress-autogen check to task-detail.tsx auto-generate effect**

Replace lines 194-198:

```ts
useEffect(() => {
  if (taskTree || hasAutoGenerated.current) return;
  hasAutoGenerated.current = true;
  handleGenerateRef.current();
}, [taskTree]);
```

with:

```ts
useEffect(() => {
  if (taskTree || hasAutoGenerated.current) return;
  if (consumeSuppressAutoGen(projectId)) return;
  hasAutoGenerated.current = true;
  handleGenerateRef.current();
}, [taskTree, projectId]);
```

- [ ] **Step 9: Add payment-return auto-resume effect to task-detail.tsx**

Add after the auto-generate effect:

```ts
// Auto-resume after payment return
useEffect(() => {
  const orderId = searchParams.get("order_id");
  const payment = searchParams.get("payment");
  if (!orderId || payment !== "success") return;
  (async () => {
    try {
      const res = await syncPaymentStatus({ data: orderId });
      if (!res.success) return;
      const resumedStage = consumeResumeIntent(projectId);
      if (resumedStage === "task") {
        handleGenerateRef.current();
      }
      window.history.replaceState({}, "", window.location.pathname);
    } catch (e) {
      console.error("Auto-resume payment sync failed:", e);
    }
  })();
}, [searchParams]);
```

- [ ] **Step 10: Add CreditExhaustedModal render to task-detail.tsx**

Add to JSX return:

```tsx
<CreditExhaustedModal
  isOpen={creditsExhausted?.stage === "task"}
  onClose={() => setCreditsExhausted(null)}
  errorMessage={creditsExhausted?.message || ""}
  projectId={projectId}
  stage="task"
  currentPlan={plan}
/>
```

- [ ] **Step 11: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/components/ac/ac-detail.tsx src/components/task/task-detail.tsx
git commit -m "fix(ac,task): replace 403 redirect with embedded modal + auto-resume

- NO_CREDITS → setCreditsExhausted (Zustand) instead of router.push(/pricing)
- Auto-generate effects check consumeSuppressAutoGen for History landing
- Payment return triggers auto-resume via consumeResumeIntent
- CreditExhaustedModal rendered per component

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: History resume logic (D8)

**Files:**
- Modify: `src/routes/history.tsx:9-16,23-29,62-75`
- Modify: `src/components/history/history-page.tsx:8,18,80-128`

**Interfaces:**
- Consumes:
  - `consumeSuppressAutoGen` / `saveSuppressAutoGen` from `src/lib/prompt-handoff` (Task 2)
  - `useChatStore().setCreditsExhausted` (Task 1)
  - `resolveHistoryUrl` from `src/lib/flow-progress` (existing)
- Produces: `HistoryItem` extended with `acStatus`/`taskStatus`; History click intercepts halted projects

- [ ] **Step 1: Extend HistoryItem interface**

In `src/routes/history.tsx`, update `HistoryItem` (lines 9-16):

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

- [ ] **Step 2: Add acStatus/taskStatus to SQL select**

In the `loadHistory` handler, update the select (lines 24-29):

```ts
const projectRows = await db
  .select({
    id: projects.id,
    name: projects.name,
    step: projects.step,
    lastUrl: projects.lastUrl,
    updatedAt: projects.updatedAt,
    acStatus: projects.acStatus,
    taskStatus: projects.taskStatus,
  })
```

- [ ] **Step 3: Add acStatus/taskStatus to mapped items**

In the `items.map` block (around line 62-75), add `acStatus` and `taskStatus`:

```ts
return {
  id: p.id,
  name: p.name,
  step: p.step,
  lastUrl: p.lastUrl,
  updatedAt: p.updatedAt ?? new Date(0),
  preview,
  acStatus: p.acStatus,
  taskStatus: p.taskStatus,
};
```

- [ ] **Step 4: Add halted-by-credits detection helper to history-page.tsx**

Add import at top of `src/components/history/history-page.tsx`:

```ts
import { useChatStore } from "@/store";
import { saveSuppressAutoGen } from "@/lib/prompt-handoff";
```

Add a helper function (inside the component or as a utility):

```ts
function isHaltedByCredits(item: HistoryItem): boolean {
  if (item.step === "ac" && item.acStatus === "pending") return true;
  if (item.step === "task" && item.taskStatus === "pending") return true;
  return false;
}
```

- [ ] **Step 5: Replace `<a>` with click-intercepting logic for halted items**

In the `localItems.map` render, add halted detection and click handler before the return:

```tsx
const halted = isHaltedByCredits(item);

const handleClick = async (e: React.MouseEvent) => {
  if (!halted) return; // non-halted uses default <a> navigation
  e.preventDefault();
  saveSuppressAutoGen(item.id);

  // Check credits
  try {
    const res = await fetch("/api/user/plan", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      const remaining = data.remaining;
      if (remaining === 0 || (remaining !== "unlimited" && Number(remaining) <= 0)) {
        // No credits: set exhausted state then navigate; modal shows on landing
        const stage = item.step === "task" ? "task" : "ac";
        useChatStore.getState().setCreditsExhausted({
          stage,
          message: "Kredit kamu sudah habis. Beli kredit untuk melanjutkan.",
        });
      }
    }
  } catch {
    // proceed anyway; landing page will handle
  }

  window.location.href = href;
};
```

Update the `<a>` tag to use the handler and add a "Terhenti" badge:

```tsx
<a
  href={href}
  onClick={handleClick}
  className="group flex items-center gap-4 rounded-xl border border-graphite bg-charcoal/60 p-4 transition-colors hover:border-fog/40 hover:bg-charcoal"
>
  <div className="min-w-0 flex-1">
    <div className="flex items-center gap-2">
      <h2 className="truncate font-inter text-base font-[510] text-snow">
        {item.name}
      </h2>
      <span
        className={`rounded-full px-2 py-0.5 font-inter text-[11px] font-[510] ${badge.className}`}
      >
        {badge.label}
      </span>
      {halted && (
        <span className="rounded-full px-2 py-0.5 font-inter text-[11px] font-[510] bg-crimson/15 text-crimson">
          Terhenti
        </span>
      )}
    </div>
    {/* ... rest unchanged ... */}
```

- [ ] **Step 6: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/routes/history.tsx src/components/history/history-page.tsx
git commit -m "feat(history): add resume logic for credits-halted projects

- HistoryItem extended with acStatus/taskStatus
- Halted projects show 'Terhenti' badge + intercept click
- No credits → set creditsExhausted, suppress auto-gen on landing
- Credits available → suppress auto-gen only (manual button on landing)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: Remove Pro/Hengker badge from Settings/Profile (D9)

**Files:**
- Modify: `src/components/settings/profile-form.tsx:12,60-71`
- Modify: `src/routes/settings/profile.tsx:5,13-15,31,40-46`

**Interfaces:**
- Consumes: nothing new
- Produces: badge removed; `plan` prop removed from `ProfileForm`; subscriptions query removed from profile loader

- [ ] **Step 1: Remove badge from profile-form.tsx**

In `src/components/settings/profile-form.tsx`, remove `plan?: string` from the profile prop type (line 12):

```ts
profile: { full_name: string | null; avatar_url: string | null; email: string };
```

Remove the badge `<span>` block (lines 62-70):

```tsx
<span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
  profile.plan === 'hengker' 
    ? 'bg-steel text-snow ring-graphite'
    : profile.plan === 'pro'
    ? 'bg-steel text-snow ring-graphite'
    : 'bg-gray-50 text-gray-600 ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20'
}`}>
  {profile.plan?.toUpperCase() || 'FREE'}
</span>
```

The `<div className="flex flex-wrap items-center gap-2">` wrapper now only contains the `<h2>`, so simplify it or leave as-is (a flex div with one child is harmless).

- [ ] **Step 2: Simplify profile.tsx loader**

In `src/routes/settings/profile.tsx`, remove the `subscriptions` import from line 5:

```ts
import { db } from '@/db'
import { quotas, users } from '@/db/schema'  // remove subscriptions
```

Remove lines 13-15 (the subscriptions query + plan computation):

```ts
const [sub] = await db.select({ plan: subscriptions.plan, status: subscriptions.status }).from(subscriptions).where(eq(subscriptions.userId, user.id)).limit(1)
const plan = sub?.status === 'active' ? sub.plan : 'free'
```

Update the return value (line 15):

```ts
return { profile, email: user.email }
```

Update `ProfilePage` component (line 31):

```ts
const { profile, email } = Route.useLoaderData()
```

Update the `<ProfileForm>` props (lines 40-46):

```tsx
<ProfileForm
  profile={{
    full_name: profile?.fullName ?? null,
    avatar_url: profile?.image ?? null,
    email,
  }}
/>
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/profile-form.tsx src/routes/settings/profile.tsx
git commit -m "fix(settings): remove obsolete Pro/Hengker plan badge

Per-stage credit model replaces lifecycle plans. Badge is meaningless now.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 10: Delete limit-modal.tsx (D5 cleanup)

**Files:**
- Delete: `src/components/chat/limit-modal.tsx`

**Interfaces:**
- Consumes: nothing (file is no longer imported anywhere after Task 5)
- Produces: dead file removed

- [ ] **Step 1: Verify no remaining imports**

Run: `grep -r "limit-modal" src/`
Expected: zero results (Task 5 replaced the only import in chat-panel.tsx)

- [ ] **Step 2: Delete the file**

```bash
rm src/components/chat/limit-modal.tsx
```

- [ ] **Step 3: Verify build**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add -A src/components/chat/limit-modal.tsx
git commit -m "chore: delete unused limit-modal.tsx (replaced by credit-exhausted-modal)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 11: Final verification

- [ ] **Step 1: Full typecheck**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS

- [ ] **Step 3: Manual smoke test checklist**

1. Exhaust credits → generate PRD → confirm only `CreditExhaustedModal` shows (no "PRD Gagal Dibuat" flash)
2. Buy credits inside modal → Midtrans sandbox → return → confirm auto-resume
3. History: halted project, 0 credits → click → credits-exhausted state
4. History: halted project, has credits → click → "Terhenti" badge, manual button (no auto-fire)
5. Settings/Profile: no plan badge visible

- [ ] **Step 4: Final commit (if any fixups needed)**

```bash
git commit -m "fix: final adjustments from smoke testing

Co-Authored-By: Claude <noreply@anthropic.com>"
```
