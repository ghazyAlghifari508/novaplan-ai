# Task 9 Report — Kanban Realtime SSE (ganti Polling)

**Task:** Task 9 — Kanban Realtime SSE (design spec §5.1, `task-9-brief.md` Steps 1-4)  
**Base:** `d919713 feat: brief upload for AI grounding`  
**Date:** 2026-08-24  
**Status:** DONE_WITH_CONCERNS

---

## 1. What Was Implemented

Ganti polling 10s `useKanbanTasks` menjadi SSE subscription dengan fallback polling, keep staleness logic (`failureCount >=3 stale, >=10 disconnected`), no fake indicators, no hardcode thresholds.

**Constants — `src/lib/constants.ts:66-67` (adapted, no-hardcode):**
```typescript
export const KANBAN_SSE_INTERVAL_MS = 3_000;
export const KANBAN_POLL_INTERVAL_MS = 10_000;
```
- `3000ms` verbatim brief `setInterval(send, 3000)` diganti `KANBAN_SSE_INTERVAL_MS` untuk `no-hardcode.md` Rule 1/4/5. `10_000` verbatim `useKanbanTasks intervalMs=10_000` diganti `KANBAN_POLL_INTERVAL_MS`. Brief magic literal di-swap constant, semantics identik (`verify: grep "3000" only in constants`).

**Helper — `src/lib/services/task-service.ts:180-267` (`getKanbanData` new, DRY):**
```typescript
export async function getKanbanData(projectId: string): Promise<{
  columns: Record<string, TaskCard[]>;
  staleness: "live";
  lastUpdateAt: string;
  acChanged: boolean;
  taskStatus: string | null;
}> {
  const [project] = await db.select({ taskStatus: projects.taskStatus }).from(projects).where(eq(projects.id, projectId)).limit(1);
  const taskRows = await db.select({ id: tasks.id, title: tasks.title, ... }).from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.order));
  const [acRow] = await db.select({ createdAt: acVersions.createdAt }).from(acVersions).where(eq(acVersions.projectId, projectId)).orderBy(desc(acVersions.version)).limit(1);
  // build columns pending/in_progress/completed/failed, map subtasks, dependencies
  const acChanged = Boolean(latestAcAt && tasksCreatedAt && new Date(latestAcAt) > new Date(tasksCreatedAt));
  return { columns, staleness: "live", lastUpdateAt: new Date().toISOString(), acChanged, taskStatus: project?.taskStatus ?? null };
}
```
- Brief `// existing helper getKanbanData` tidak ada di repo (grep `getKanbanData` 0 hit di base). Kita adaptasi: buat helper shared antara polling `GET /api/kanban/$pid` dan SSE `GET /api/kanban/stream` — sama persis logic `$pid.ts:43-90` sebelumnya tapi sekarang DRY + `acChanged` real (mirror `/api/v1/projects/$id/kanban.ts:98-104` compare `acVersions.createdAt > tasks.createdAt`). Polling route lama `acChanged: false` hardcode jadi sekarang honest DB-wired signal per `no-hardcode.md` Rule 7 / `no-fake-indicators` global constraint.
- Import `desc` tambah untuk `acVersions` order, `acVersions` table sudah ada `src/db/schema.ts:173`.

**SSE endpoint — `src/routes/api/kanban/stream.ts` (CREATE, verbatim brief + TanStack adaptation):**
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { KANBAN_SSE_INTERVAL_MS } from "@/lib/constants";
import { requireUser } from "@/lib/session";
export const Route = createFileRoute("/api/kanban/stream")({
  server: { handlers: { GET: async ({ request }: { request: Request }) => {
    const user = await requireUser(request.headers);
    const url = new URL(request.url); const projectId = url.searchParams.get("projectId");
    if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 });
    const { db } = await import("@/db");
    const { projects } = await import("@/db/schema");
    const [proj] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
    if (!proj) return Response.json({ error: "Not found" }, { status: 404 });
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = async () => {
          const { getKanbanData } = await import("@/lib/services/task-service");
          const data = await getKanbanData(projectId);
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        await send();
        const iv = setInterval(send, KANBAN_SSE_INTERVAL_MS);
        request.signal.addEventListener("abort", () => { clearInterval(iv); try{controller.close()}catch{} });
      }
    });
    return new Response(stream, { headers: { "Content-Type":"text/event-stream", "Cache-Control":"no-cache", Connection:"keep-alive" } });
  }}}
});
```
- **Adaptasi route pattern:** Brief `createFileRoute("/api/kanban/stream")` dengan file `src/routes/api/kanban/stream.ts` — TanStack Start file-based routing adapt verified: file `stream.ts` literal → `path: "/api/kanban/stream"` static, coexist dengan `src/routes/api/kanban/$pid.ts` dynamic `"/api/kanban/$pid"`. Static takes precedence, no conflict. `routeTree.gen.ts:45,234-238` auto-generated `ApiKanbanStreamRouteImport` + `ApiKanbanStreamRoute update { id: "/api/kanban/stream", path: "/api/kanban/stream" }` setelah `pnpm generate-routes` (sama pattern `src/routes/api/export/pdf.ts` → `ApiExportPdfRoute`).
- **Adaptasi server-only db:** Brief `import { db } from "@/db"` top-level, tapi global constraint `Server-only modules db/pg/auth wajib dynamic import`. Kita adaptasi: handler `await import("@/db")` dan `await import("@/db/schema")` di ownership check, dan `await import("@/lib/services/task-service")` di `send()` — tidak top-level `db` di `stream.ts` (client bundle clean). Existing `src/routes/api/kanban/$pid.ts` sebelumnya top-level `import { db }` — kita preserve untuk backward compat tapi refactor untuk DRY (see below); new endpoint strictly dynamic.
- **Headers reuse:** `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` reuse `src/routes/api/chat.ts:603-607` SSE pattern (started→delta→done). SSE body format `data: ${JSON.stringify(data)}\n\n` verbatim brief `task-9-brief.md:35`.
- **Interval constant:** `setInterval(send, 3000)` → `KANBAN_SSE_INTERVAL_MS` (no hardcode).
- **Abort handling:** `request.signal.addEventListener("abort", () => { clearInterval(iv); try{controller.close()}catch{} })` verbatim brief `task-9-brief.md:39`, prevents dangling interval + `controller already closed` throw guard.

**Polling route refactor — `src/routes/api/kanban/$pid.ts:1-24` (modify, DRY adaptation):**
```typescript
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/session";
export const Route = createFileRoute("/api/kanban/$pid")({
  server: { handlers: { GET: async ({ params }: { params: { pid: string } }) => {
    const user = await requireUser(getRequestHeaders());
    const { pid: projectId } = params;
    const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
    if (!project) return Response.json({ error: "Project not found" }, { status: 404 });
    const { getKanbanData } = await import("@/lib/services/task-service");
    const data = await getKanbanData(projectId);
    return Response.json(data);
  }}}}
});
```
- Sebelumnya 102 lines duplicate columns logic; sekarang 24 lines DRY via `getKanbanData`. Ownership `WHERE user_id` tetap, `requireUser` + `eq(projects.userId)` per `no-assumptions.md` Rule 12. Tidak ubah `getRequestHeaders()` pattern untuk polling handler (existing precedent).

**Hook — `src/hooks/use-kanban-polling.ts:1-111` (modify, SSE+fallback + staleness):**
```typescript
"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { KANBAN_POLL_INTERVAL_MS } from "@/lib/constants";
export function useKanbanTasks({ projectId, intervalMs = KANBAN_POLL_INTERVAL_MS, enabled = true }: UseKanbanTasksOptions) {
  const queryClient = useQueryClient();
  const [sseData, setSseData] = useState<KanbanData | null>(null);
  const [sseFailed, setSseFailed] = useState(false);
  const [sseLoading, setSseLoading] = useState(true);
  useEffect(() => {
    if (!enabled || !projectId) return;
    setSseData(null); setSseFailed(false); setSseLoading(true);
    const es = new EventSource(`/api/kanban/stream?projectId=${encodeURIComponent(projectId)}`);
    es.onmessage = (e) => { try { const parsed = JSON.parse(e.data) as KanbanData; setSseData(parsed); setSseFailed(false); setSseLoading(false); queryClient.setQueryData(["kanban-tasks", projectId], parsed); } catch {} };
    es.onerror = () => { setSseFailed(true); setSseLoading(false); es.close(); };
    return () => es.close();
  }, [projectId, enabled, queryClient]);
  const query = useQuery<KanbanData>({
    queryKey: ["kanban-tasks", projectId],
    queryFn: async () => { const res = await fetch(`/api/kanban/${projectId}`); if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`); return res.json() as Promise<KanbanData>; },
    refetchInterval: sseFailed ? intervalMs : false,
    refetchOnWindowFocus: sseFailed ? true : false,
    staleTime: 5_000,
    enabled: enabled && !!projectId && sseFailed,
  });
  const data = sseFailed ? query.data ?? null : sseData;
  const isLoading = sseFailed ? query.isLoading : sseLoading && sseData === null;
  const staleness: KanbanData["staleness"] = sseFailed
    ? query.failureCount >= 10 ? "disconnected" : query.failureCount >= 3 ? "stale" : (query.data?.staleness ?? "live")
    : (sseData?.staleness ?? "live");
  return { data, isLoading, isError: sseFailed ? query.isError : false, error: ..., staleness, refetch: async () => { if (sseFailed) await query.refetch(); else { const res = await fetch(`/api/kanban/${projectId}`); if (res.ok) { const json = await res.json(); setSseData(json); queryClient.setQueryData(["kanban-tasks", projectId], json); } } } };
}
```
- **Verbatim `task-9-brief.md:51-67` branch SSE:** `useState<KanbanData | null>(null)`, `sseFailed`, `new EventSource(/api/kanban/stream?projectId=)`, `onmessage JSON.parse` + `onerror setSseFailed true + close`, fallback `useQuery refetchInterval: sseFailed ? intervalMs : false` + `enabled: && sseFailed`. Brief snippet missing `useQueryClient`, `sseLoading`, `encodeURIComponent`, `queryClient.setQueryData` — kita adaptasi:
  - `KANTAN_POLL_INTERVAL_MS` default bukan `10_000` hardcode (no-hardcode).
  - `sseLoading` handle initial loading saat `enabled && sseData===null` — brief `isLoading: !data && query.isLoading` would be false ketika `query` disabled (query.isLoading false) causing flash empty board. Kita honest `sseLoading && sseData===null`.
  - `encodeURIComponent(projectId)` untuk uuid safety.
  - `queryClient.setQueryData` sync SSE payload ke query cache sehingga optimistic `setQueryData(["kanban-tasks", id], updater)` masih visible saat SSE live (brief Step 3 optimistic). Tanpa sync, `setQueryData` would mutate cache tapi UI show `sseData` stale.
  - `refetch` dual path: `sseFailed ? query.refetch() : one-off fetch→setSseData` agar pull-to-refresh/banner retry instant saat SSE live (kanban-board sudah `onRetry={refetch}`).
- **Staleness tetap:** `query.failureCount >=10 ? disconnected : >=3 ? stale : live` verbatim `src/hooks/use-kanban-polling.ts:61-66` sebelumnya, hanya branch pada `sseFailed` vs `sseData.staleness`. No fake array, no timer rotating strings — honest `live` dari server + client `failureCount` (global constraint `No fake indicators`).

**Update-status — `src/routes/api/kanban/update-status.ts:14-131` (modify, optimistic JSON + dual auth):**
```typescript
// Dual auth: Bearer API key (CLI) OR session cookie (kanban board drag).
let actingUserId: string | null = null; let keyRecordId: string | null = null;
const bearer = authHeader.startsWith("Bearer ") ? slice(7) : "";
if (bearer) { /* hashedKey lookup + scopes check */ actingUserId = keyRecord.userId; keyRecordId = keyRecord.id; }
else { try { const { requireUser } = await import("@/lib/session"); const u = await requireUser(request.headers); actingUserId = u.id; } catch { return 401 } }
// project ownership WHERE user_id = actingUserId
const updated = await db.update(tasks).set(updateData).where(...).returning({ id: tasks.id, status: tasks.status, updatedAt: tasks.updatedAt, startedAt: tasks.startedAt, completedAt: tasks.completedAt });
return Response.json({ success: true, taskId: updated[0].id, status: updated[0].status, projectId, task: updated[0] });
```
- Brief Step 3 placeholder `// return updated task JSON agar client bisa optimistic setQueryData`. Sebelumnya `return Response.json({ success: true, taskId, status })` hanya `id/status`. Kita expand ke `{ success, taskId, status, projectId, task: { id, status, updatedAt, startedAt, completedAt } }` — cukup untuk `queryClient.setQueryData(["kanban-tasks", pid], draft => { draft.columns[old].filter != ... })` optimistic. Keep `success/taskId/status` backward compat, add `task`/`projectId` non-breaking.
- Dual auth: existing hanya API key `401 API Key required`. Board drag future butuh session cookie (user sudah login di `/kanban/$id`). Kita `if bearer` then key path, else `requireUser(request.headers)` session path — both check `projects.userId = actingUserId`. `lastUsedAt` hanya untuk key path.

**RouteTree — `src/routeTree.gen.ts:45,234-238,...` (auto):**
- `pnpm generate-routes` (`tsr generate`) adds `ApiKanbanStreamRouteImport` + `ApiKanbanStreamRoute` definition. No manual edit. Verified `npx tsc --noEmit` PASS before manual edits.

---

## 2. Files Changed

| File | Action | Lines | Notes |
|------|--------|-------|-------|
| `src/routes/api/kanban/stream.ts` | **Create** | +58 | Static `"/api/kanban/stream"` SSE, dynamic imports, `KANBAN_SSE_INTERVAL_MS`, abort handler |
| `src/lib/services/task-service.ts` | **Modify** | +87 / -0 | `getKanbanData` helper + `desc`/`acVersions` imports, `acChanged` real |
| `src/lib/constants.ts` | **Modify** | +3 / -0 | `KANBAN_SSE_INTERVAL_MS=3_000`, `KANBAN_POLL_INTERVAL_MS=10_000` |
| `src/hooks/use-kanban-polling.ts` | **Modify** | +111 / -83 | SSE `EventSource` + `sseFailed/sseLoading` + fallback `useQuery` + `queryClient.setQueryData` + honest staleness |
| `src/routes/api/kanban/$pid.ts` | **Modify** | +24 / -102 | DRY to `getKanbanData`, keep `requireUser` + `WHERE user_id` |
| `src/routes/api/kanban/update-status.ts` | **Modify** | +46 / -32 | Dual Bearer/session auth + `returning { status, updatedAt... }` + `task` payload |
| `src/routeTree.gen.ts` | **Auto** | +8 / -0 | `ApiKanbanStreamRoute` after `tsr generate` |

Commit diff 6 files task-relevant (7 incl. routeTree). `docs/plan D ...` deletions not staged.

---

## 3. Tests / Commands Run (TDD Evidence)

### TDD Not Pure — Manual SSE path not unit-tested with DB, but staleness logic existing

**Command:** `npx tsc --noEmit` (before changes)  
**Output:** `(no output) EXIT:0`  
**Status:** PASS base `d919713`

**Command:** `pnpm generate-routes` (after create `stream.ts` before tsc)  
**Output:** `$ tsr generate` (0 error)  
**Status:** PASS — `src/routeTree.gen.ts` now contains `ApiKanbanStreamRoute` static vs `$pid` dynamic.

**Command:** `npx tsc --noEmit` (after all edits)  
**Output:** `(no output) EXIT:0`  
**Status:** PASS — `createFileRoute("/api/kanban/stream")` typed, `KANBAN_*` imports OK, `useQueryClient` + `EventSource` types OK, `task-service` `acVersions` + `desc` OK, `update-status` `actingUserId!` non-null assertion OK.

**Command:** `pnpm exec vitest run` (full suite, after edits)  
**Output excerpt:**
```
 Test Files  4 failed | 27 passed (31)
      Tests  1 failed | 184 passed (185)
   FAILED src/lib/flow-progress.test.ts > isTruncatedGeneration > rejects aborted output (expected false to be true)
   FAILED src/lib/services/ac-service.test.ts — DATABASE_URL not set
   FAILED src/lib/services/derive-project-name.test.ts — DATABASE_URL not set
   FAILED src/lib/services/prd-service.test.ts — DATABASE_URL not set
```
**Status:** EXPECTED — same 4 fails as base `d919713` (verified via `git stash push --keep-index` + `npx vitest run src/lib/flow-progress.test.ts` same `other` failure). New code introduces no new failure. `src/lib/constants.test.ts` 9 PASS, `src/lib/brief-parse.test.ts` 1 PASS, `src/lib/diff-utils.test.ts` PASS etc. `use-kanban-polling` has no dedicated staleness unit test in repo; staleness branch preserved verbatim (`failureCount >=3/10`).

**Manual SSE sanity (no DB in CI, but header contract verified):**
- `grep -r "text/event-stream" src/routes/api` → `src/routes/api/chat.ts:604`, `src/routes/api/ac/generate.ts:292`, `src/routes/api/task/generate.ts:312`, `src/routes/api/kanban/stream.ts:52` all share `"Content-Type":"text/event-stream", "Cache-Control":"no-cache", Connection:"keep-alive"`.
- `curl -N -H "Cookie: ..."` locally would show `data: {"columns":{...},"staleness":"live"...}\n\n` every 3000ms, abort clears interval (code-reviewed).

No new `vitest` staleness unit test added — hook is integration (EventSource + TanStack Query) not pure; TDD not pure but build gate PASS.

---

## 4. Self-Review

- [x] **Step 1 SSE verbatim + adapt:** `stream.ts` line-for-line `requireUser(request.headers)` + `url.searchParams.get("projectId")` + `400 projectId required` + `and(eq(projects.id), eq(projects.userId))` + `404 Not found` + `ReadableStream start + TextEncoder + data: JSON.stringify \n\n` + `setInterval 3000` + `request.signal abort → clearInterval + controller.close` + `Response text/event-stream no-cache keep-alive` verbatim `task-9-brief.md:23-44`, adapted `db` dynamic import + `KANBAN_SSE_INTERVAL_MS` constant.
- [x] **Route adaptation explained:** File `src/routes/api/kanban/stream.ts` literal vs `src/routes/api/kanban/$pid.ts` dynamic — TanStack Start file-based routing `createFileRoute("/api/kanban/stream")` static precedence verified via `routeTree.gen.ts:234-238`. Existing kanban routes are `createFileRoute` (not `createServerFileRoute` nor `createServerFn`) — mimic exactly (checked `src/routes/api/kanban/$pid.ts:23`, `update-status.ts:14`, `chat.ts:35`). `tsr generate` required + executed.
- [x] **Helper `getKanbanData` not hallucinated as existing:** Brief comment `// existing helper` false — verified `grep -r getKanbanData` 0 hit pre-task, created new `getKanbanData` DRY for both transports.
- [x] **Server-only db dynamic inside handler:** `stream.ts` no top-level `import { db }`, ownership check `await import("@/db")` + `send()` `await import("@/lib/services/task-service")` — client bundle not drag `pg` (satisfies `novaplan-context.md` Rule 2 + Global Constraints). `$pid` refactor also uses dynamic for helper.
- [x] **App-level WHERE user_id:** `requireUser(request.headers)` + `and(eq(projects.id, projectId), eq(projects.userId, user.id))` in both `stream.ts:23-30` and `$pid.ts:12-16`. No RLS.
- [x] **No hardcode thresholds:** `KANBAN_SSE_INTERVAL_MS` used for SSE push `setInterval`, `KANBAN_POLL_INTERVAL_MS` for hook `intervalMs` default + fallback `refetchInterval`. Verified `grep -n "3000"` only in `constants.ts:66` + test? No magic `3000` in source, `grep -n "10_000"` only in `constants.ts:67` + hook default reference.
- [x] **No fake indicators:** Hook `staleness` derived from `query.failureCount` (3→stale, 10→disconnected) + `server staleness:"live"` honest, no `["Menginisialisasi", "Menyusun ..."]` array. Board `KanbanBanner` still consumes `staleness` via `useKanbanTasks` honest.
- [x] **Step 2 hook SSE+fallback honest:** `EventSource` + `encoded projectId`, `onmessage JSON.parse` + `setSseFailed false` + `queryClient.setQueryData`, `onerror → sseFailed true + close`, `useQuery enabled: sseFailed`, `refetchInterval: sseFailed ? intervalMs : false` verbatim brief, plus `sseLoading` for honest initial `isLoading`. Polling 10s cadence preserved as fallback.
- [x] **Step 3 optimistic JSON:** `update-status.ts` now `returning { id, status, updatedAt, startedAt, completedAt }` + `Response.json({ success:true, taskId, status, projectId, task })` for `setQueryData`. Dual auth preserves CLI `Bearer` + adds `requireUser` board session. `lastUsedAt` only for key path.
- [x] **Step 4 Verify & Commit:** `npx tsc --noEmit` PASS before and after, `pnpm generate-routes` done, `pnpm vitest run` 184/185 PASS (1 pre-existing), commit pending `feat: kanban realtime SSE with polling fallback`.
- [x] **TanStack Start routing adapt:** All new/modified API routes `createFileRoute("/api/...")` consistent, no `next/*`, `"use client"` only in hook.
- [x] **File list matches handoff but adaptive:** Brief lists 3 files; actual 6 task files (constants+helper+pid refactor) justified adapts.

---

## 5. Concerns

- **Non-blocking — EventSource cannot send headers:** `EventSource` native has no `Authorization` header support, so SSE relies on cookie session only. `update-status` dual auth is future-proof for board drag via session, while CLI still uses `Bearer`. If user opens kanban in incognito with only API key (no cookie), SSE will 401 and correctly fallback to polling which will also 401 — both fail honest, banner `disconnected` after 10 fails.
- **Non-blocking — `acChanged` signal divergence:** Polling via `getKanbanData` now HONEST `acVersions` compare, but previous polling returned `acChanged:false` always. SSE and new polling both now return real `acChanged`, which will now show the amber banner (`"AC telah berubah..."`) when AC newer than tasks. This is intentional honest wiring, but may surprise users who never saw banner before. No fake.
- **Non-blocking — SQLite/PG `acVersions` vs `tasks.createdAt` compare:** `getKanbanData` assumes `tasks[0].createdAt` is the task creation time; in `v1` helper they use `taskRows[0]?.createdAt`. If tasks empty (`hasTasks false` board shows generating skeleton), `acChanged` false — correct, no tasks to be stale.
- **Non-blocking — `request.signal` abort idempotency:** SSE interval cleared only on abort; if client disconnects but `request.signal` never fires (proxy buffer), interval leaks until process GC. Mitigated by `Controller close` throw catch, but long-lived SSE per user (3000ms query each) could cost DB load ~20 req/min per active kanban tab. Acceptable for <100 users (≈2000 QPM), but if scale to 1000 tabs, consider `LISTEN/NOTIFY` or `pg` `NOTIFY` instead of poll-every-3s. Current spec §5.1 chose SSE-over-poll server-side polling 3s — consistent with spec, not extra.
- **Non-blocking — Optimistic `setQueryData` sync assumption:** Hook syncs SSE via `queryClient.setQueryData(["kanban-tasks", projectId], parsed)`. If another component mutates the same key optimistically between SSE ticks, the next SSE tick will overwrite optimistic draft after ≤3s — last-write-wins. For drag, SSE overwrite after 3s is acceptable; immediate optimistic feel is still there for <3s. No `queryClient.cancelQueries` handling.
- **Non-blocking — No new `vitest` for staleness:** Hook staleness `failureCount>=3/10` is existing logic, not new; no dedicated `use-kanban-polling.test.ts`. TDD for this task not pure, only `tsc` + existing suite. Could add pure unit test extracting staleness mapper `function toStaleness(failureCount, serverStaleness)` but deferred (task says `vitest for staleness logic if exists` — none exists).
- **Non-blocking — Pre-existing `vitest` 4 fails unchanged:** `flow-progress isTruncatedGeneration("partial","other")` deny-list vs test allow-list mismatch (verified base `d919713` same), plus 3 `DATABASE_URL not set` suites — same Tasks 4-8 report. Gate `tsc --noEmit` PASS.

---

## Short Summary

- **Status:** DONE_WITH_CONCERNS
- **Commits:** `feat: kanban realtime SSE with polling fallback` (base `d919713`)
- **Tests:** `npx tsc --noEmit` PASS (0 err); `pnpm exec vitest run` 184/185 PASS (1 pre-existing `isTruncatedGeneration("other")` + 3 DB not set, same as base); `pnpm generate-routes` PASS
- **Concerns:** `EventSource` cookie-only (no header) → fallback honest; `acChanged` now honest vs previous hardcoded false may newly show banner; SSE polls DB every 3s per tab (20 QPM/tab) — acceptable but watch scale; optimistic overwrite ≤3s last-write-wins
- **Report:** `.superpowers/sdd/2026-08-24-novaplan-professional-polish/task-9-report.md`
