# NovaPlan AI — Architecture

## 1. Architectural Pattern

**Hybrid: Layered Architecture + Feature-based Organization**

```
┌─────────────────────────────────────────────┐
│  Layer 1: Routing (Next.js App Router)       │
│  ├── Server Components (RSC)                 │
│  ├── Client Components ("use client")        │
│  └── Middleware (auth, security headers)     │
├─────────────────────────────────────────────┤
│  Layer 2: UI Components                      │
│  ├── Feature components (prd, ac, task, etc)│
│  └── Shared UI (button, card, input, toast) │
├─────────────────────────────────────────────┤
│  Layer 3: State Management                   │
│  ├── Zustand (auth, chat, UI)               │
│  ├── TanStack Query (kanban polling)        │
│  └── React cache() (server auth)            │
├─────────────────────────────────────────────┤
│  Layer 4: API Routes (Next.js)               │
│  ├── SSE streaming endpoints                │
│  ├── REST CRUD endpoints                    │
│  └── Webhook handlers                       │
├─────────────────────────────────────────────┤
│  Layer 5: Services (Business Logic)          │
│  ├── prd-service.ts, ac-service.ts          │
│  ├── task-service.ts, sitemap-service.ts    │
│  ├── chat-service.ts, export-service.ts     │
│  ├── ai-orchestrator.ts                     │
│  └── error-sanitizer.ts                     │
├─────────────────────────────────────────────┤
│  Layer 6: Data Access (InsForge SDK)         │
│  ├── Browser client (client.ts)             │
│  ├── Server client (server.ts)              │
│  └── Admin client (admin.ts)                │
├─────────────────────────────────────────────┤
│  Layer 7: Infrastructure                     │
│  ├── PostgreSQL (InsForge)                  │
│  ├── 9Router / OpenCode Free (AI inference)    │
│  └── Midtrans (Payment gateway)             │
└─────────────────────────────────────────────┘
```

## 2. Authentication Flow

```
Browser                  Middleware                  InsForge Auth
   │                         │                          │
   │── Request protected ──► │                          │
   │    route                │── updateSession() ──────►│
   │                         │◄── accessToken/refresh ──│
   │                         │                          │
   │                         │── Set httpOnly cookies ─►│
   │                         │── Redirect /allow ──────►│
   │◄── Response ────────────│                          │
```

- **Middleware** (`middleware.ts`): session refresh via `@insforge/sdk/ssr`
- Public routes: `/`, `/login`, `/register`, `/forgot-password`, `/pricing`, `/auth/*`, `/api/*`, `/prd/share/*`
- Authenticated + auth route → redirect `/`
- Unauthenticated + protected route → redirect `/login?redirect=`
- Security headers on every response (CSP, HSTS, X-Frame-Options)

## 3. PRD Generation Data Flow

```
User → ChatInput → POST /api/chat → Auth + Quota → 9Router OpenCode Free SSE stream
  → client accumulates delta events → PRD Viewer updates
  → server saves to prd_versions on completion
  → SSE done event → router.refresh() → latest from DB
```

## 4. Workspace Step Flow

```
PRD ──► AC ──► Task/Sitemap ──► Kanban
step=prd    step=ac    step=task

Navbar: [1]───[2]───[3]
         PRD   AC   TASK
```

- Route-based step tracking (not DB column)
- Sitemap = tab within Task page
- Kanban = separate view of task data

## 5. SSE Streaming Protocol

All AI endpoints use unified SSE format:

```
data: {"type":"started","model":"meta/llama-3.1-8b-instruct"}
data: {"type":"delta","content":"## 1. Overview\n..."}
data: {"type":"done","conversationId":"...","projectId":"..."}
data: {"type":"error","error":"Rate limit exceeded"}
```

| Feature | Endpoint | Input | Saved To |
|---------|----------|-------|----------|
| PRD Gen | `POST /api/chat` | `{message, mode:"generate"}` | `prd_versions`, `messages` |
| PRD Revise | `POST /api/chat` | `{message, mode:"revise"}` | `prd_versions` (merged) |
| PRD Resume | `POST /api/chat` | `{message, mode:"resume"}` | `prd_versions` |
| AC Gen | `POST /api/ac/generate` | `{projectId}` | `ac_versions` |
| AC Revise | `POST /api/ac/revise` | `{projectId, message}` | `ac_versions` |
| Task Gen | `POST /api/task/generate` | `{projectId}` | `features/tasks/subtasks` |
| Sitemap Gen | `POST /api/sitemap/generate` | `{projectId}` | `sitemap_pages` |

## 6. Database Architecture

**Denormalized Owner Pattern:** All child tables have `user_id` auto-populated by trigger from `projects.user_id`. RLS: `(auth.uid()) = user_id` — no JOINs needed.

```
auth.users
  └── users (profiles)
  ├── api_keys (direct child)
  ├── subscriptions
  ├── quotas
  ├── payments
  └── projects
        ├── prd_versions
        ├── conversations ── messages
        ├── ac_versions (JSONB)
        ├── features ── tasks ── subtasks
        ├── sitemap_pages (self-ref)
        └── node_positions (polymorphic)
```

## 7. AI Model Selection

```
selectModels(plan) → ordered list unlocked by tier
tryStreamWithFallback(models[]) → try each, return first success
```

Fallback chain: user model → same-tier models → all errors → user message

## 8. Key Decisions

1. **SSE over WebSocket** — simpler, works with serverless
2. **Node.js runtime** — edge 60s timeout too short; AI gen needs 300s
3. **8K max tokens** — 16K caused AI looping
4. **Block-patching** — AI updates only changed sections via `:::UPDATE_SECTION[...]:::`
5. **Route-based step** — URL pathname, not DB column (no stale indicators)
6. **Denormalized user_id** — avoids JOIN-based RLS
7. **No DB transactions** — compensating deletes instead (SDK limitation)
