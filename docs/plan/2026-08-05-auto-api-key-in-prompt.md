# Auto API Key in Prompt — Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement task-by-task.

**Goal:** When user clicks "Prompt AI Agent", auto-generate an API key server-side and embed it directly in the prompt. Zero round-trip to Settings page. Settings page stays for manual management + revocation.

**Architecture:** New `POST /api/settings/api-keys/auto` endpoint checks for existing auto-key (name LIKE `auto-cli-%`), deletes old + creates new (raw key only returned once). Client's `handlePromptAi` calls this endpoint in parallel with the existing `fetchContent()` call.

**Tech Stack:** TanStack Start route pattern, Drizzle ORM, node:crypto.

## Global Constraints

- Settings page untouched — stays for manual key management and revocation.
- Auto-key naming: `auto-cli-{timestamp}` — visible in settings list so user can identify/revoke.
- Auto-key gets ALL scopes: `read:project`, `write:task:status`, `write:subtask:status`.
- Reuse policy: delete old auto-key, create new each time (raw key only shown once, can't re-retrieve).
- Key gen: same crypto as `src/routes/api/settings/api-keys/index.ts:28-30`: `novaplan_` + `randomBytes(32).hex()`, SHA-256 hash stored.
- Auth: `requireUser(getRequestHeaders())` (session auth).
- Error handling: if auto-key fails, prompt still renders with `<GANTI_DENGAN_API_KEY_KAMU>` placeholder.

---

## Task 1: Create `POST /api/settings/api-keys/auto` endpoint

**Files:**
- Create: `src/routes/api/settings/api-keys/auto.ts`

**Interfaces:**
- Consumes: session auth, `apiKeys` table
- Produces: `Response.json({ rawKey })` or `Response.json({ error }, { status })`

- [ ] **Step 1: Create route file**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireUser } from "@/lib/session";

const ALL_SCOPES = ["read:project", "write:task:status", "write:subtask:status"];

export const Route = createFileRoute("/api/settings/api-keys/auto")({
  server: {
    handlers: {
      POST: async () => {
        const user = await requireUser(getRequestHeaders());

        // Delete existing auto-generated key (raw key not retrievable, must recreate)
        const existing = await db
          .select({ id: apiKeys.id })
          .from(apiKeys)
          .where(and(eq(apiKeys.userId, user.id), like(apiKeys.name, "auto-cli-%")))
          .limit(1);

        if (existing.length > 0) {
          await db.delete(apiKeys).where(eq(apiKeys.id, existing[0].id));
        }

        const rawKey = `novaplan_${randomBytes(32).toString("hex")}`;
        const keyHash = createHash("sha256").update(rawKey).digest("hex");
        const keyPrefix = rawKey.slice(0, 10);

        const [inserted] = await db
          .insert(apiKeys)
          .values({
            id: crypto.randomUUID(),
            userId: user.id,
            name: `auto-cli-${Date.now()}`,
            key: keyHash,
            keyPrefix,
            scopes: ALL_SCOPES,
          })
          .returning({ id: apiKeys.id });

        if (!inserted) return Response.json({ error: "Gagal membuat API key" }, { status: 500 });
        return Response.json({ rawKey });
      },
    },
  },
});
```

- [ ] **Step 2: Generate routes + TypeScript check**

```bash
pnpm generate-routes
npx tsc --noEmit --pretty
```

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/settings/api-keys/auto.ts
git commit -m "feat(api): add auto API key endpoint for CLI prompt flow"
```

---

## Task 2: Update `handlePromptAi` to fetch auto-key

**Files:**
- Modify: `src/components/task/implementation-options.tsx` (handlePromptAi, lines 195-214)

**Interfaces:**
- Consumes: `POST /api/settings/api-keys/auto` → `{ rawKey }`
- Produces: prompt with real API key embedded

- [ ] **Step 1: Update handlePromptAi**

Replace the apiKey line. Both fetches run in parallel via `Promise.all`:

```ts
const handlePromptAi = useCallback(async () => {
  setIsLoading(true);
  try {
    const [data, autoKeyData] = await Promise.all([
      fetchContent(),
      fetch("/api/settings/api-keys/auto", { method: "POST" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    const apiKey = autoKeyData?.rawKey || "<GANTI_DENGAN_API_KEY_KAMU>";
    const prompt = AI_AGENT_PROMPT_TEMPLATE
      .replace(/{projectName}/g, data.projectName || projectName)
      .replace(/{prdContent}/g, data.prd || "(Belum ada PRD)")
      .replace(/{acContent}/g, data.ac || "(Belum ada AC)")
      .replace(/{tasksContent}/g, data.tasks || "(Belum ada tasks)")
      .replace(/{projectId}/g, projectId)
      .replace(/{apiKey}/g, apiKey);

    setPromptText(prompt);
    setShowPromptModal(true);
  } catch {
    showToast("Gagal mengambil data project", "error");
  } finally {
    setIsLoading(false);
  }
}, [fetchContent, projectName, showToast, projectId]);
```

- [ ] **Step 2: TypeScript check + commit**

```bash
npx tsc --noEmit --pretty
git add src/components/task/implementation-options.tsx
git commit -m "feat(prompt): auto-fetch API key and embed in prompt"
```

---

## Verification

1. `pnpm dev` → open project with tasks
2. Click "Prompt AI Agent"
3. Prompt text contains `novaplan_...` (real key, NOT placeholder)
4. Open `/settings/api-keys` → see `auto-cli-{timestamp}` key with all scopes
5. Click "Prompt AI Agent" again → old key deleted, new created (no duplicates)
6. Delete auto-key in settings → click "Prompt AI Agent" → new key created
7. `npx tsc --noEmit` → 0 errors
8. `npx vitest run` → all tests pass
