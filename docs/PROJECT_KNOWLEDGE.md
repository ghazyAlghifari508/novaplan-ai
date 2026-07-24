# NovaPlan AI — Project Knowledge

## 1. Ringkasan Produk

**Nama:** NovaPlan AI
**Versi:** 0.1.0
**Tagline:** "Dari ide ke PRD profesional dalam 5 menit, bukan 5 hari."
**URL:** https://novaplan.ai
**Bahasa/Region:** Indonesia (id_ID)

**Deskripsi:** SaaS workspace untuk Product Manager, Developer, dan Entrepreneur. Menggunakan generative AI (via 9Router / OpenCode Free) untuk mengotomatiskan pembuatan Product Requirements Documents (PRD), Acceptance Criteria (AC), task breakdown, sitemap, dan kanban board.

## 2. Tujuan Bisnis

- Mengurangi waktu pembuatan PRD dari berhari-hari menjadi menit
- Menstandarisasi kualitas dokumen teknis produk
- Menyediakan workflow lengkap dari ide → PRD → AC → Task → Kanban
- Monetisasi melalui model freemium (Free/Pro/Hengker)

## 3. Target Pengguna

- **Product Manager** — Membuat PRD & AC profesional
- **Developer** — Breakdown task & subtask dari PRD
- **Entrepreneur/Founder** — Validasi ide produk cepat dengan dokumen standar
- **Tim Engineering** — Visualisasi task via Kanban board

## 4. Struktur Project

```
novaplan_ai/
├── src/
│   ├── app/                    # Next.js App Router (pages, layouts, api routes)
│   │   ├── ac/[id]/            # Acceptance Criteria workspace page
│   │   ├── actions/            # Server Actions (payment, settings, prd, notifications)
│   │   ├── api/                # REST API routes
│   │   │   ├── ac/             # AC generate + revise
│   │   │   ├── auth/           # Auth endpoints (sign-in, sign-up, me, oauth, etc.)
│   │   │   ├── chat/           # Chat/PRD generation streaming endpoint
│   │   │   ├── export/         # Export PRD + ZIP download
│   │   │   ├── feedback/       # User feedback
│   │   │   ├── kanban/         # Kanban data + status updates
│   │   │   ├── payments/       # Midtrans payment create + webhook
│   │   │   ├── projects/       # Project CRUD + step management
│   │   │   ├── report-error/   # Client error reporting
│   │   │   ├── sitemap/        # Sitemap generation
│   │   │   ├── task/           # Task tree generation
│   │   │   └── user/           # User plan/quota
│   │   ├── kanban/[id]/        # Kanban board page
│   │   ├── login/              # Login page
│   │   ├── register/           # Register page
│   │   ├── pricing/            # Pricing page
│   │   ├── prd/[id]/           # PRD workspace page
│   │   ├── prd/share/[token]/  # Shared PRD (public)
│   │   ├── settings/           # Settings pages (profile, account, billing, etc.)
│   │   ├── setup/              # Setup/onboarding flow for new PRD
│   │   ├── task/[id]/          # Task whiteboard page
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Landing page (Hero)
│   ├── components/
│   │   ├── ac/                 # AC viewer, detail, TOC
│   │   ├── auth/               # Login, register, forgot/reset password, onboarding
│   │   ├── chat/               # Chat panel, bubbles, model dropdown, modals
│   │   ├── kanban/             # Kanban board, columns, cards, banners
│   │   ├── layout/             # Navbar, footer, app layout, chat input, hero, flow step nav
│   │   ├── prd/                # PRD viewer, detail, TOC, mermaid, version history, sidebar
│   │   ├── settings/           # Profile, account, notifications, feedback forms
│   │   ├── task/               # Whiteboard canvas, task/sitemap nodes, zoom controls
│   │   └── ui/                 # Reusable UI (button, card, input, dialog, toast, etc.)
│   ├── hooks/                  # Custom hooks (use-panel-resize, use-kanban-polling, use-canvas-zoom)
│   ├── lib/
│   │   ├── insforge/           # InsForge DB client (client, server, admin, auth-cookies)
│   │   ├── services/           # Business logic (chat, prd, ac, task, sitemap, export, ai-orchestrator, error-sanitizer)
│   │   ├── ai-client.ts        # 9Router / OpenCode Free streaming client
│   │   ├── api-key-auth.ts     # API key authentication for v1 routes
│   │   ├── auth.ts             # Next.js server auth helpers (cached)
│   │   ├── constants.ts        # AI model constants, rate limit config
│   │   ├── model-config.ts     # AI model definitions (ALL_MODELS)
│   │   ├── pricing-data.ts     # Pricing tier data
│   │   ├── prompts.ts          # PRD system prompts (generate + revise)
│   │   ├── prompts-ac.ts       # AC system prompts
│   │   ├── prompts-task.ts     # Task system prompts
│   │   ├── quota.ts            # Quota checking/increment logic
│   │   ├── rate-limit.ts       # Rate limiting logic
│   │   └── utils.ts            # Utility functions (cn, formatDate, etc.)
│   ├── middleware.ts            # Next.js middleware (auth, security headers, CSP)
│   ├── store/                   # Zustand stores (auth, chat, UI)
│   └── types/                   # TypeScript type definitions (database.ts)
├── migrations/                  # SQL migration files (10 files)
├── graphify-out/                # Codebase graph visualization output
└── docs/                        # Project documentation
```

## 5. Arsitektur

**Pola:** Modular Layered Architecture + Feature-based hybrid.

- **Layer 1 — Routing:** Next.js App Router (server components + client components)
- **Layer 2 — UI:** Client components with Zustand state, TanStack Query for data fetching
- **Layer 3 — API:** Next.js API Routes (Node.js runtime, SSE streaming)
- **Layer 4 — Business Logic:** `/lib/services/*` service layer (single responsibility)
- **Layer 5 — Data:** InsForge (PostgreSQL-compatible) SDK client (client/server/admin)
- **Authentication:** InsForge Auth (cookie-based sessions, httpOnly, RLS)
- **AI/ML:** 9Router proxy → OpenCode Free for LLM inference

## 6. Fitur Utama

### 6.1 PRD Generation (Fitur Inti)
- **Entry:** Landing page → ChatInput → `/setup` → auto-submit prompt → `/api/chat` → SSE stream
- **Files:** `chat-input.tsx`, `chat-panel.tsx`, `setup-client.tsx`, `prd-detail.tsx`, `prd-viewer.tsx`
- **API:** `POST /api/chat` — SSE streaming, 9Router → OpenCode Free models
- **Flow:** User describes product → AI generates 8-section PRD → saved to `prd_versions` → displayed in PRD viewer
- **Features:** Real-time streaming, section-by-section progress tracking, mermaid diagram rendering, copy/export

### 6.2 PRD Revision (Block-Patching)
- **Entry:** Chat panel in PRD workspace → type revision request
- **Files:** `chat-panel.tsx`, `prompts.ts`
- **API:** `POST /api/chat` (mode="revise")
- **Flow:** User requests change → AI generates `:::UPDATE_SECTION[...]:::` blocks → server merges into existing PRD → new `prd_version` saved
- **Note:** Uses block-patching (update only changed sections, not full rewrite)

### 6.3 Acceptance Criteria Generation (PRD-04)
- **Entry:** AC workspace page (`/ac/[id]`)
- **Files:** `ac-detail.tsx`, `ac-viewer.tsx`, `ac-service.ts`
- **API:** `POST /api/ac/generate` (SSE), `POST /api/ac/revise`
- **Flow:** Auto-generates on first visit if PRD exists → parses PRD → AI produces `### Feature:` + `- [ ] AC` markdown → saved as JSONB in `ac_versions`
- **Features:** Version history, chat-based revision, block-patching, step navigation

### 6.4 Task Tree Generation (PRD-05)
- **Entry:** Task workspace page (`/task/[id]`)
- **Files:** `task-detail.tsx`, `whiteboard-canvas.tsx`, `task-service.ts`
- **API:** `POST /api/task/generate` (SSE)
- **Flow:** Uses existing AC content → AI generates JSON task tree (features → tasks → subtasks) → saved to `features`/`tasks`/`subtasks` tables
- **Features:** Interactive whiteboard canvas, zoom/pan, connection lines, sitemap tab

### 6.5 Sitemap Generation (PRD-06)
- **Entry:** Task workspace → Sitemap tab
- **Files:** `task-detail.tsx` (sitemap tab), `sitemap-service.ts`
- **API:** `POST /api/sitemap/generate` (SSE)
- **Flow:** Uses PRD content → AI generates hierarchical sitemap → saved to `sitemap_pages` (self-referential parent_id)
- **Features:** Tree visualization, whiteboard canvas, auth page badges

### 6.6 Kanban Board
- **Entry:** Kanban page (`/kanban/[id]`)
- **Files:** `kanban-board.tsx`, `kanban-column.tsx`, `kanban-card.tsx`
- **API:** `GET /api/kanban/[pid]`, `POST /api/kanban/update-status`
- **Flow:** Tasks from DB → grouped by status (pending/in_progress/completed/failed) → displayed as columns
- **Features:** Polling (10s), AC staleness detection, card movement animation, mobile support

### 6.7 Authentication & User Management
- **Entry:** Login/Register pages
- **Files:** `login-form.tsx`, `register-form.tsx`, `middleware.ts`, `auth.ts`, `insforge/auth-cookies.ts`
- **Flow:** Email/password or OAuth → InsForge Auth → httpOnly cookies → RLS-scoped DB queries
- **Features:** Session refresh, password reset, OAuth (Google), onboarding flow

### 6.8 Subscription & Payments
- **Entry:** Pricing page, settings/billing
- **Files:** `pricing-card.tsx`, `pricing-data.ts`, `payment.ts`, `route.ts` (payments)
- **Gateway:** Midtrans (sandbox) — SNAP API
- **Plans:** Free (3 PRD), Pro (25, Rp25k/mo), Hengker (unlimited, Rp75k/mo)

### 6.9 Export
- **Entry:** PRD workspace export button, ZIP export API
- **Files:** `export-service.ts`
- **API:** `POST /api/export/prd`, `POST /api/export/zip`
- **Output:** Markdown PRD/AC, JSON tasks/sitemap, ZIP archive

## 7. Database

**Platform:** InsForge (PostgreSQL-compatible with RLS)

**Tables (initial schema — 001):**
1. `users` — User accounts
2. `subscriptions` — Plan subscriptions
3. `quotas` — Usage quotas (per user)
4. `projects` — PRD project containers
5. `prd_versions` — PRD document versions
6. `conversations` — AI chat sessions
7. `messages` — Chat messages
8. `payments` — Payment transactions
9. `rate_limits` — Rate limiting

**Tables (VibeCoding — migration 20260720120000):**
10. `ac_versions` — AC versions (JSONB content)
11. `features` — Feature definitions
12. `tasks` — Task definitions
13. `subtasks` — Subtask definitions
14. `sitemap_pages` — Sitemap tree (self-referential)
15. `node_positions` — Whiteboard canvas state
16. `api_keys` — API keys for external access

**Pola Denormalized Owner:** Semua child tables memiliki `user_id` dengan trigger `set_project_child_user_id()` yang auto-populate dari `projects.user_id`.

**RLS:** Strict Row Level Security on all tables — `(auth.uid()) = user_id` policies.

## 8. AI Integration

- **Provider:** 9Router → OpenCode Free (`http://localhost:20128/v1`)
- **Models:**
  - Free: DeepSeek v4 Flash, Hy3 Free, North Mini Code
  - Pro: Qwen 3.6 Plus, MiniMax M3, MiMo v2.5
  - Hengker: Nemotron 3 Ultra, Big Pickle
- **Streaming:** SSE (Server-Sent Events) via `ReadableStream`
- **Fallback Chain:** Model failure → try next model in tier → user-facing error if all fail
- **Max Tokens:** 8192 (reduced from 16384 to prevent AI looping)

## 9. Coding Convention

- **TypeScript:** Strict mode, `any` only with `// ponytail:` justification
- **Next.js:** App Router, server components by default, "use client" when needed
- **Imports:** `@/` path alias (src/)
- **Export:** Named exports, no default exports for components (prefer `export function`)
- **Styling:** Tailwind CSS v4 with CSS variables for theming
- **State:** Zustand for global state (auth, chat, UI)
- **Services:** Single Responsibility Pattern — each service file handles one domain
- **Error Handling:** `error-sanitizer.ts` for client-safe messages, `ponytail:` comments for known shortcuts
- **Comments:** `ponytail:` prefix marks deliberate simplifications with ceiling/upgrade path
- **Auth:** `getUser()` is cached with React `cache()` for deduplication
- **Streaming:** SSE protocol with `started`/`delta`/`done`/`error` event types

## 10. API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/chat` | Chat/PRD generate/revise/resume (SSE) |
| POST | `/api/ac/generate` | Generate AC from PRD (SSE) |
| POST | `/api/ac/revise` | Revise AC via chat (SSE) |
| POST | `/api/task/generate` | Generate task tree from AC (SSE) |
| POST | `/api/sitemap/generate` | Generate sitemap from PRD (SSE) |
| GET | `/api/kanban/[pid]` | Get kanban columns data |
| POST | `/api/kanban/update-status` | Update task/subtask status (API key auth) |
| POST | `/api/export/prd` | Export all project content |
| POST | `/api/export/zip` | Download ZIP archive |
| POST | `/api/auth/sign-in` | Login |
| POST | `/api/auth/sign-up` | Register |
| POST | `/api/auth/sign-out` | Logout |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/refresh` | Refresh session |
| GET | `/api/auth/oauth/google` | Google OAuth |
| GET/POST | `/api/auth/oauth/callback` | OAuth callback |
| POST | `/api/auth/onboarding` | Onboarding completion |
| GET | `/api/user/plan` | User plan & quota |
| POST | `/api/projects/[id]` | Project CRUD (DELETE) |
| POST | `/api/payments/create` | Midtrans payment session |
| POST | `/api/payments/webhook` | Midtrans webhook |
| POST | `/api/feedback` | Submit feedback |
| POST | `/api/report-error` | Client error report |

## 11. Technical Debt

1. **`any` types in services** — InsForge SDK belum expose client types, semua service pakai `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
2. **No transaction support** — InsForge SDK tidak punya transaction API, delete-then-insert pattern dengan compensating delete (race condition risk)
3. **`kanban/update-status` auth duplication** — Route ini implementasi API key auth manual, sementara `api-key-auth.ts` sudah punya `apiKeyAuth()`
4. **Dead route files** — `docs/plan/` files dan beberapa file di git status "D" (deleted)
5. **Kanban page route inconsistency** — Route params `[pid]` di kanban API vs `[id]` di page
6. **Model labels misleading** — Label "Claude Sonnet 4.5" untuk `meta/llama-3.3-70b-instruct` (bukan Claude asli)
7. **No unit tests for new features** — Hanya ada test untuk auth, constants, utils, export-service, ai-orchestrator
8. **Large component files** — `chat-panel.tsx` (665 lines)
9. **`handlePaymentSuccess` in server action** — Dipanggil dari webhook route (server action di runtime edge-incompatible)
10. **Duplicate API key auth logic** — `kanban/update-status` dan `api-key-auth.ts` punya hash+lookup logic yang sama

## 12. Hal Penting untuk Developer Baru

1. **InsForge ≠ Supabase** — API mirip tapi platform terpisah dengan SDK `@insforge/sdk`
2. **Semua streaming via SSE** — Tidak ada WebSocket
3. **Ponytail comments** — `// ponytail:` marks deliberate tradeoffs
4. **Cached auth** — `getUser()` menggunakan React `cache()`
5. **Step flow** — PRD → AC → Task (sitemap sub-phase dari PRD)
6. **Route is truth** — Flow step dari pathname, bukan DB `projects.step`
7. **RLS strict** — Semua query via authenticated user context
8. **Bahasa Indonesia** — Semua UI text dan error messages dalam Bahasa Indonesia
