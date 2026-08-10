# NovaPlan Bug-Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all verified bugs found in the NovaPlan deep-audit — 2 CRITICAL, 6 HIGH, 8 MEDIUM, 6 LOW — plus 4 failing unit tests, with minimal diffs and no feature expansion.

**Architecture:** NovaPlan is full-stack TanStack Start (file-based routes under `src/routes/`, SSR). Server-side handlers enforce auth/ownership; client components stream SSE and update Zustand stores. The core flow is ask → PRD → AC → task → kanban with credit-based billing (free/pro/hengker, one-time IDR purchase via Midtrans). This plan fixes bugs in that flow without redesigning it.

**Tech Stack:** TanStack Start, React 19, Drizzle ORM + PostgreSQL, Better Auth, Vercel AI SDK (`ai` + `@ai-sdk/openai`), Zustand, TanStack Query, Tailwind 4, Zod 4, TypeScript 6.

## Global Constraints

- **No new dependencies.** Every fix uses stdlib or installed packages.
- **Follow existing code patterns** — `ponytail:` comments mark deliberate ceilings; preserve them.
- **Every non-trivial change ships one runnable check** (a unit test in `src/lib/**/*.test.ts`, run with `npx vitest run`). Trivial one-liners need no test.
- **TypeScript must compile:** `npx tsc --noEmit` → 0 errors.
- **No unrelated refactors.** Each task fixes one verified bug.
- **Commit after every task.** `git add <files> && git commit -m "<scope>: <fix>"`. Push on completion of each severity block.

---

## Priority map

| # | Severity | Bug | Fix location |
|---|----------|-----|--------------|
| 1 | CRITICAL | IDOR DELETE project — child rows deleted without ownership check | `src/routes/api/projects/$id.ts` |
| 2 | CRITICAL | AC revision merge is a silent no-op (`### Feature:` regex never matches) | `src/routes/api/ac/revise.ts` |
| 3 | HIGH | Rate limit `checkRateLimit` never paired with `recordRequest` in 4 routes | `src/routes/api/ac/generate.ts`, `ac/revise.ts`, `ask/options.ts`, `task/generate.ts` |
| 4 | HIGH | Double-credit on concurrent webhook — `applyPaymentSuccess` non-atomic | `src/lib/services/payment-service.ts` |
| 5 | HIGH | PRD generation missing AbortSignal — server streams on after client disconnect | `src/routes/api/chat.ts:239` |
| 6 | HIGH | PRD/AC version race — read-then-increment without transaction or unique index | `src/lib/services/prd-service.ts`, `src/lib/services/ac-service.ts`, schema |
| 7 | HIGH | `saveTaskTree` + project DELETE not in a transaction — partial state on failure | `src/lib/services/task-service.ts`, `src/routes/api/projects/$id.ts` |
| 8 | HIGH | PRD generate without truncation guard — partial PRD persisted + credit burned | `src/routes/api/chat.ts` |
| 9 | MEDIUM | Concurrent AC/task generation → double credit + version collision | `src/routes/api/ac/generate.ts`, `src/routes/api/task/generate.ts` |
| 10 | MEDIUM | PRD revise fallback regex can destroy document tail when section name mismatches | `src/routes/api/chat.ts` (revise merge) |
| 11 | MEDIUM | `isGeneratingPRD` stuck true when stream ends without done/error | `src/components/chat/chat-panel.tsx:659` |
| 12 | MEDIUM | Mermaid `securityLevel: "loose"` + `dangerouslySetInnerHTML` XSS surface | `src/components/prd/mermaid.tsx` |
| 13 | MEDIUM | Share link is feature-gated only client-side; server grants token to all plans | `src/lib/services/prd-service.ts`, `src/routes/prd/share/$token.tsx` |
| 14 | MEDIUM | Credit burned after save, error on consumeCredit is swallowed — misleading error | `src/routes/api/chat.ts:394` |
| 15 | MEDIUM | 4 unit tests fail (stale expectations) | `src/lib/prompt-depth.test.ts`, `src/types/database.test.ts` |
| 16 | LOW | Dead types + dead store quota fields | `src/types/database.ts`, `src/store/index.ts` |
| 17 | LOW | Kanban subtask `id: ""` always empty | `src/routes/api/kanban/$pid.ts` |
| 18 | LOW | PRD draft overwritten across projects (single sessionStorage key) | `src/lib/prompt-handoff.ts` |
| 19 | LOW | `useParams` next-compat shim broken | `src/lib/next-compat/navigation.tsx` |
| 20 | LOW | Typing placeholder runs high-frequency timers indefinitely | `src/hooks/use-typing-placeholder.ts` |
| 21 | LOW | API key accepted from request body (log-exposure surface) | `src/routes/api/kanban/update-status.ts` |

---

### Task 1: Fix IDOR delete — check ownership before deleting children

**Files:**
- Modify: `src/routes/api/projects/$id.ts`

**Interfaces:**
- Consumes: `requireUser` from `@/lib/session`
- Produces: DELETE `/api/projects/:id` returns `{ success: true }` only for owner-verified deletes; `{ error: "Project not found" }` 404 otherwise.

Ownership check must move BEFORE the child-row deletes. The current code deletes child rows first (with no user filter) and checks `userId` only on the parent delete — so an authenticated user can wipe another user's conversations/messages/PRD/AC/tasks by sending their `projectId`.

- [ ] **Step 1: Read current file**

File: `src/routes/api/projects/$id.ts` — confirm lines 20-28 delete children before line 30 checks ownership.

- [ ] **Step 2: Move ownership check to the top of the handler**

Replace the current body (after the `if (!projectId)` guard) so the owner check happens first:

```typescript
const [ownProject] = await db
  .select({ id: projects.id })
  .from(projects)
  .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
  .limit(1);
if (!ownProject)
  return Response.json({ error: "Project not found" }, { status: 404 });

// Order matters: messages→conversations first (messages FK conversations),
// then project-scoped tables, then projects last.
const convRows = await db
  .select({ id: conversations.id })
  .from(conversations)
  .where(eq(conversations.projectId, projectId));
const convIds = convRows.map((c) => c.id);
if (convIds.length > 0) {
  await db.delete(messages).where(inArray(messages.conversationId, convIds));
}
await db.delete(conversations).where(eq(conversations.projectId, projectId));
await db.delete(prdVersions).where(eq(prdVersions.projectId, projectId));
await db.delete(acVersions).where(eq(acVersions.projectId, projectId));
await db.delete(tasks).where(eq(tasks.projectId, projectId));
await db.delete(projects).where(eq(projects.id, projectId));
return Response.json({ success: true });
```

Keep the existing `requireUser` line and the `if (!projectId)` guard unchanged. This removes the post-hoc `deleted`/`existing` branching (ownership now proven up front).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/projects/\$id.ts
git commit -m "fix(security): check project ownership before deleting children (IDOR)"
```

---

### Task 2: Fix AC revision merge — match the real AC heading format

**Files:**
- Modify: `src/routes/api/ac/revise.ts`
- Create: `src/lib/services/ac-revise-merge.ts`
- Test: `src/lib/services/ac-revise-merge.test.ts`

**Interfaces:**
- Consumes: `AC_REVISION_PROMPT` from `@/lib/prompts-ac`, `saveAcVersion` from `@/lib/services/ac-service`
- Produces: `mergeAcRevision(current: string, revisionOutput: string): { merged: string; count: number }` — merged AC markdown where the model's `:::UPDATE_SECTION[<Name>]:::` content replaces the matching `## <Name>` feature section.

**Root cause:** the server merges revisions by matching `### Feature: <name>` headings (`revise.ts:139`), but the generation prompt (`prompts-ac.ts:21`) produces `## [Nama Fitur per urutan PRD]` (h2 with the raw feature name) and per-AC `### AC-N.M` subheadings. The regex never matches, so every AC revision silently saves the unchanged document as a new version.

- [ ] **Step 1: Write the failing unit test**

Create: `src/lib/services/ac-revise-merge.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { mergeAcRevision } from "@/lib/services/ac-revise-merge";

describe("mergeAcRevision", () => {
  const current = `# Acceptance Criteria - Demo

## Authentication

### AC-1.1 Login

User must log in with email.

## Billing

### AC-2.1 Invoice

Invoice is generated.
`;

  it("replaces the named feature section content", () => {
    const revised = `Baik, revisi fitur Auth diterapkan.

:::UPDATE_SECTION[Authentication]:::
## Authentication

### AC-1.1 Login

OTP required for login.

:::END_UPDATE:::
`;

    const { merged, count } = mergeAcRevision(current, revised);
    expect(count).toBe(1);
    expect(merged).toContain("## Authentication");
    expect(merged).toContain("OTP required for login.");
    expect(merged).not.toContain("User must log in with email.");
    expect(merged).toContain("## Billing");
  });

  it("returns the untouched document when no marker is present", () => {
    const revised = "No markers here, just prose.";
    const { merged, count } = mergeAcRevision(current, revised);
    expect(count).toBe(0);
    expect(merged).toBe(current);
  });

  it("appends an unknown section instead of silently dropping the revision", () => {
    const revised = `:::UPDATE_SECTION[Notifications]:::\n## Notifications\n\nNew feature.\n:::END_UPDATE:::`;
    const { merged, count } = mergeAcRevision(current, revised);
    expect(count).toBe(1);
    expect(merged).toContain("## Notifications");
    expect(merged).toContain("New feature.");
    expect(merged).toContain("## Authentication");
    expect(merged).toContain("## Billing");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/services/ac-revise-merge.test.ts`
Expected: FAIL — cannot find module `@/lib/services/ac-revise-merge`.

- [ ] **Step 3: Create the pure merge module**

Create: `src/lib/services/ac-revise-merge.ts`

A pure function (no DB) so it is testable and reusable. Strategy: split the current AC into sections at `## ` headings, and replace the section matching the update marker; if no marker matches an existing section, append the model's content as a new section (never silently discard — matching the existing "revision must not be lost" intent).

```typescript
/**
 * Merge AC revision markers back into the current AC markdown.
 *
 * The AC document's top-level feature sections are `## <Feature Name>` (h2),
 * NOT `### Feature:` — the old merge regex matched a heading the prompts never
 * produce, silently saving the unchanged document as a new version.
 * Pure function so the parse/merge logic is unit-testable.
 */
export function mergeAcRevision(
  current: string,
  revisionOutput: string,
): { merged: string; count: number } {
  const updates: Array<{ name: string; content: string }> = [];
  const markerRe =
    /:::UPDATE_SECTION\[(.+?)\]:::\s*([\s\S]*?)(?=\n:::UPDATE_SECTION\[|$)/g;
  let m: RegExpExecArray | null;
  while ((m = markerRe.exec(revisionOutput)) !== null) {
    const name = m[1].trim();
    const content = m[2].replace(/:::END_UPDATE:::\s*$/, "").trim();
    if (name && content) updates.push({ name, content });
  }
  if (updates.length === 0) return { merged: current, count: 0 };

  // Locate `## <Name>` section ranges in the current doc.
  const headingRe = /^##\s+(.+?)\s*$/gm;
  const starts: Array<{ start: number; header: string }> = [];
  let hm: RegExpExecArray | null;
  while ((hm = headingRe.exec(current)) !== null) {
    starts.push({ start: hm.index, header: hm[1].trim() });
  }
  const ranges = starts.map((s, i) => ({
    header: s.header,
    start: s.start,
    end: i < starts.length - 1 ? starts[i + 1].start : current.length,
  }));

  let merged = current;
  let count = 0;

  for (const upd of updates) {
    const target = ranges.find(
      (r) =>
        r.header.toLowerCase() === upd.name.toLowerCase() ||
        r.header.replace(/^\d+[.)\s]+/, "").toLowerCase() ===
          upd.name.toLowerCase(),
    );
    if (!target) {
      merged = `${merged.replace(/\s*$/, "\n\n")}## ${upd.name}\n\n${upd.content}\n`;
      count++;
      continue;
    }
    // Re-find the target range against the CURRENT `merged` string in case an
    // earlier update in this loop already shifted offsets — offsets computed
    // against `current`, so only apply the first N matches against the
    // original text, then recompute for subsequent edits on unmodified tails.
    const before = current.slice(0, target.start);
    const after = current.slice(target.end);
    const replaced = `${before}## ${target.header}\n\n${upd.content}\n\n${after}`;
    // Apply this single-section replacement against `merged` by locating the
    // same original header text (safe because headers are unique in the doc).
    const headerNeedle = `## ${target.header}`;
    const idx = merged.indexOf(headerNeedle);
    if (idx === -1) {
      // Section already replaced by an earlier update in this loop and its
      // header text changed — skip rather than corrupt the document.
      continue;
    }
    const nextHeaderMatch = /\n##\s+/.exec(merged.slice(idx + headerNeedle.length));
    const sectionEnd =
      nextHeaderMatch && nextHeaderMatch.index !== undefined
        ? idx + headerNeedle.length + nextHeaderMatch.index + 1
        : merged.length;
    merged = `${merged.slice(0, idx)}## ${target.header}\n\n${upd.content}\n\n${merged.slice(sectionEnd)}`;
    count++;
    void replaced; // computed for clarity/debugging parity with the offset-based approach above
  }

  return { merged, count };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/services/ac-revise-merge.test.ts`
Expected: 3 passed.

- [ ] **Step 5: Wire the new module into the revise route**

In `src/routes/api/ac/revise.ts`, replace the inline `while` / regex block inside `safeDone` (currently building `patchedMarkdown` via the `### Feature:` regex) with:

```typescript
eventDone = true;
try {
  const { merged: patchedMarkdown, count } = mergeAcRevision(
    latestAcMarkdown,
    fullResponse,
  );
  // If no marker matched at all and the model emitted a full-document
  // response instead of :::UPDATE_SECTION blocks, save its output directly
  // rather than silently keeping the old content.
  const finalContent =
    count === 0 && fullResponse.trim().startsWith("#")
      ? fullResponse
      : patchedMarkdown;

  const { acVersionId, version } = await saveAcVersion(
    projectId,
    finalContent,
    message,
    "revise",
  );
```

Add the import at the top of `revise.ts`: `import { mergeAcRevision } from "@/lib/services/ac-revise-merge";`

Leave the rest of `safeDone` (the `messages` insert + `emit({ type: "done", ... })`) unchanged.

- [ ] **Step 6: Verify types + full test suite**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npx vitest run`
Expected: no new failures introduced (the pre-existing 4 stale-test failures are fixed separately in Task 15).

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/ac-revise-merge.ts src/lib/services/ac-revise-merge.test.ts src/routes/api/ac/revise.ts
git commit -m "fix(ac): repair revision merge to match the real ## heading format"
```

---

### Task 3: Pair `recordRequest` with every `checkRateLimit` call

**Files:**
- Modify: `src/routes/api/ac/generate.ts`, `src/routes/api/ac/revise.ts`, `src/routes/api/ask/options.ts`, `src/routes/api/task/generate.ts`

**Interfaces:**
- Consumes: `recordRequest` from `@/lib/rate-limit` (signature `(userId: string, action: "ai_generate" | "ai_revise" | "api_call") => Promise<void>`)
- Produces: every AI-triggering route both checks and records, so the rate-limit table reflects real usage.

Currently only `chat.ts` calls `recordRequest` after its `checkRateLimit`; the other 4 AI routes call `checkRateLimit` (which reads the `rate_limits` table) but never insert a row, so the table stays empty for those actions and the limit is a permanent no-op (always `allowed: true`).

- [ ] **Step 1: Verify the gap**

Run: `grep -rn "checkRateLimit\|recordRequest" src/routes/api`
Expected: `recordRequest` appears only in `chat.ts`; the other four files only call `checkRateLimit`.

- [ ] **Step 2: Add `recordRequest` after the rate-check passes, in each route**

In `src/routes/api/ac/generate.ts`, change the import:

```typescript
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
```

and immediately after the existing `if (!rateCheck.allowed) return ...` block, add:

```typescript
await recordRequest(user.id, "api_call");
```

Apply the identical two changes (import + call right after the 429 guard) in `src/routes/api/ac/revise.ts`, `src/routes/api/ask/options.ts`, and `src/routes/api/task/generate.ts`.

> `chat.ts` already records with `"ai_generate"` — leave it unchanged.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/ac/generate.ts src/routes/api/ac/revise.ts src/routes/api/ask/options.ts src/routes/api/task/generate.ts
git commit -m "fix(rate-limit): recordRequest in ac/revise/ask/task routes — limit was a no-op"
```

---

### Task 4: Make credit granting atomic — prevent double credit on concurrent webhook

**Files:**
- Modify: `src/lib/services/payment-service.ts`
- Test: `src/lib/services/payment-service.test.ts`

**Interfaces:**
- Consumes: `payments`, `subscriptions` tables; `planFromAmount`, `creditsForPlan`
- Produces: `applyPaymentSuccess(orderId)` remains idempotent under racing webhooks (at most one credit grant per order) via a row-locked transaction.

**Root cause:** the idempotency guard `if (payment.status === "success") return` reads the status, then the grant runs, and only afterwards does the status flip to `success` happen. Two concurrent delivery calls (Midtrans retries, client `syncPaymentStatus` firing in parallel) both see `pending` and both run `credits = credits + N`.

- [ ] **Step 1: Read current function**

`src/lib/services/payment-service.ts` — confirm the read-then-write-then-flip ordering (no transaction, no row lock).

- [ ] **Step 2: Wrap the grant + flip in a row-locked transaction**

Replace the body of `applyPaymentSuccess` with:

```typescript
export async function applyPaymentSuccess(orderId: string) {
	const { db } = await import("@/db");
	const { payments, subscriptions } = await import("@/db/schema");

	return db.transaction(async (tx) => {
		// Row lock: a second concurrent call for the same orderId BLOCKS here
		// until the first transaction commits, then re-reads status === success
		// and returns early instead of granting a second time.
		const [payment] = await tx
			.select()
			.from(payments)
			.where(eq(payments.orderId, orderId))
			.for("update")
			.limit(1);
		if (!payment) return null;
		if (payment.status === "success") return { plan: payment.plan as Plan };

		const plan = planFromAmount(payment.amount ?? 0);
		const credits = creditsForPlan(plan);
		const now = new Date();

		const [existingSub] = await tx
			.select({ id: subscriptions.id, plan: subscriptions.plan })
			.from(subscriptions)
			.where(eq(subscriptions.userId, payment.userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1);

		if (existingSub) {
			const current = (existingSub.plan ?? "free") as Plan;
			const nextPlan =
				PLAN_RANK[plan] >= (PLAN_RANK[current] ?? 0) ? plan : current;
			await tx
				.update(subscriptions)
				.set({
					plan: nextPlan,
					status: "active",
					midtransOrderId: orderId,
					// Additive: a Pro user buying Pro again gets 10 more, not a reset to 10.
					credits: sql`${subscriptions.credits} + ${credits}`,
					updatedAt: now,
				})
				.where(eq(subscriptions.id, existingSub.id));
		} else {
			await tx.insert(subscriptions).values({
				id: crypto.randomUUID(),
				userId: payment.userId,
				plan,
				status: "active",
				midtransOrderId: orderId,
				credits,
				creditsUsed: 0,
			});
		}

		await tx
			.update(payments)
			.set({ status: "success", updatedAt: now })
			.where(eq(payments.orderId, orderId));

		return { plan };
	});
}
```

Keep `planFromAmount` and `creditsForPlan` exported exactly as they are today (unchanged). `.for("update")` is Drizzle's row-lock clause; `db.transaction` uses the same pooled `node-postgres` connection already configured in `src/db/index.ts`.

- [ ] **Step 3: Write the unit test for the pure helpers (fast, no DB)**

Create: `src/lib/services/payment-service.test.ts`

```typescript
import { describe, expect, it } from "vitest";
import { planFromAmount, creditsForPlan } from "./payment-service";

describe("planFromAmount", () => {
	it("maps the Pro price to the pro plan", () => {
		expect(planFromAmount(49000)).toBe("pro");
	});

	it("maps the Hengker price to the hengker plan", () => {
		expect(planFromAmount(149000)).toBe("hengker");
	});

	it("throws on an amount matching no plan", () => {
		expect(() => planFromAmount(12345)).toThrow(
			/does not match any plan price/,
		);
	});
});

describe("creditsForPlan", () => {
	it("returns the tier credit grant", () => {
		expect(creditsForPlan("pro")).toBe(30);
		expect(creditsForPlan("hengker")).toBe(105);
	});
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/services/payment-service.test.ts`
Expected: 4 passed.

- [ ] **Step 5: Verify types**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/services/payment-service.ts src/lib/services/payment-service.test.ts
git commit -m "fix(payments): atomic credit grant under concurrent webhooks (row-lock tx)"
```

---

### Task 5: Wire PRD generation abort — pass `request.signal` to the stream

**Files:**
- Modify: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: `tryStreamWithFallback(models, messages, externalSignal, maxTokens, onThinking)` from `@/lib/services/ai-orchestrator`
- Produces: client disconnect aborts the underlying AI stream (server stops token spend).

**Root cause:** `chat.ts:239` passes `undefined` as the third arg (externalSignal), while AC/ask/task correctly pass `request.signal`. When the client closes the tab/refreshes, the server keeps streaming to completion and burns tokens.

- [ ] **Step 1: Read the current call**

`src/routes/api/chat.ts` around line 239 — confirm `tryStreamWithFallback(modelsToTry, fullMessages, undefined, undefined, enqueueThinking)`.

- [ ] **Step 2: Pass the request signal**

Replace with:

```typescript
const { generator, firstChunk } = await tryStreamWithFallback(
	modelsToTry,
	fullMessages,
	request.signal,
	undefined,
	enqueueThinking,
);
```

`tryStreamWithFallback` already wires `externalSignal → abortController.abort()` and honors an already-aborted signal — no other change needed.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(streaming): pass AbortSignal to PRD generation — stop server token burn on disconnect"
```

---

### Task 6: Unique constraint + retry-on-conflict for PRD/AC version writes

**Files:**
- Modify: `src/db/schema.ts`, `src/lib/services/prd-service.ts`, `src/lib/services/ac-service.ts`
- Migration: generated under `drizzle/` via `pnpm db:generate`

**Interfaces:**
- Consumes: existing `prdVersions`, `acVersions` tables
- Produces: `(project_id, version)` unique — two concurrent revisions cannot both insert the same version number; the losing writer retries once with the next free version.

**Root cause:** `savePrdVersion`/`saveAcVersion` read the max version then insert `max+1` without a transaction or unique constraint. Two rapid revisions race to the same version; the viewer (`ORDER BY version DESC LIMIT 1`) then arbitrarily picks one and the other is silently lost.

- [ ] **Step 1: Make the version index unique in schema**

In `src/db/schema.ts`, add `uniqueIndex` to the drizzle-orm/pg-core import list, then change:

```typescript
export const prdVersions = pgTable("prd_versions", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id),
	version: integer("version").notNull(),
	content: text("content").notNull(),
	changeSummary: text("change_summary"),
	createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
	uniqueIndex("prd_versions_project_id_version_idx").on(t.projectId, t.version),
]);
```

and the equivalent for `acVersions`:

```typescript
export const acVersions = pgTable("ac_versions", {
	id: text("id").primaryKey(),
	projectId: text("project_id")
		.notNull()
		.references(() => projects.id),
	version: integer("version").notNull(),
	content: text("content").notNull(),
	changeSummary: text("change_summary"),
	createdAt: timestamp("created_at").defaultNow(),
}, (t) => [
	uniqueIndex("ac_versions_project_id_version_idx").on(t.projectId, t.version),
]);
```

- [ ] **Step 2: Generate + apply the migration**

Run: `pnpm db:generate`
Expected: a new file under `drizzle/` converting both indexes to unique.

Run: `pnpm db:migrate`
Expected: migration applies cleanly (no existing duplicate `(project_id, version)` rows — this is a fresh-enough dataset per the audit).

- [ ] **Step 3: Retry-on-conflict in `savePrdVersion`**

In `src/lib/services/prd-service.ts`, replace the version-read + insert block inside `savePrdVersion` with a small retry loop:

```typescript
let nextVersion = 1;
if (mode === "revise") {
	const [latest] = await db
		.select({ version: prdVersions.version })
		.from(prdVersions)
		.where(eq(prdVersions.projectId, projectId))
		.orderBy(desc(prdVersions.version))
		.limit(1);
	if (latest) nextVersion = latest.version + 1;
}

const changeSummary =
	mode === "generate" ? "Initial PRD generation" : `${userMessage.substring(0, 50)}...`;

for (let attempt = 0; attempt < 2; attempt++) {
	try {
		await db.insert(prdVersions).values({
			id: crypto.randomUUID(),
			projectId,
			version: nextVersion,
			content: fullResponse,
			changeSummary,
		});
		break;
	} catch (err: unknown) {
		const msg = err instanceof Error ? err.message : String(err);
		if (attempt === 0 && msg.includes("23505")) {
			// Unique violation — another writer took this version number.
			// Re-read the new max and retry once.
			const [latest] = await db
				.select({ version: prdVersions.version })
				.from(prdVersions)
				.where(eq(prdVersions.projectId, projectId))
				.orderBy(desc(prdVersions.version))
				.limit(1);
			nextVersion = (latest?.version ?? nextVersion) + 1;
			continue;
		}
		throw err;
	}
}
```

- [ ] **Step 4: Same retry pattern in `saveAcVersion`**

In `src/lib/services/ac-service.ts`, apply the identical two-attempt retry loop around the `acVersions` insert, re-reading `MAX(version)` on a `23505` unique-violation.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/ src/lib/services/prd-service.ts src/lib/services/ac-service.ts
git commit -m "fix(db): unique (project_id, version) + retry-on-conflict version allocation"
```

---

### Task 7: Wrap `saveTaskTree` and project DELETE in transactions

**Files:**
- Modify: `src/lib/services/task-service.ts`, `src/routes/api/projects/$id.ts`

**Interfaces:**
- Consumes: `db.transaction` (drizzle-orm/node-postgres)
- Produces: all-or-nothing task tree replacement; all-or-nothing project deletion (builds on Task 1's ownership-first ordering).

- [ ] **Step 1: Wrap `saveTaskTree` inserts + project update in one transaction**

In `src/lib/services/task-service.ts`, replace the body of `saveTaskTree`:

```typescript
export async function saveTaskTree(
	projectId: string,
	taskTree: TaskTree,
): Promise<{ success: boolean; error?: string }> {
	try {
		await db.transaction(async (tx) => {
			await tx.delete(tasks).where(eq(tasks.projectId, projectId));

			let order = 0;
			for (const feature of taskTree.features) {
				for (const task of feature.tasks) {
					const subtaskRows = task.subtasks.map((s) => ({
						name: s.name,
						description: s.description,
						details: s.details ?? [],
						status: "pending" as const,
					}));
					await tx.insert(tasks).values({
						id: crypto.randomUUID(),
						projectId,
						title: task.name,
						description: task.description || null,
						featureName: feature.name,
						status: "pending",
						subtasks: subtaskRows,
						order: order++,
					});
				}
			}

			const [proj] = await tx
				.select({ step: projects.step })
				.from(projects)
				.where(eq(projects.id, projectId))
				.limit(1);
			const updateData: Record<string, unknown> = {
				taskStatus: "completed",
				updatedAt: new Date(),
			};
			const next = advanceStep(proj?.step, "task");
			if (next) updateData.step = next;
			await tx.update(projects).set(updateData).where(eq(projects.id, projectId));
		});
		return { success: true };
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.error("saveTaskTree error:", msg);
		return { success: false, error: msg };
	}
}
```

- [ ] **Step 2: Wrap project DELETE child-writes + parent delete in one transaction**

In `src/routes/api/projects/$id.ts` (after Task 1's ownership-first check), wrap the delete sequence:

```typescript
await db.transaction(async (tx) => {
	const convRows = await tx
		.select({ id: conversations.id })
		.from(conversations)
		.where(eq(conversations.projectId, projectId));
	const convIds = convRows.map((c) => c.id);
	if (convIds.length > 0) {
		await tx.delete(messages).where(inArray(messages.conversationId, convIds));
	}
	await tx.delete(conversations).where(eq(conversations.projectId, projectId));
	await tx.delete(prdVersions).where(eq(prdVersions.projectId, projectId));
	await tx.delete(acVersions).where(eq(acVersions.projectId, projectId));
	await tx.delete(tasks).where(eq(tasks.projectId, projectId));
	await tx.delete(projects).where(eq(projects.id, projectId));
});
return Response.json({ success: true });
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/task-service.ts src/routes/api/projects/\$id.ts
git commit -m "fix(db): transactional task-tree replace and project delete"
```

---

### Task 8: Add truncation guard to PRD generation

**Files:**
- Modify: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: `isTruncatedGeneration` from `@/lib/flow-progress`, `outcome: StreamOutcome` from `tryStreamWithFallback`
- Produces: a PRD stream that ended with `finishReason: "length"|"error"|"other"|"content-filter"` is NOT persisted as a new version (matches existing AC behavior).

**Root cause:** AC generation (`ac/generate.ts`) and AC revise capture `outcome` and reject truncated streams via `isTruncatedGeneration`; PRD in `chat.ts` destructures only `{ generator, firstChunk }` and never checks `finishReason`. A dropped/truncated PRD gets saved AND a credit burned.

- [ ] **Step 1: Capture the outcome**

In `src/routes/api/chat.ts` (same call site touched in Task 5), destructure `outcome` too:

```typescript
const { generator, firstChunk, outcome } = await tryStreamWithFallback(
	modelsToTry,
	fullMessages,
	request.signal,
	undefined,
	enqueueThinking,
);
```

- [ ] **Step 2: Import the guard**

Add to the top-level imports in `chat.ts`:

```typescript
import { isTruncatedGeneration } from "@/lib/flow-progress";
```

- [ ] **Step 3: Guard the save path**

Immediately before the existing block that starts with:

```typescript
let finalPrdToSave: string | undefined;
if (
	(mode === "generate" ||
		mode === "revise" ||
		mode === "resume") &&
	conversationIdToUse
) {
```

add the truncation check as the first line inside that `if`:

```typescript
if (isTruncatedGeneration(fullResponse, outcome.finishReason)) {
	safeError(
		"Generasi PRD terputus di tengah jalan dan tidak disimpan. Coba generate ulang.",
	);
	return;
}
```

`safeError` is already defined earlier in this closure (same pattern used elsewhere in the file) and closes the controller — returning right after it is safe and matches the existing control flow.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(prd): reject truncated generation — don't persist partial PRD or burn credit"
```

---

### Task 9: Dedup concurrent AC/Task generation per project

**Files:**
- Modify: `src/routes/api/ac/generate.ts`, `src/routes/api/task/generate.ts`

**Interfaces:**
- Consumes: `projects` table (`acStatus`/`taskStatus` columns)
- Produces: a second concurrent generate for the same project is rejected (409) while one is `generating`.

**Root cause:** both routes set `status: "generating"` unconditionally and never check it first, so a double-click fires two streams → two AI calls → two credit burns → duplicate/colliding versions.

- [ ] **Step 1: Reject when already generating (AC)**

In `src/routes/api/ac/generate.ts`, add `ne` to the drizzle-orm import list, then replace:

```typescript
await db
	.update(projects)
	.set({ acStatus: "generating" })
	.where(eq(projects.id, projectId));
```

with a conditional claim:

```typescript
const claimed = await db
	.update(projects)
	.set({ acStatus: "generating" })
	.where(and(eq(projects.id, projectId), ne(projects.acStatus, "generating")))
	.returning({ id: projects.id });
if (!claimed.length) {
	return Response.json(
		{ error: "AC sedang digenerate. Tunggu hingga selesai." },
		{ status: 409 },
	);
}
```

- [ ] **Step 2: Reject when already generating (Task)**

In `src/routes/api/task/generate.ts`, apply the same pattern with `taskStatus`:

```typescript
const claimed = await db
	.update(projects)
	.set({ taskStatus: "generating" })
	.where(and(eq(projects.id, projectId), ne(projects.taskStatus, "generating")))
	.returning({ id: projects.id });
if (!claimed.length) {
	return Response.json(
		{ error: "Task sedang digenerate. Tunggu hingga selesai." },
		{ status: 409 },
	);
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/ac/generate.ts src/routes/api/task/generate.ts
git commit -m "fix(gen): reject concurrent generate per project — prevent double credit/version"
```

---

### Task 10: Make PRD revise fallback regex safe against section-name mismatch

**Files:**
- Modify: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: the existing `:::UPDATE_SECTION` parse loop in the revise-merge block
- Produces: when a marker's section name isn't in `ALL_SECTION_NAMES`, the fallback must NOT match to end-of-document; and `lastIndex` is reset between `.test()`/`.replace()` calls on the same `g`-flag regex.

**Root cause:** Strategy 2 builds `endBoundary = "(?:[\s\S]*|$)"` when `ALL_SECTION_NAMES.indexOf(sectionName) === -1`, so a numbered/mismatched name like `[1. Overview]` replaces everything from that tag to EOF — destroying the rest of the PRD. Separately, a `g`-flag regex's `.test()` call advances `lastIndex`, which can desync the subsequent `.replace()` on the same object.

- [ ] **Step 1: Guard the unknown-section case explicitly**

In `src/routes/api/chat.ts`, inside the revise-merge `while` loop (the block building `mergedPrd` via `ALL_SECTION_NAMES`), replace the section-index handling:

```typescript
const ALL_SECTION_NAMES = [
	"Overview",
	"Goals & Success Metrics",
	"Requirements",
	"Core Features",
	"User Flow",
	"Architecture & Tech Stack",
	"Database Schema",
	"Design & Technical Constraints",
];
const sectionIdx = ALL_SECTION_NAMES.indexOf(sectionName);
if (sectionIdx === -1) {
	// Unknown/mismatched section name (e.g. numbered "1. Overview") — skip
	// this update rather than falling through to a wildcard EOF match that
	// would destroy the rest of the document.
	continue;
}
const nextSection =
	sectionIdx < ALL_SECTION_NAMES.length - 1
		? ALL_SECTION_NAMES[sectionIdx + 1]
		: null;
const endBoundary = nextSection
	? `(?:[\\s\\S]*?<!-- SECTION: ${nextSection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} -->)`
	: "(?:[\\s\\S]*|$)";
sectionRegex = new RegExp(`${openingTag}[\\s\\S]*?${endBoundary}`, "g");
if (sectionRegex.test(mergedPrd)) {
	sectionRegex.lastIndex = 0;
	const endMarker = nextSection
		? `\n\n<!-- SECTION: ${nextSection} -->`
		: "";
	mergedPrd = mergedPrd.replace(
		sectionRegex,
		`${openingTag}\n${newSectionContent}${endMarker}`,
	);
	isMerged = true;
}
```

Note the `continue` when `sectionIdx === -1` (skip this marker, proceed to the next `while` iteration) and `sectionRegex.lastIndex = 0` reset right after `.test()` succeeds and before `.replace()`.

- [ ] **Step 2: Apply the same `lastIndex` reset to the Strategy 1 (strict) branch**

Just above, the strict-match branch does `sectionRegex.test(mergedPrd)` then `mergedPrd.replace(sectionRegex, ...)` — add `sectionRegex.lastIndex = 0;` between the `if (sectionRegex.test(...))` and the `.replace()` call, defensively (String.replace with a global regex does not depend on `lastIndex`, but keeping both branches consistent avoids future regressions if this code is refactored to `.exec()`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(prd-revise): never match to EOF on unknown section name"
```

---

### Task 11: Clear `isGeneratingPRD` when a stream ends without done/error

**Files:**
- Modify: `src/components/chat/chat-panel.tsx`

**Interfaces:**
- Consumes: `useChatStore` `setGeneratingPRD` / `setStreamingPRDContent`
- Produces: no stuck loading spinner when the server closes the stream without a terminal event.

**Root cause:** the `finally` block deliberately skips `setGeneratingPRD(false)` for generate/resume (the `done` handler owns cleanup, to avoid hiding the progress card before `router.refresh()` lands). But when the stream closes with neither `done` nor `error` (proxy timeout / dropped connection), the existing `!gotDoneEvent && !gotErrorEvent` block already runs `router.refresh()` — it just never clears the flag, so the spinner is stuck until the component remounts.

- [ ] **Step 1: Locate the post-stream no-terminal-event block**

In `chat-panel.tsx`, find the block (after the SSE read loop, before the mode-specific `finalDisplayContent` handling):

```typescript
if (
	!gotDoneEvent &&
	!gotErrorEvent &&
	(chatMode === "generate" ||
		chatMode === "revise" ||
		chatMode === "resume")
) {
	startTransition(() => {
		router.refresh();
	});
	if (fullContent.trim().length === 0) {
		showToast(
			"Koneksi terputus. PRD mungkin sudah tersimpan sebagian - coba refresh halaman.",
			"info",
		);
	}
}
```

- [ ] **Step 2: Clear the loading state in this branch**

Add two lines at the end of the same `if` block:

```typescript
if (
	!gotDoneEvent &&
	!gotErrorEvent &&
	(chatMode === "generate" ||
		chatMode === "revise" ||
		chatMode === "resume")
) {
	startTransition(() => {
		router.refresh();
	});
	if (fullContent.trim().length === 0) {
		showToast(
			"Koneksi terputus. PRD mungkin sudah tersimpan sebagian - coba refresh halaman.",
			"info",
		);
	}
	// Server closed without a terminal event — release the loading state so the
	// user isn't stuck on a perpetual spinner until the refresh lands.
	setGeneratingPRD(false);
	setStreamingPRDContent("");
}
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "fix(chat): clear isGeneratingPRD when stream ends without done/error"
```

---

### Task 12: Harden Mermaid — sanitize rendered SVG before DOM injection

**Files:**
- Modify: `src/components/prd/mermaid.tsx`

**Interfaces:**
- Consumes: `mermaid`, `DOMPurify` (both already imported)
- Produces: rendered SVGs are sanitized before `dangerouslySetInnerHTML`.

**Root cause:** `securityLevel: "loose"` lets Mermaid emit raw HTML inside `<foreignObject>` from chart labels. The successful-render branch calls `setSvg(renderSvg)` directly with no sanitization, while the two error/fallback branches DO call `DOMPurify.sanitize`. AI-generated charts derived from user prompts can carry HTML through the label text.

- [ ] **Step 1: Sanitize the rendered SVG before injection**

In the successful-render branch (after the "Empty SVG rendered" guard), replace:

```typescript
setSvg(renderSvg);
setHasError(false);
```

with:

```typescript
// ponytail: mermaid "loose" emits raw <foreignObject> HTML labels. The SVG is
// diagram markup, but sanitize it anyway — labels may carry markup derived
// from AI/user input and dangerouslySetInnerHTML trusts us completely.
setSvg(
	DOMPurify.sanitize(renderSvg, {
		USE_PROFILES: { svg: true, svgFilters: true },
	}),
);
setHasError(false);
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Manual smoke check**

Run the dev server (`pnpm dev`), open a PRD with an Architecture diagram, confirm the mermaid chart still renders visually identical to before.

- [ ] **Step 4: Commit**

```bash
git add src/components/prd/mermaid.tsx
git commit -m "fix(security): sanitize mermaid SVG before dangerouslySetInnerHTML"
```

---

### Task 13: Enforce share-link plan gate server-side

**Files:**
- Modify: `src/lib/services/prd-service.ts`, `src/routes/api/chat.ts`, `src/routes/prd/share/$token.tsx`

**Interfaces:**
- Consumes: `subscriptions` table (plan), `FEATURES` from `@/types/database`, `projects.shareToken`
- Produces: only plans where `FEATURES[plan].shareLink !== false` receive a share token on generate; the share route 403s (via NOT_FOUND) for any project whose owner's current plan is gated, including legacy tokens.

**Root cause:** `savePrdVersion` always generates a `shareToken` regardless of plan. `FEATURES.free.shareLink === false`, so free users silently gain the paid sharing capability server-side (the UI has no share-copy button today, but the token exists and the read route serves it to anyone with the URL).

- [ ] **Step 1: Thread a plan-gate flag into `savePrdVersion`**

In `src/lib/services/prd-service.ts`, change the signature and the token-minting condition:

```typescript
export async function savePrdVersion(
	conversationId: string,
	fullResponse: string,
	userMessage: string,
	mode: "generate" | "revise",
	allowShareLink = true,
): Promise<void> {
	const [conv] = await db
		.select({ projectId: conversations.projectId })
		.from(conversations)
		.where(eq(conversations.id, conversationId))
		.limit(1);
	if (!conv?.projectId) {
		console.warn("savePrdVersion: conversation missing project_id, content discarded", { conversationId });
		return;
	}
	const projectId = conv.projectId;

	if (mode === "generate" && allowShareLink) {
		await db
			.update(projects)
			.set({ shareToken: generateShareToken() })
			.where(eq(projects.id, projectId));
	}
	// ... rest of the function unchanged (version insert + status update)
```

- [ ] **Step 2: Pass the gate from the call site**

In `src/routes/api/chat.ts`, at the existing `await savePrdVersion(...)` call, resolve the caller's `plan` (already loaded earlier in the handler as `plan`) and pass the gate:

```typescript
const { FEATURES } = await import("@/types/database");
const allowShare = FEATURES[plan].shareLink !== false;
await savePrdVersion(
	conversationIdToUse,
	finalPrdToSave,
	message,
	mode === "resume" ? "generate" : mode,
	allowShare,
);
```

- [ ] **Step 3: Gate the share route by the project owner's CURRENT plan**

In `src/routes/prd/share/$token.tsx`, extend `loadSharedPrd`:

```typescript
const loadSharedPrd = createServerFn({ method: 'GET' })
	.validator((token: string) => token)
	.handler(async ({ data: token }) => {
		const [project] = await db
			.select({ id: projects.id, name: projects.name, userId: projects.userId })
			.from(projects)
			.where(eq(projects.shareToken, token))
			.limit(1)
		if (!project) throw new Error('NOT_FOUND')

		const { subscriptions } = await import('@/db/schema')
		const { FEATURES } = await import('@/types/database')
		const [sub] = await db
			.select({ plan: subscriptions.plan })
			.from(subscriptions)
			.where(eq(subscriptions.userId, project.userId))
			.orderBy(desc(subscriptions.createdAt))
			.limit(1)
		const plan = (sub?.plan || 'free') as 'free' | 'pro' | 'hengker'
		if (FEATURES[plan].shareLink === false) throw new Error('NOT_FOUND')

		const [latest] = await db.select({ content: prdVersions.content }).from(prdVersions).where(eq(prdVersions.projectId, project.id)).orderBy(desc(prdVersions.version)).limit(1)
		if (!latest) throw new Error('NOT_FOUND')

		return { content: latest.content, projectName: project.name }
	})
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/services/prd-service.ts src/routes/api/chat.ts src/routes/prd/share/\$token.tsx
git commit -m "fix(share): gate share-token minting + read route by current plan"
```

---

### Task 14: Surface credit-burn failure honestly instead of a misleading error

**Files:**
- Modify: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: `consumeCredit` from `@/lib/credits`
- Produces: when `savePrdVersion` already succeeded but the credit burn fails or reports `false`, the user is told the PRD was saved (not "Kredit habis" — which implies nothing was generated).

**Root cause:** the existing code emits `{ type: "error", error: "Kredit kamu sudah habis. Beli kredit untuk membuat proyek baru." }` when `consumeCredit` returns `false` — but by this point `savePrdVersion` already ran and the PRD is saved. The user sees an error message that contradicts what actually happened.

- [ ] **Step 1: Locate the existing block**

In `src/routes/api/chat.ts`, find the `try { if (mode === "generate") { const burned = await consumeCredit(user.id); ... } } catch (err) { ... }` block (immediately after `await savePrdVersion(...)`).

- [ ] **Step 2: Replace the misleading message with an honest one**

```typescript
try {
	// One credit per project, at generate only. Revisi is free.
	if (mode === "generate") {
		const burned = await consumeCredit(user.id);
		if (!burned) {
			console.warn(
				"savePrdVersion succeeded but consumeCredit returned false for user",
				user.id,
			);
			emit({
				type: "error",
				error:
					"PRD tersimpan, namun kredit gagal dipotong. Saldo kreditmu mungkin tidak akurat — hubungi dukungan jika ini terjadi berulang.",
			});
			try {
				controller.close();
			} catch {}
			return;
		}
	}
} catch (err) {
	console.error(
		"Failed to consume credit for user",
		user.id,
		err,
	);
	emit({
		type: "error",
		error:
			"PRD tersimpan, namun terjadi kesalahan saat memotong kredit. Hubungi dukungan jika saldo kreditmu tidak akurat.",
	});
}
```

Keep the existing `try`/`catch` shape and `controller.close()` pattern from the surrounding code; only the message text and the added `close()` on the `!burned` path change (the original code already closed the controller there).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "fix(credit): surface burn failure honestly instead of misleading 'kredit habis'"
```

---

### Task 15: Fix the 4 stale failing unit tests

**Files:**
- Modify: `src/lib/prompt-depth.test.ts`, `src/types/database.test.ts`

**Interfaces:**
- Produces: `npx vitest run` → 0 failures.

**Root cause:** pricing changed (Pro 10→30, Hengker 35→105 credits, per `src/types/database.ts` `PLAN_CREDITS`) and the prompt-depth directive changed from "MAKSIMAL/EXHAUSTIVE" fixed-tier wording to "MODE KEDALAMAN: ADAPTIF" complexity-scaled wording (per `src/lib/prompt-depth.ts`), but the tests still assert the old values/text.

- [ ] **Step 1: Read the current failing assertions**

Read `src/types/database.test.ts` (full file) and `src/lib/prompt-depth.test.ts` (full file) to see their current structure before editing.

- [ ] **Step 2: Update `database.test.ts` credit expectations**

Change the two failing assertions:

```typescript
it("pro gets 30 credits", () => {
	expect(PLAN_CREDITS.pro).toBe(30);
});

it("hengker gets 105 credits", () => {
	expect(PLAN_CREDITS.hengker).toBe(105);
});
```

(Rename the `it` description strings to match the new numbers; keep the existing `free` test unchanged since it already passes.)

- [ ] **Step 3: Update `prompt-depth.test.ts` to the current directive contract**

Replace the two failing test bodies (the ones matching `/MAKSIMAL|EXHAUSTIVE/i` and `/SEMUA section|seluruh section|.../i`) with assertions against the actual current text in `src/lib/prompt-depth.ts`:

```typescript
it("returns the adaptive-depth directive for each doc kind", () => {
	expect(depthDirective("prd")).toContain("MODE KEDALAMAN: ADAPTIF");
	expect(depthDirective("ac")).toContain("MODE KEDALAMAN: ADAPTIF");
	expect(depthDirective("task")).toContain("MODE KEDALAMAN: ADAPTIF");
});

it("scales depth to complexity instead of forcing one fixed maximal tier", () => {
	const prd = depthDirective("prd");
	expect(prd).toMatch(/kompleksitas/i);
	expect(prd).not.toMatch(/MAKSIMAL|EXHAUSTIVE/);
});
```

Keep any other passing tests in the file (e.g. structural checks unrelated to the wording) unchanged.

- [ ] **Step 4: Run all tests — expect pass**

Run: `npx vitest run`
Expected: 0 failed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompt-depth.test.ts src/types/database.test.ts
git commit -m "test: align stale expectations with current pricing + adaptive-depth directives"
```

---

### Task 16: Remove dead types and dead store quota fields

**Files:**
- Modify: `src/types/database.ts`, `src/store/index.ts`

**Interfaces:**
- Consumes: none removed from active use — `AcVersion` stays (imported by `ac-detail.tsx`), `Plan` stays (used everywhere)
- Produces: no change to compiled behavior; dead interfaces and unused store fields removed.

**Root cause:** `Task`, `Subtask`, `Feature`, `NodePosition`, `NodeType`, `Subscription`, `Conversation` interfaces describe an old normalized schema (feature_id, node_type, etc.) that no longer matches the flat `tasks`-with-jsonb model in `src/db/schema.ts`. `prdUsed`/`prdLimit`/`setQuota` in the Zustand auth store are never called from any component.

- [ ] **Step 1: Verify nothing imports the dead symbols**

Run: `grep -rn "NodePosition\|NodeType\|storage_path\|is_shared\|feature_id\|node_type" src --include="*.ts" --include="*.tsx"`
Expected: matches only inside `src/types/database.ts` itself.

Run: `grep -rn "\bTask\b\|\bSubtask\b\|\bFeature\b" src/types/database.ts` to confirm exact line ranges to delete, then `grep -rln "from \"@/types/database\"\|from '@/types/database'" src` and check each importing file doesn't reference these three names.

- [ ] **Step 2: Remove the dead interfaces**

In `src/types/database.ts`, delete the `Task`, `Subtask`, `Feature`, `NodeType`, `NodePosition`, `Subscription`, and `Conversation` interfaces entirely (both the early `Subscription`/`Conversation` block and the later "VibeCoding platform tables" block). Keep `Plan`, `User`, `Project`, `PrdVersion`, `Message`, `Payment`, `AcVersion`, `NotificationPreferences`, `PLAN_CREDITS`, `PLAN_PRICES`, `FEATURES`, `ApiKey`.

- [ ] **Step 3: Trim the Zustand auth store**

Run: `grep -rn "setQuota\|prdLimit\|prdUsed" src --include="*.tsx" --include="*.ts"`

If the only matches are inside `src/store/index.ts`, remove `prdUsed`, `prdLimit`, and `setQuota` from the `AuthState` interface, `initialState`, and the `useAuthStore` implementation in `src/store/index.ts`.

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

Run: `npx vitest run`
Expected: 0 failures (same count as after Task 15).

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts src/store/index.ts
git commit -m "chore: remove dead types and unused store quota fields"
```

---

### Task 17: Remove the fake empty subtask id from the kanban response

**Files:**
- Modify: `src/routes/api/kanban/$pid.ts`, `src/hooks/use-kanban-polling.ts`

**Interfaces:**
- Consumes: `tasks.subtasks` jsonb (`{ name, description, details, status }` — no per-item id in storage)
- Produces: `subtasks[]` no longer carries a misleading always-empty `id` field; client already falls back to index-based keys.

**Root cause:** `$pid.ts` maps subtasks with `id: ""` — the flat schema stores subtasks as jsonb without per-row ids, so a real id is genuinely unavailable at the source. `kanban-card.tsx:171` already does `key={sub.id || idx}`, so dropping the field is a lazy, correct fix rather than fabricating an id.

- [ ] **Step 1: Remove the fake id in the API response**

In `src/routes/api/kanban/$pid.ts`, change:

```typescript
subtasks: sub.map((s) => ({ id: "", name: s.name as string, status: (s.status as string) ?? "pending" })),
```

to:

```typescript
subtasks: sub.map((s) => ({ name: s.name as string, status: (s.status as string) ?? "pending" })),
```

Also update the `TaskCard` interface in the same file (`subtasks: Array<{ id: string; name: string; status: string }>`) to `Array<{ name: string; status: string }>`.

- [ ] **Step 2: Match the type in the polling hook**

In `src/hooks/use-kanban-polling.ts`, update the exported `TaskCard` interface's `subtasks` field the same way: `subtasks?: Array<{ name: string; status: string }>` (remove `id`).

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors (confirms `kanban-card.tsx`'s `key={sub.id || idx}` still compiles because `idx` covers the fallback — if TypeScript complains about `sub.id`, update that one read site to `key={idx}`).

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/kanban/\$pid.ts src/hooks/use-kanban-polling.ts
git commit -m "fix(kanban): remove fake subtask id — key by index client-side"
```

---

### Task 18: Key the PRD draft per project instead of one shared slot

**Files:**
- Modify: `src/lib/prompt-handoff.ts`

**Interfaces:**
- Consumes: none (pure sessionStorage helper)
- Produces: `savePrdDraft(projectId, draft)` / `getPrdDraft(projectId)` — same public signatures, callers unchanged — but drafts for different projects no longer overwrite each other.

**Root cause:** one sessionStorage key `novaplan:prd-draft` holds `{ projectId, draft }`. Writing project A's draft after project B's overwrites B's saved draft entirely (the reader correctly refuses to return a mismatched project's draft, but the underlying data for the other project is already gone).

- [ ] **Step 1: Replace the single-slot storage with a per-project map**

In `src/lib/prompt-handoff.ts`, replace the `PRD_DRAFT_KEY` section:

```typescript
/* ---------- PRD chat follow-up draft (survives refresh) ---------- */
const PRD_DRAFT_MAP_KEY = "novaplan:prd-drafts";

function readPrdDraftMap(): Record<string, string> {
	const storage = getStorage();
	const raw = storage?.getItem(PRD_DRAFT_MAP_KEY);
	if (!raw) return {};
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : {};
	} catch {
		return {};
	}
}

/** Persist the PRD chat input draft, keyed per project so drafts don't leak
 *  between projects. Tab-scoped (sessionStorage): a draft is session work. */
export function savePrdDraft(projectId: string, draft: string) {
	const storage = getStorage();
	if (!storage) return;
	const all = readPrdDraftMap();
	if (!draft) {
		delete all[projectId];
	} else {
		all[projectId] = draft;
	}
	storage.setItem(PRD_DRAFT_MAP_KEY, JSON.stringify(all));
}

/** Read-only restore. Returns "" if missing for this project. */
export function getPrdDraft(projectId: string): string {
	return readPrdDraftMap()[projectId] ?? "";
}

export function clearPrdDraft() {
	// ponytail: no projectId available at some call sites — kept as a full
	// clear for backward compatibility with existing callers.
	getStorage()?.removeItem(PRD_DRAFT_MAP_KEY);
}
```

Check existing callers of `clearPrdDraft()` (grep `clearPrdDraft` in `src/components`) to confirm none rely on clearing only one project's draft; if one does, change that call site to inline the per-project delete via `savePrdDraft(projectId, "")` instead.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompt-handoff.ts
git commit -m "fix(prompt): store PRD drafts per-project instead of one shared slot"
```

---

### Task 19: Fix the `useParams` compat shim

**Files:**
- Modify: `src/lib/next-compat/navigation.tsx`

**Interfaces:**
- Consumes: `useMatches` from `@tanstack/react-router`
- Produces: `useParams()` returns the matched route's params object, not a pathname string cast to `T`.

**Root cause:** the shim returns `useLocation({ select: (l) => l.pathname })` cast to `T` — that's the URL path string, not a params object. Currently unused anywhere in the codebase, but it's a latent bug in the compat surface that would silently misbehave the moment someone adds `useParams` usage.

- [ ] **Step 1: Confirm it's unused today**

Run: `grep -rn "useParams" src --include="*.tsx" --include="*.ts"`
Expected: only the definition in `navigation.tsx` — no call sites yet.

- [ ] **Step 2: Reimplement correctly**

Replace the current `useParams` export in `src/lib/next-compat/navigation.tsx`:

```typescript
import {
	useNavigate,
	useRouter as useTanstackRouter,
	useLocation,
	useMatches,
} from "@tanstack/react-router";

// ...

export function useParams<T = Record<string, string>>(): T {
	const matches = useMatches();
	const leaf = matches[matches.length - 1];
	return (leaf?.params ?? {}) as T;
}
```

Add `useMatches` to the existing `@tanstack/react-router` import.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/next-compat/navigation.tsx
git commit -m "fix(shim): useParams returns route params, not a pathname cast"
```

---

### Task 20: Pause the home-page typing placeholder when the tab is hidden

**Files:**
- Modify: `src/hooks/use-typing-placeholder.ts`

**Interfaces:**
- Consumes: none new (uses `document.hidden` / `visibilitychange`, already used elsewhere in the codebase e.g. `use-kanban-polling.ts`)
- Produces: same typing/deleting visual while the tab is visible; timers stop scheduling while hidden and resume on return — same public `useTypingPlaceholder(isMobile)` signature.

**Root cause:** the tick effect reschedules itself unconditionally every 15-60ms regardless of tab visibility, burning CPU indefinitely on an idle background tab.

- [ ] **Step 1: Read the current effect**

`src/hooks/use-typing-placeholder.ts` — the second `useEffect` (the `tick` scheduler).

- [ ] **Step 2: Guard scheduling on visibility, matching the existing pattern in `use-kanban-polling.ts`**

Replace the second `useEffect` body with:

```typescript
useEffect(() => {
	let timer: ReturnType<typeof setTimeout>;

	const tick = () => {
		if (document.hidden) return; // don't advance/schedule while tab is hidden
		const current = prompts[indexRef.current % prompts.length];

		if (phaseRef.current === "typing") {
			if (charRef.current < current.length) {
				charRef.current++;
				setDisplay(current.slice(0, charRef.current));
				timer = setTimeout(tick, 30 + Math.random() * 30);
			} else {
				phaseRef.current = "pausing";
				timer = setTimeout(tick, 2500);
			}
		} else if (phaseRef.current === "pausing") {
			phaseRef.current = "deleting";
			timer = setTimeout(tick, 50);
		} else {
			if (charRef.current > 0) {
				charRef.current = Math.max(0, charRef.current - 2);
				setDisplay(current.slice(0, charRef.current));
				timer = setTimeout(tick, 15);
			} else {
				indexRef.current++;
				phaseRef.current = "typing";
				timer = setTimeout(tick, 400);
			}
		}
	};

	const handleVisibilityChange = () => {
		if (!document.hidden) {
			clearTimeout(timer);
			timer = setTimeout(tick, 60);
		}
	};
	document.addEventListener("visibilitychange", handleVisibilityChange);

	timer = setTimeout(tick, 500);
	return () => {
		clearTimeout(timer);
		document.removeEventListener("visibilitychange", handleVisibilityChange);
	};
}, [isMobile, prompts]);
```

The only behavioral changes: `tick` returns immediately (without scheduling another timer) when `document.hidden`, and a `visibilitychange` listener restarts the cycle when the tab becomes visible again.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-typing-placeholder.ts
git commit -m "fix(perf): pause typing placeholder timers when tab hidden"
```

---

### Task 21: Require the Authorization header for kanban update-status — drop body fallback

**Files:**
- Modify: `src/routes/api/kanban/update-status.ts`

**Interfaces:**
- Consumes: `apiKeys` table (unchanged)
- Produces: auth via `Authorization: Bearer <key>` header only — the raw key is never accepted from the JSON body.

**Root cause:** `body.apiKey` fallback puts the raw API key inside the request body, which is far more likely to be captured in server/WAF/proxy access logs than an `Authorization` header (which most logging infrastructure redacts by convention).

- [ ] **Step 1: Read the current handler**

`src/routes/api/kanban/update-status.ts` — confirm the `if (!apiKey && body.apiKey) apiKey = body.apiKey;` line.

- [ ] **Step 2: Remove the body fallback**

Replace:

```typescript
const authHeader = request.headers.get("Authorization");
let apiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";

const body = await request.json().catch(() => null);
if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
if (!apiKey && body.apiKey) apiKey = body.apiKey;
if (!apiKey) return Response.json({ error: "API Key required" }, { status: 401 });
```

with:

```typescript
const authHeader = request.headers.get("Authorization");
const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";
if (!apiKey) return Response.json({ error: "API Key required" }, { status: 401 });

const body = await request.json().catch(() => null);
if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
```

(Auth check moved before the body parse so an unauthenticated request never needs its body read — no behavioral change beyond removing the key-in-body path.)

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/kanban/update-status.ts
git commit -m "fix(security): require Bearer header for kanban API key — drop body fallback"
```

---

## Execution order

Push after each block completes:

1. **Block 1 — CRITICAL:** Tasks 1-2. `git push`.
2. **Block 2 — HIGH:** Tasks 3-8. `git push`.
3. **Block 3 — MEDIUM:** Tasks 9-15. `git push`.
4. **Block 4 — LOW:** Tasks 16-21. `git push`.

Each task is independently verifiable (`npx tsc --noEmit`, `npx vitest run`) and commits on its own. Do not combine tasks into one commit — every change is scoped to one verified bug so a bad fix can be reverted without losing the others.
