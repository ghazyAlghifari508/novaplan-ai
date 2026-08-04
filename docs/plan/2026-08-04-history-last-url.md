# History Last-URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** History card click navigates to the user's last-visited page inside a project, not the project's furthest step.

**Architecture:** Add a nullable `last_url` column to `projects`. A client-side hook fires a debounced `POST /api/projects/$id/last-route` whenever the user navigates to a project-internal page. The History loader reads `last_url` first; if null it falls back to `stepToRoute(step, id)` (existing behaviour).

**Tech Stack:** TanStack Start (file routes, createServerFn), Drizzle ORM + pg Pool, Vercel AI SDK v7, TypeScript.

## Global Constraints

- Migration naming: `drizzle/NNNN_adjective_noun.sql` (drizzle-kit default with `--breakpoints`).
- Nullable text column SQL pattern: `ALTER TABLE "projects" ADD COLUMN "last_url" text;` (matches `drizzle/0001_woozy_wasp.sql` style).
- Schema definition in `src/db/schema.ts` uses `text("snake_col")` with no modifiers for nullable text.
- `projects.step` is NOT touched by this feature — it remains the monotonic "furthest stage" signal.
- No backfill script. Old rows have `last_url = NULL` and fall back to `stepToRoute`.
- Client hook is debounced 500 ms to avoid spamming the DB on every keystroke / nested navigation.
- `last_url` must belong to the same project ID as the URL param (anti-spoof: user cannot write another user's project last_url).

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `drizzle/0003_last_url_projects.sql` | Create | SQL migration adding `last_url` column |
| `src/db/schema.ts` | Modify | Add `lastUrl: text("last_url")` to projects table |
| `src/lib/flow-progress.ts` | Modify | Add `isValidHistoryUrl(url, projectId)` helper |
| `src/lib/flow-progress.test.ts` | Modify | Tests for `isValidHistoryUrl` |
| `src/routes/api/projects/$id/last-route.ts` | Create | POST endpoint: persist last_url |
| `src/routes/history.tsx` | Modify | Loader selects `last_url`; card resolves via helper |
| `src/lib/use-last-route.ts` | Create | Client hook: debounced POST on project-internal navigation |
| `src/routes/prd/$id.tsx` | Modify | Call `useLastRoute` in page component |
| `src/routes/ac/$id.tsx` | Modify | Call `useLastRoute` in page component |
| `src/routes/task/$id.tsx` | Modify | Call `useLastRoute` in page component |
| `src/routes/ask/$id.tsx` | Modify | Call `useLastRoute` in page component |
| `src/routes/kanban/$id.tsx` | Modify | Call `useLastRoute` in page component |

---

### Task 1: Migration + schema

**Files:**
- Create: `drizzle/0003_last_url_projects.sql`
- Modify: `src/db/schema.ts:103-118` (projects table)

**Interfaces:**
- Consumes: nothing
- Produces: `projects.lastUrl` column (nullable text) available in schema and DB

- [ ] **Step 1: Write migration SQL**

Create `drizzle/0003_last_url_projects.sql`:

```sql
ALTER TABLE "projects" ADD COLUMN "last_url" text;
```

- [ ] **Step 2: Add column to schema**

In `src/db/schema.ts`, inside the `projects` table definition (after `shareToken: text("share_token"),`), add:

```ts
lastUrl: text("last_url"),
```

- [ ] **Step 3: Run migration**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
pnpm db:migrate
```

Expected: `Migrating done` with no errors.

- [ ] **Step 4: Verify column exists**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
node -e "
require('dotenv').config({path:'.env.local'});
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
  const r=await p.query('SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name=\$1 AND column_name=\$2', ['projects','last_url']);
  console.log(JSON.stringify(r.rows,null,2));
  await p.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
"
```

Expected: `{"column_name":"last_url","data_type":"text","is_nullable":"YES"}`

- [ ] **Step 5: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add drizzle/0003_last_url_projects.sql src/db/schema.ts
git commit -m "feat(db): add nullable last_url column to projects"
```

---

### Task 2: `isValidHistoryUrl` helper + tests

**Files:**
- Modify: `src/lib/flow-progress.ts`
- Modify: `src/lib/flow-progress.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export function isValidHistoryUrl(url: string, projectId: string): boolean`

- [ ] **Step 1: Write failing tests**

Append to `src/lib/flow-progress.test.ts`:

```ts
describe("isValidHistoryUrl", () => {
  const id = "fca689ff-e194-45eb-b6fa-0188cc327759";

  it("accepts valid project-internal URLs that belong to this project", () => {
    expect(isValidHistoryUrl(`/prd/${id}`, id)).toBe(true);
    expect(isValidHistoryUrl(`/ac/${id}`, id)).toBe(true);
    expect(isValidHistoryUrl(`/task/${id}`, id)).toBe(true);
    expect(isValidHistoryUrl(`/ask/${id}`, id)).toBe(true);
    expect(isValidHistoryUrl(`/kanban/${id}`, id)).toBe(true);
  });

  it("rejects URLs whose project ID does not match", () => {
    expect(isValidHistoryUrl(`/ac/00000000-0000-0000-0000-000000000000`, id)).toBe(false);
  });

  it("rejects URLs outside the project namespace", () => {
    expect(isValidHistoryUrl("/history", id)).toBe(false);
    expect(isValidHistoryUrl("/settings", id)).toBe(false);
    expect(isValidHistoryUrl("/pricing", id)).toBe(false);
    expect(isValidHistoryUrl("/", id)).toBe(false);
  });

  it("rejects malformed or empty input", () => {
    expect(isValidHistoryUrl("", id)).toBe(false);
    expect(isValidHistoryUrl("/ac/", id)).toBe(false);
    expect(isValidHistoryUrl("/ac", id)).toBe(false);
    expect(isValidHistoryUrl("javascript:alert(1)", id)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx vitest run src/lib/flow-progress.test.ts 2>&1 | tail -20
```

Expected: FAIL — `isValidHistoryUrl is not defined`

- [ ] **Step 3: Implement `isValidHistoryUrl`**

Append to `src/lib/flow-progress.ts`:

```ts
const HISTORY_URL_RE = /^(?:\/(?:ask|prd|ac|task|kanban))\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/;

/**
 * True when `url` is a project-internal route that belongs to `projectId`.
 *
 * Guards against a client writing another project's last_url (anti-spoof)
 * and against XSS / javascript: URLs. Used by the last-route endpoint and
 * by the History loader when deciding whether to trust a persisted last_url.
 */
export function isValidHistoryUrl(url: string, projectId: string): boolean {
  const m = HISTORY_URL_RE.exec(url);
  return m !== null && m[1] === projectId;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx vitest run src/lib/flow-progress.test.ts 2>&1 | tail -15
```

Expected: `Test Files 1 passed (1) / Tests 15 passed (15)` (was 11, now +4)

- [ ] **Step 5: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add src/lib/flow-progress.ts src/lib/flow-progress.test.ts
git commit -m "feat(flow-progress): add isValidHistoryUrl guard"
```

---

### Task 3: `POST /api/projects/$id/last-route` endpoint

**Files:**
- Create: `src/routes/api/projects/$id/last-route.ts`

**Interfaces:**
- Consumes: `requireUser`, `db`, `projects`, `isValidHistoryUrl`
- Produces: HTTP endpoint accepting `{ url: string }`, returns `{ success: true, url }` or 400/404

- [ ] **Step 1: Write the route file**

Create `src/routes/api/projects/$id/last-route.ts`:

```ts
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { isValidHistoryUrl } from "@/lib/flow-progress";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/$id/last-route")({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { id: projectId } = params;

        let body: { url?: unknown } | null = null;
        try {
          body = await request.json().catch(() => null);
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const url = typeof body?.url === "string" ? body.url : null;
        if (!url || !isValidHistoryUrl(url, projectId)) {
          return Response.json({ error: "Invalid URL" }, { status: 400 });
        }

        const [existing] = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
          .limit(1);
        if (!existing) return Response.json({ error: "Project not found" }, { status: 404 });

        await db
          .update(projects)
          .set({ lastUrl: url, updatedAt: new Date() })
          .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));
        return Response.json({ success: true, url });
      },
    },
  },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx tsc --noEmit 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add "src/routes/api/projects/\$id/last-route.ts"
git commit -m "feat(api): add POST /api/projects/\$id/last-route endpoint"
```

---

### Task 4: `useLastRoute` client hook

**Files:**
- Create: `src/lib/use-last-route.ts`

**Interfaces:**
- Consumes: nothing
- Produces: `export function useLastRoute(projectId: string): (url: string) => void`
  - Called with the current pathname whenever it changes inside a project page.
  - Internally debounced 500 ms; fires `POST /api/projects/$id/last-route` once per navigation.

- [ ] **Step 1: Write the hook**

Create `src/lib/use-last-route.ts`:

```ts
import { useEffect, useRef } from "react";

/**
 * Debounced reporter for a project's last-visited URL.
 *
 * Call the returned function whenever the pathname inside a project changes.
 * The hook fires POST /api/projects/$id/last-route at most once per 500 ms,
 * so nested route changes (e.g. tab switches inside /task/$id) don't spam
 * the DB. Errors are silently swallowed — last_url is a best-effort signal.
 *
 * ponytail: no retry, no queue, no visibility. If the POST fails the user
 * still lands on a sensible page via the step fallback in History.
 */
export function useLastRoute(projectId: string): (url: string) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending debounce on unmount so we don't fire after the
  // component is gone (e.g. rapid navigation).
  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (url: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      fetch(`/api/projects/${projectId}/last-route`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      }).catch(() => { /* best-effort; no UI impact */ });
      timerRef.current = null;
    }, 500);
  };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx tsc --noEmit 2>&1 | tail -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add src/lib/use-last-route.ts
git commit -m "feat(hook): add useLastRoute debounced reporter"
```

---

### Task 5: Wire hook into project pages

**Files:**
- Modify: `src/routes/prd/$id.tsx`
- Modify: `src/routes/ac/$id.tsx`
- Modify: `src/routes/task/$id.tsx`
- Modify: `src/routes/ask/$id.tsx`
- Modify: `src/routes/kanban/$id.tsx`

**Interfaces:**
- Consumes: `useLastRoute` from `@/lib/use-last-route`
- Produces: each page reports its pathname to the DB on mount + route change

- [ ] **Step 1: Add hook to each page**

In each of the 5 files, add the import and call the hook. The pattern is identical in every file — only the import line and one `useEffect`-equivalent differ.

For TanStack Start, the loader already runs server-side. The page component receives no router object directly, but the `next-compat` shim exposes `usePathname`. Use that + `useLastRoute`:

```tsx
import { usePathname } from "@/lib/next-compat/navigation";
import { useLastRoute } from "@/lib/use-last-route";
import { useEffect } from "react";
```

Inside the page component (after destructuring `projectId` from params):

```tsx
const pathname = usePathname();
const reportLastRoute = useLastRoute(projectId);

useEffect(() => {
  reportLastRoute(pathname);
}, [pathname, reportLastRoute]);
```

Apply this to all 5 files:
- `src/routes/prd/$id.tsx`
- `src/routes/ac/$id.tsx`
- `src/routes/task/$id.tsx`
- `src/routes/ask/$id.tsx`
- `src/routes/kanban/$id.tsx`

- [ ] **Step 2: Typecheck**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx tsc --noEmit 2>&1 | tail -15
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add src/routes/prd/\$id.tsx src/routes/ac/\$id.tsx src/routes/task/\$id.tsx src/routes/ask/\$id.tsx src/routes/kanban/\$id.tsx
git commit -m "feat(pages): report last-route on every project page"
```

---

### Task 6: History loader + card resolution

**Files:**
- Modify: `src/routes/history.tsx`

**Interfaces:**
- Consumes: `isValidHistoryUrl` from `@/lib/flow-progress`, `stepToRoute` from `@/lib/flow-step`
- Produces: `HistoryItem` gains `lastUrl: string | null`; card href resolves via `lastUrl` first, then `stepToRoute`

- [ ] **Step 1: Update `HistoryItem` and loader select**

In `src/routes/history.tsx`:

Add `lastUrl` to the interface:

```ts
export interface HistoryItem {
  id: string;
  name: string;
  step: string | null;
  lastUrl: string | null;
  updatedAt: Date;
  preview: string | null;
}
```

Add `lastUrl` to the project select (line ~26, alongside `id, name, step, updatedAt`):

```ts
.select({
  id: projects.id,
  name: projects.name,
  step: projects.step,
  lastUrl: projects.lastUrl,
  updatedAt: projects.updatedAt,
})
```

- [ ] **Step 2: Add `resolveHistoryUrl` helper**

Add near the bottom of `src/routes/history.tsx` (after `stripMarkdown`):

```ts
/**
 * Resolve the URL a History card should link to.
 *
 * Priority: last_url (if it belongs to this project and is a valid
 * project-internal route) → stepToRoute(step, id) as fallback.
 * The fallback preserves the existing behaviour for brand-new projects
 * and for any row whose last_url was cleared or corrupted.
 */
function resolveHistoryUrl(item: { id: string; step: string | null; lastUrl: string | null }): string {
  if (item.lastUrl && isValidHistoryUrl(item.lastUrl, item.id)) {
    return item.lastUrl;
  }
  return stepToRoute(item.step, item.id);
}
```

- [ ] **Step 3: Wire helper into the card mapping**

Replace the existing line (around line 62-63):

```ts
const href = stepToRoute(p.step, p.id);
```

with:

```ts
const href = resolveHistoryUrl(p);
```

And update the return object to include `lastUrl`:

```ts
return {
  id: p.id,
  name: p.name,
  step: p.step,
  lastUrl: p.lastUrl,
  updatedAt: p.updatedAt ?? new Date(0),
  preview,
};
```

- [ ] **Step 4: Typecheck**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx tsc --noEmit 2>&1 | tail -15
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
npx vitest run 2>&1 | tail -10
```

Expected: all tests pass (no regressions).

- [ ] **Step 6: Commit**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add src/routes/history.tsx
git commit -m "feat(history): resolve card href from last_url with step fallback"
```

---

### Task 7: Manual smoke test

**Files:** none (verification only)

- [ ] **Step 1: Start dev server**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
pnpm dev
```

- [ ] **Step 2: Verify flow**

1. Open a project's PRD page (`/prd/<id>`). Wait 1 s.
2. Click "Generate AC" → navigate to `/ac/<id>`. Wait 1 s.
3. Go to `/history`, click the project card.
4. Expected: browser lands on `/ac/<id>` (the last page visited), not `/prd/<id>`.
5. Open a fresh project (no last_url). Go to `/history`, click its card.
6. Expected: lands on `/prd/<id>` (step fallback).

- [ ] **Step 3: Verify DB**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
node -e "
require('dotenv').config({path:'.env.local'});
const {Pool}=require('pg');
const p=new Pool({connectionString:process.env.DATABASE_URL});
(async()=>{
  const r=await p.query('SELECT id, name, step, last_url FROM projects WHERE last_url IS NOT NULL LIMIT 5');
  console.table(r.rows);
  await p.end();
})().catch(e=>{console.error(e.message);process.exit(1)});
"
```

Expected: at least 1 row with `last_url` matching a real project page.

- [ ] **Step 4: Final commit if any fixups needed**

```bash
cd "C:/Coding/Web Development/Tanstack-start/novaplan"
git add -A && git commit -m "fix: smoke-test fixups for last-url feature"
```

---

## Self-Review

- **Spec coverage:** All 5 design sections covered — migration (Task 1), helper + tests (Task 2), endpoint (Task 3), client hook (Task 4), page wiring (Task 5), History resolution (Task 6), smoke test (Task 7).
- **Placeholder scan:** No TBD/TODO. All code blocks complete.
- **Type consistency:** `isValidHistoryUrl(url, projectId)` signature consistent across Tasks 2, 3, 6. `useLastRoute(projectId)` consistent across Tasks 4, 5. `HistoryItem.lastUrl: string | null` consistent across Tasks 6.
- **No over-engineering:** No global router subscribe, no localStorage, no backfill, no rate limit on the endpoint. Each is a deliberate YAGNI omission named in Global Constraints.
