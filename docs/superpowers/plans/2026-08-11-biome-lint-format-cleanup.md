# Biome Lint & Format Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 536 Biome violations (480 errors, 56 warnings, 15 infos) across 208 files — real lint bugs first, cosmetic/format last — to reach zero `pnpm biome check` diagnostics.

**Architecture:** Two-phase approach. Phase 1 (Tasks 1–7): fix all real lint rule violations manually — `noArrayIndexKey`, `useExhaustiveDependencies`, `noNonNullAssertion`, `noAssignInExpressions`, `noExplicitAny`, plus one-off rules. These require reading code and choosing correct fixes. Phase 2 (Tasks 8–9): auto-fix all cosmetic violations (format, import sort, unused) via `biome check --write`. Each task ships independently testable — `pnpm biome check` error count must decrease after each.

**Tech Stack:** Biome 2.4.5 (`@biomejs/biome`), React 19, TypeScript 6, Vite 8, Tailwind CSS 4, TanStack Start.

## Global Constraints

- **No new dependencies.** Every fix uses existing code or Biome auto-fix.
- **No behavior changes.** Every fix is semantically equivalent — same runtime behavior, fewer lint warnings.
- **`biome-ignore` only where intentional.** If the dep array is deliberately over-specified for re-run semantics, suppress with a comment explaining *why*, don't silently drop the dep.
- **TypeScript must stay clean:** `npx tsc --noEmit` → 0 errors after every task.
- **Build must stay clean:** `pnpm build` → success after every task.
- **Commit after every task.** `git add <files> && git commit -m "fix(biome): <rule> — <scope>"`.
- **No unrelated refactors.** Each task fixes one Biome rule category only.
- **Existing biome-ignore comments with valid reason:** preserve them. Only delete stale/unused ones.

---

## Priority Map

| # | Rule | Count | Auto-fixable? | Bug severity | Task |
|---|------|-------|---------------|-------------|------|
| 1 | `noArrayIndexKey` | 15 | ❌ | **HIGH** — React reconciliation bug | Task 1 |
| 2 | `useExhaustiveDependencies` | 32 | ✅ (but wrong) | **HIGH** — stale closure | Task 2 |
| 3 | `noNonNullAssertion` | 12 | ❌ | **MEDIUM** — runtime crash risk | Task 3 |
| 4 | `noAssignInExpressions` | 3 | ❌ | **MEDIUM** — readability/misread | Task 4 |
| 5 | `noExplicitAny` | 2 | ❌ | **LOW** — type safety | Task 5 |
| 6 | one-offs (`useNodejsImportProtocol`, `useLiteralKeys`, `noImportantStyles`, unused suppressions) | 12 | partial | **LOW** | Task 6 |
| 7 | `noUnusedImports` + `noUnusedVariables` + `noUnusedFunctionParameters` | 31 | ✅ | **LOW** — dead code | Task 7 |
| 8 | `organizeImports` | 89 | ✅ | **LOW** — cosmetic | Task 8 |
| 9 | format (quotes, semicolons, indent, arrow parens) | ~390 | ✅ | **LOW** — cosmetic | Task 9 |

---

### Task 1: Fix `noArrayIndexKey` — use stable React keys (15 sites)

**Files:**
- Modify: `src/components/chat/chat-panel.tsx:951`
- Modify: `src/components/kanban/kanban-board.tsx:106,227`
- Modify: `src/components/kanban/kanban-card.tsx:171`
- Modify: `src/components/prd/table-of-contents.tsx:69`
- Modify: `src/components/prd/version-history.tsx:218`
- Modify: `src/components/task/task-detail.tsx:316,333,340,352`
- Modify: `src/components/task/whiteboard-canvas.tsx:372,580,610`

**Interfaces:**
- Consumes: existing array item shapes (section strings, feature objects, subtask objects, edge geometry)
- Produces: stable key props per React reconciliation contract

- [ ] **Step 1: Fix `chat-panel.tsx:951` — section name as key**

`ALL_PRD_SECTIONS` is a readonly string array. Each section name is unique by definition.

```diff
- <div key={i} className="flex items-center gap-2.5">
+ <div key={section} className="flex items-center gap-2.5">
```

- [ ] **Step 2: Fix `kanban-board.tsx:106,227` — static skeleton keys**

`Array.from({ length: 4 })` generates skeleton placeholders. No stable field exists. Use a static string array since there are exactly 4 columns.

```diff
  // line 106
- {Array.from({ length: 4 }).map((_, idx) => (
-   <div key={idx} ...
+ {["pending", "in_progress", "completed", "failed"].map((status) => (
+   <div key={status} ...

  // line 227 — same pattern, same fix
- {Array.from({ length: 4 }).map((_, idx) => (
-   <div key={idx} ...
+ {["pending", "in_progress", "completed", "failed"].map((status) => (
+   <div key={status} ...
```

- [ ] **Step 3: Fix `kanban-card.tsx:171` — subtask name as key**

Read the subtask shape first. If `sub.name` can duplicate within one card, use composite key.

```diff
- {card.subtasks.map((sub, idx) => (
-   <li key={idx} ...
+ {card.subtasks.map((sub) => (
+   <li key={sub.name} ...
```

> Caveat: if duplicate subtask names are possible, use `key={`${sub.name}-${idx}`}` instead. Verify by checking task-service.ts subtask generation logic — task names are user-entered and can duplicate.

- [ ] **Step 4: Fix `table-of-contents.tsx:69` — TocItem.id as key**

`TocItem` has an `id` field (slug from heading text). Unique by construction.

```diff
- {tocItems.map((item, i) => (
-   <a key={i} href={`#${item.id}`} ...
+ {tocItems.map((item) => (
+   <a key={item.id} href={`#${item.id}`} ...
```

- [ ] **Step 5: Fix `version-history.tsx:218` — diff part composite key**

Diff parts have `type` (added/removed/unchanged) and `text`. No unique id. Composite key with index fallback since duplicate (type, text) pairs are possible.

```diff
- {diff.map((part, i) => (
-   <div key={i} ...
+ {diff.map((part, i) => (
+   <div key={`${part.type}-${part.text.substring(0, 20)}-${i}`} ...
```

> Note: this still includes `i` as last resort — unavoidable because diff parts have no unique id. The composite prefix narrows collision window. Document with comment: `// ponytail: diff parts have no unique id; index as tiebreaker`

- [ ] **Step 6: Fix `task-detail.tsx:316,333,340,352` — feature/task/subtask names**

Task tree is flat-reconstructed by `task-service.ts`. Feature names are deduped via `featureMap`. Task names and subtask names can duplicate across features.

```diff
  // line 316: feature groups
- {visibleTaskTree.features.map((feature, fi) => (
-   <details key={fi} ...
+ {visibleTaskTree.features.map((feature) => (
+   <details key={feature.name} ...

  // line 333: tasks within feature
- {feature.tasks.map((task, ti) => (
-   <li key={ti} ...
+ {feature.tasks.map((task) => (
+   <li key={`${feature.name}-${task.name}`} ...

  // line 340: subtasks within task
- {task.subtasks.map((sub, si) => (
-   <li key={si} ...
+ {task.subtasks.map((sub) => (
+   <li key={`${task.name}-${sub.name}`} ...

  // line 352: detail strings within subtask
- {sub.details.map((detail, di) => (
-   <li key={di} ...
+ {sub.details.map((detail) => (
+   <li key={`${sub.name}-${detail.substring(0, 30)}`} ...
```

- [ ] **Step 7: Fix `whiteboard-canvas.tsx:372,580,610` — edge geometry + subtask names**

```diff
  // line 372: SVG edge paths — no id on LayoutEdge, use geometry
- {edges.map((e, i) => (
-   <path key={`edge-${i}`} ...
+ {edges.map((e) => (
+   <path key={`edge-${e.x1}-${e.y1}-${e.x2}-${e.y2}`} ...

  // line 580, 610: subtask lists
- {allSubtasks.map((s, i) => (
-   <li key={i} ...
+ {allSubtasks.map((s) => (
+   <li key={s.name} ...

- {visibleSubtasks.map((s, i) => (
-   <li key={i} ...
+ {visibleSubtasks.map((s) => (
+   <li key={s.name} ...
```

- [ ] **Step 8: Verify**

Run: `pnpm biome check src/components/chat/chat-panel.tsx src/components/kanban/kanban-board.tsx src/components/kanban/kanban-card.tsx src/components/prd/table-of-contents.tsx src/components/prd/version-history.tsx src/components/task/task-detail.tsx src/components/task/whiteboard-canvas.tsx --max-diagnostics=100 2>&1 | grep noArrayIndexKey`

Expected: 0 matches.

- [ ] **Step 9: Commit**

```bash
git add src/components/chat/chat-panel.tsx src/components/kanban/kanban-board.tsx src/components/kanban/kanban-card.tsx src/components/prd/table-of-contents.tsx src/components/prd/version-history.tsx src/components/task/task-detail.tsx src/components/task/whiteboard-canvas.tsx
git commit -m "fix(biome): noArrayIndexKey — use stable React keys in 15 sites"
```

---

### Task 2: Fix `useExhaustiveDependencies` — correct hook dependency arrays (26 real + 6 suppress)

**Files:**
- Modify: `src/components/chat/chat-panel.tsx` (lines 190, 277, 305, 791, 896)
- Modify: `src/components/ac/ac-detail.tsx` (lines 76, 200, 217, 242)
- Modify: `src/components/ac/ac-viewer.tsx` (line 36)
- Modify: `src/components/prd/prd-viewer.tsx` (line 50)
- Modify: `src/components/task/implementation-options.tsx` (lines 186, 202, 267)
- Modify: `src/components/task/task-detail.tsx` (lines 49, 70, 80, 210)
- Modify: `src/components/task/whiteboard-canvas.tsx` (line 298)
- Modify: `src/app/ask/ask-flow.tsx` (line 142)

**Interfaces:**
- Consumes: existing useEffect/useCallback/useMemo signatures
- Produces: corrected dependency arrays; some biome-ignore suppressions with documented intent

**Sub-tasks:**

#### Task 2A: `chat-panel.tsx` — 5 sites

- [ ] **Step 1: Delete stale biome-ignore at line 190**

```diff
- // biome-ignore lint/correctness/useExhaustiveDependencies: intentional draft snapshot
```

This suppression is unused — the deps `[input, draftKey]` are already complete. Delete the comment line.

- [ ] **Step 2: Fix line 277 — auto-scroll effect**

Body reads only `scrollRef.current`. Extra deps `messages, streamingContent` are present for re-run semantics (re-scroll on new content). This is intentional — suppress rather than remove.

```diff
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
- }, [messages, streamingContent]);
+ }, [messages, streamingContent]); // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll trigger on new content
```

- [ ] **Step 3: Fix line 305 — `streamApiCall` useCallback**

Missing: `setCreditsExhausted`, `thinkingText`, `streamingContent`. Extra: `currentSection` (0 uses in body).

Read the callback body first to confirm which deps are actually used. Then:

```diff
  }, [
    addMessage,
-   currentPrdContent,
    currentSection,
    onProjectCreated,
    onPrdRevised,
    projectId,
    setCompletedSections,
+   setCreditsExhausted,
    setGeneratingPRD,
    setStreaming,
    setStreamingPRDContent,
+   streamingContent,
    showToast,
+   thinkingText,
    router,
  ]);
```

> Note: `currentPrdContent` is used via mutation (read inside async body), not render dep — Biome may still flag it. Verify by reading the callback body. If Biome says "extra", drop it. If it says "missing", add it. Run biome check on the file after edit to confirm.

- [ ] **Step 4: Fix line 791 — `handleSendWithMessage` useCallback**

Missing: `setStreamingPRDContent`. Extra: `currentPrdContent` (mutation, not render dep).

```diff
  }, [
    addMessage,
    conversationId,
-   currentPrdContent,
    projectId,
    selectedVersionNum,
    setCompletedSections,
    setGeneratingPRD,
    setStreaming,
+   setStreamingPRDContent,
    streamApiCall,
  ]);
```

- [ ] **Step 5: Fix line 896 — auto-submit effect**

Missing: `handleSendWithMessage`, `router`, `projectId`, `setGeneratingPRD`.

```diff
- }, [searchParams]);
+ }, [searchParams, handleSendWithMessage, router, projectId, setGeneratingPRD]);
```

- [ ] **Step 6: Verify chat-panel.tsx**

Run: `pnpm biome check src/components/chat/chat-panel.tsx --max-diagnostics=50 2>&1 | grep useExhaustiveDependencies`

Expected: 0 real hits (only biome-ignore suppressions remain).

#### Task 2B: `ac-detail.tsx` — 4 sites

- [ ] **Step 7: Fix line 76 — `handleGenerate` useCallback**

Missing: `setCreditsExhausted`, `thinkingText`.

```diff
  }, [
    projectId,
    latestPrdContent,
    showToast,
    router,
    setGeneratingAC,
+   setCreditsExhausted,
+   thinkingText,
  ]);
```

- [ ] **Step 8: Fix line 200 — auto-generate effect**

Missing: `isGenerating`.

```diff
  }, [latestPrdContent, latestAcVersion, handleGenerate, projectId,
+   isGenerating
  ]);
```

- [ ] **Step 9: Fix line 217 — resume-intent effect**

Missing: `handleGenerate`, `projectId`.

```diff
- }, [searchParams]);
+ }, [searchParams, handleGenerate, projectId]);
```

- [ ] **Step 10: Fix line 242 — cleanup effect**

Extra dep `projectId` (cleanup reads refs only). Drop it — but this loses project-switch reset intent. Suppress instead.

```diff
+ // biome-ignore lint/correctness/useExhaustiveDependencies: projectId triggers cleanup on project switch
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      hasAutoGenerated.current = false;
      setGeneratingAC(false);
    };
  }, [projectId, setGeneratingAC]);
```

> biome-ignore goes on the line ABOVE the `useEffect` call.

#### Task 2C: `ac-viewer.tsx` — 1 site

- [ ] **Step 11: Fix line 36 — scroll effect**

Extra dep `streamingContent` (body reads only `scrollRef, isStreaming`). Re-scroll-on-token is intentional — suppress.

```diff
- }, [streamingContent, isStreaming]);
+ }, [streamingContent, isStreaming]); // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll on token
```

#### Task 2D: `prd-viewer.tsx` — 1 site

- [ ] **Step 12: Fix line 50 — scroll effect**

Extra dep `content` (body reads only `scrollRef`). Re-scroll-on-content is intentional — suppress.

```diff
- }, [content]);
+ }, [content]); // biome-ignore lint/correctness/useExhaustiveDependencies: intentional re-scroll on content change
```

#### Task 2E: `implementation-options.tsx` — 3 sites

- [ ] **Step 13: Fix lines 186, 202, 267 — missing `setAndPersistChoice`**

All three callbacks use `setAndPersistChoice` but don't list it in deps.

```diff
  // line 186: handleCopyPrd
- }, [fetchContent, showToast]);
+ }, [fetchContent, showToast, setAndPersistChoice]);

  // line 202: handleDownloadZip
- }, [projectId, showToast]);
+ }, [projectId, showToast, setAndPersistChoice]);

  // line 267: handleCopyPrompt
- }, [promptText, showToast]);
+ }, [promptText, showToast, setAndPersistChoice]);
```

#### Task 2F: `task-detail.tsx` — 4 sites

- [ ] **Step 14: Fix line 49 — task status sync effect**

Extra dep `projectId` (body reads `taskStatus, setTaskGenerated` only). Sync-on-switch is intentional — suppress.

```diff
+ // biome-ignore lint/correctness/useExhaustiveDependencies: projectId triggers re-sync on project switch
  useEffect(() => {
    setTaskGenerated(taskStatus === "completed");
  }, [projectId, taskStatus, setTaskGenerated]);
```

- [ ] **Step 15: Fix line 70 — cleanup effect**

Extra dep `projectId` (cleanup reads refs only). Re-register-on-switch is intentional — suppress.

```diff
+ // biome-ignore lint/correctness/useExhaustiveDependencies: projectId triggers cleanup on project switch
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      hasAutoGenerated.current = false;
    };
  }, [projectId]);
```

- [ ] **Step 16: Fix line 80 — `handleGenerate` useCallback**

Missing: `setCreditsExhausted`, `setTaskGenerated`, `thinkingText`.

```diff
  }, [
    hasAc,
    projectId,
    showToast,
+   setCreditsExhausted,
+   setTaskGenerated,
+   thinkingText,
  ]);
```

- [ ] **Step 17: Fix line 210 — resume-intent effect**

Missing: `projectId`.

```diff
- }, [searchParams]);
+ }, [searchParams, projectId]);
```

#### Task 2G: `whiteboard-canvas.tsx` — 1 site

- [ ] **Step 18: Fix line 298 — tree-change reset effect**

Extra dep `taskTree` (body reads only ref). Reset-on-tree-change is intentional — suppress.

```diff
+ // biome-ignore lint/correctness/useExhaustiveDependencies: taskTree triggers hasFittedRef reset
  useEffect(() => {
    hasFittedRef.current = false;
  }, [taskTree]);
```

#### Task 2H: `ask-flow.tsx` — 1 stale suppression

- [ ] **Step 19: Delete stale biome-ignore at line 142**

```diff
- // biome-ignore lint/correctness/useExhaustiveDependencies: intentional full-state snapshot
```

Suppression has no effect — deps are already complete. Delete the comment line.

- [ ] **Step 20: Verify all Task 2 files**

Run: `pnpm biome check src/components/chat/chat-panel.tsx src/components/ac/ac-detail.tsx src/components/ac/ac-viewer.tsx src/components/prd/prd-viewer.tsx src/components/task/implementation-options.tsx src/components/task/task-detail.tsx src/components/task/whiteboard-canvas.tsx src/app/ask/ask-flow.tsx --max-diagnostics=200 2>&1 | grep useExhaustiveDependencies`

Expected: 0 real hits (only intentional biome-ignore suppressions remain).

- [ ] **Step 21: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 22: Commit**

```bash
git add src/components/chat/chat-panel.tsx src/components/ac/ac-detail.tsx src/components/ac/ac-viewer.tsx src/components/prd/prd-viewer.tsx src/components/task/implementation-options.tsx src/components/task/task-detail.tsx src/components/task/whiteboard-canvas.tsx src/app/ask/ask-flow.tsx
git commit -m "fix(biome): useExhaustiveDependencies — correct dep arrays in 26 sites, suppress 6 intentional"
```

---

### Task 3: Fix `noNonNullAssertion` — add null guards (12 sites)

**Files:**
- Modify: `src/app/actions/payment.ts:42`
- Modify: `src/components/kanban/kanban-board.tsx:196-197`
- Modify: `src/db/index.ts:6`
- Modify: `src/lib/auth.ts:46-47`
- Modify: `src/lib/services/task-service.ts:131`
- Modify: `src/routes/api/payments/webhook.ts:16`

**Interfaces:**
- Consumes: `process.env.*` values, `Map.get()` returns, `columns` nullable object
- Produces: guarded values with early-throw or early-return on null

- [ ] **Step 1: Fix `payment.ts:42` — env var guard**

```diff
- const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
+ const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX;
+ if (!serverKey) throw new Error("Missing MIDTRANS_SERVER_KEY_SANDBOX env var");
```

- [ ] **Step 2: Fix `kanban-board.tsx:196-197` — columns guard**

5 non-null assertions on `columns!.`. Guard once before the IIFE.

Read line 190–200 to find the exact IIFE context. Then add guard:

```diff
+ if (!columns) return null;
  const total = columns.pending.length + columns.in_progress.length + columns.completed.length + columns.failed.length;
  const done = columns.completed.length + columns.failed.length;
```

(Remove all `!` from `columns!.` in these two lines.)

- [ ] **Step 3: Fix `db/index.ts:6` — DATABASE_URL guard**

```diff
- const connectionString = process.env.DATABASE_URL!;
+ const connectionString = process.env.DATABASE_URL;
+ if (!connectionString) throw new Error("DATABASE_URL environment variable is not set");
```

- [ ] **Step 4: Fix `auth.ts:46-47` — OAuth env vars**

Read lines 40–55 to see the Google + GitHub provider pattern. GitHub already uses `|| ""` fallback at line 52. Match that pattern:

```diff
- clientId: process.env.GOOGLE_CLIENT_ID!,
- clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
+ clientId: process.env.GOOGLE_CLIENT_ID || "",
+ clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
```

> Note: empty string will fail OAuth at runtime (Better Auth validates non-empty). This matches the existing GitHub pattern. If user wants stricter, change to throw — but match existing codebase pattern.

- [ ] **Step 5: Fix `task-service.ts:131` — Map.get guard**

`featureMap.get(fname)!` assumes the feature was already inserted. Use `??` with lazy-init pattern:

```diff
- featureMap.get(fname)!.tasks.push({ name: row.title, ... });
+ const feature = featureMap.get(fname) ?? (() => {
+   const f = { name: fname, tasks: [] as TaskServiceOutput["features"][number]["tasks"] };
+   featureMap.set(fname, f);
+   return f;
+ })();
+ feature.tasks.push({ name: row.title, ... });
```

> Simplify: read the actual line 131 context first. If `featureMap.set(fname, ...)` happens before `.get(fname)!` in the same loop iteration, the `!` is safe. If not, the lazy-init pattern above is correct.

- [ ] **Step 6: Fix `webhook.ts:16` — env var guard**

```diff
- const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX!;
+ const serverKey = process.env.MIDTRANS_SERVER_KEY_SANDBOX;
+ if (!serverKey) return Response.json({ error: "Server misconfiguration" }, { status: 500 });
```

- [ ] **Step 7: Verify**

Run: `pnpm biome check src/app/actions/payment.ts src/components/kanban/kanban-board.tsx src/db/index.ts src/lib/auth.ts src/lib/services/task-service.ts src/routes/api/payments/webhook.ts --max-diagnostics=50 2>&1 | grep noNonNullAssertion`

Expected: 0 matches.

- [ ] **Step 8: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/actions/payment.ts src/components/kanban/kanban-board.tsx src/db/index.ts src/lib/auth.ts src/lib/services/task-service.ts src/routes/api/payments/webhook.ts
git commit -m "fix(biome): noNonNullAssertion — add null guards in 12 sites"
```

---

### Task 4: Fix `noAssignInExpressions` — replace while+assign with matchAll (3 sites)

**Files:**
- Modify: `src/components/chat/chat-panel.tsx:53,134,142`

**Interfaces:**
- Consumes: `streamContent` (string), `content` (string), `regex` (RegExp with /g flag)
- Produces: same parsed results via `matchAll` iteration

- [ ] **Step 1: Fix line 53 — section patch parser**

Read lines 45–65 to understand full while loop. Then:

```diff
- let match;
- while ((match = regex.exec(streamContent)) !== null) {
+ for (const match of streamContent.matchAll(regex)) {
    const sectionName = match[1].trim();
    const newContent = match[2].trim();
    // ... rest of loop body unchanged
- }
```

Remove the `let match;` declaration if it's no longer used elsewhere.

- [ ] **Step 2: Fix line 134 — marker regex parser**

```diff
- let m;
- while ((m = markerRe.exec(content)) !== null) {
+ for (const m of content.matchAll(markerRe)) {
```

Remove `let m;` if unused after.

- [ ] **Step 3: Fix line 142 — heading regex parser**

```diff
- while ((m = headingRe.exec(content)) !== null) {
+ for (const m of content.matchAll(headingRe)) {
```

Note: `m` was declared for the marker loop above. If both loops share the same `let m;` declaration, verify the variable is not used between the two loops. If it is, each loop needs its own `for...of` scope (which it gets automatically).

- [ ] **Step 4: Verify**

Run: `pnpm biome check src/components/chat/chat-panel.tsx --max-diagnostics=50 2>&1 | grep noAssignInExpressions`

Expected: 0 matches.

- [ ] **Step 5: TypeScript check + manual test**

Run: `npx tsc --noEmit`

Also verify regex behavior is equivalent: `String.prototype.matchAll()` returns the same `RegExpMatchArray` as `RegExp.prototype exec()` for each iteration. The loop body can use `match[1]`, `match[2]` identically.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "fix(biome): noAssignInExpressions — replace while+exec with matchAll in 3 sites"
```

---

### Task 5: Fix `noExplicitAny` — add proper types (2 sites)

**Files:**
- Modify: `src/hooks/use-kanban-polling.ts:85`
- Modify: `src/components/prd/prd-viewer.tsx:168`

- [ ] **Step 1: Fix `use-kanban-polling.ts:85` — catch clause type**

```diff
- } catch (err: any) {
+ } catch (err: unknown) {
```

Body already branches on `instanceof Error` — no further changes needed.

- [ ] **Step 2: Fix `prd-viewer.tsx:168` — code component props**

Read lines 165–175 to see the full code component definition. Then:

```diff
- code: ({ inline, className, children, ...props }: any) => {
+ code: ({ inline, className, children, ...props }: React.ComponentProps<"code"> & { inline?: boolean }) => {
```

- [ ] **Step 3: Verify**

Run: `pnpm biome check src/hooks/use-kanban-polling.ts src/components/prd/prd-viewer.tsx --max-diagnostics=50 2>&1 | grep noExplicitAny`

Expected: 0 matches.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/use-kanban-polling.ts src/components/prd/prd-viewer.tsx
git commit -m "fix(biome): noExplicitAny — add proper types in 2 sites"
```

---

### Task 6: Fix one-off lint rules (12 sites)

**Files:**
- Modify: `packages/cli/src/commands/login.ts:6`
- Modify: `packages/cli/src/lib/config.ts:5,6,7`
- Modify: `src/lib/kanban-utils.test.ts:61,62,68`
- Modify: `src/app/globals.css:174,175,215`

- [ ] **Step 1: Fix `useNodejsImportProtocol` in `packages/cli/` (4 sites)**

```diff
  // login.ts:6
- import { createInterface } from "readline";
+ import { createInterface } from "node:readline";

  // config.ts:5
- import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
+ import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

  // config.ts:6
- import { join } from "path";
+ import { join } from "node:path";

  // config.ts:7
- import { homedir } from "os";
+ import { homedir } from "node:os";
```

- [ ] **Step 2: Fix `useLiteralKeys` in `kanban-utils.test.ts` (3 sites)**

```diff
- expect(groups["Auth"]).toHaveLength(2);
+ expect(groups.Auth).toHaveLength(2);

- expect(groups["Dashboard"]).toHaveLength(1);
+ expect(groups.Dashboard).toHaveLength(1);

- expect(groups["Umum"]).toHaveLength(1);
+ expect(groups.Umum).toHaveLength(1);
```

- [ ] **Step 3: Fix `noImportantStyles` in `globals.css` (3 sites)**

Read lines 170–220 to understand the CSS context. `!important` overrides specificity battles with Tailwind utilities. Removing them may change visual behavior — verify by checking if the affected selectors have sufficient specificity.

```diff
  // line 174
- background-color: var(--btn-bg) !important;
+ background-color: var(--btn-bg);

  // line 175
- color: var(--btn-text) !important;
+ color: var(--btn-text);

  // line 215
- margin-top: 0 !important;
+ margin-top: 0;
```

> Caveat: if removing `!important` causes Tailwind utility classes to override these styles, the fix is to increase specificity instead (e.g., `.btn-variant.btn-variant { ... }`) or use `@layer` to control cascade order. Visual regression test needed.

- [ ] **Step 4: Verify**

Run: `pnpm biome check packages/cli/src/commands/login.ts packages/cli/src/lib/config.ts src/lib/kanban-utils.test.ts src/app/globals.css --max-diagnostics=50 2>&1 | grep -E "useNodejsImportProtocol|useLiteralKeys|noImportantStyles"`

Expected: 0 matches.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/login.ts packages/cli/src/lib/config.ts src/lib/kanban-utils.test.ts src/app/globals.css
git commit -m "fix(biome): one-off rules — node: protocol, literal keys, !important"
```

---

### Task 7: Auto-fix unused imports/variables/parameters (31 sites)

**Files:**
- Auto-modified by Biome across ~20 files

- [ ] **Step 1: Run Biome auto-fix for unused rules only**

```bash
npx @biomejs/biome check --write --only=linter/correctness/noUnusedImports,linter/correctness/noUnusedVariables,linter/correctness/noUnusedFunctionParameters src/
```

- [ ] **Step 2: Review changes**

```bash
git diff --stat
```

Expected: ~20 files changed, each with import/variable removals only.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 4: Build check**

Run: `pnpm build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(biome): remove unused imports, variables, and function parameters"
```

---

### Task 8: Auto-fix organize imports (89 sites)

- [ ] **Step 1: Run Biome auto-fix for import sorting**

```bash
npx @biomejs/biome check --write --only=source/organizeImports src/ packages/
```

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "fix(biome): organize imports — sort import statements across codebase"
```

---

### Task 9: Auto-fix all remaining format violations (~390 sites)

- [ ] **Step 1: Run Biome format on entire codebase**

```bash
npx @biomejs/biome format --write src/ packages/
```

- [ ] **Step 2: Run full Biome check to confirm zero diagnostics**

```bash
pnpm biome check --max-diagnostics=2000 2>&1 | tail -10
```

Expected output:
```
Checked 208 files in Xms. No fixes applied.
Found 0 errors.
Found 0 warnings.
Found 0 infos.
```

> Note: `globals.css` parse errors from `@utility` Tailwind v4 at-rules are NOT real violations — they're Biome CSS parser limitations. These appear as "parse" diagnostics, not lint/format. If they persist, add to biomeignore or configure Biome to skip CSS parsing.

- [ ] **Step 3: Build check**

Run: `pnpm build`
Expected: success.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(biome): format entire codebase — quotes, semicolons, indent, trailing commas"
```

---

## Verification Checklist (after all tasks)

- [ ] `pnpm biome check --max-diagnostics=2000` → 0 errors, 0 warnings, 0 infos (except CSS parse if Biome limitation)
- [ ] `npx tsc --noEmit` → 0 errors
- [ ] `pnpm build` → success
- [ ] `git log --oneline` → 9 clean commits, one per task
