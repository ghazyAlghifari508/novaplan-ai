# NovaPlan Professional Polish — Design Spec (Fase 1 + 2)

**Date:** 2026-08-24
**Status:** Draft — awaiting user approval
**Scope:** Fase 1 (Professional Polish) + Fase 2 (Enak Dipake). Fase 3 (Collaboration) explicitly out of scope.
**Tech Stack:** TanStack Start + TanStack Router (file-based `src/routes/`), React 19, Tailwind CSS 4, Zustand (`src/store/index.ts`), Drizzle ORM + PostgreSQL 17, Vercel AI SDK v7 + 9Router (`novaplan-combo`), Vitest + Playwright, Biome, pnpm

---

## 1. Goal & Success Criteria

**Goal:** Bikin NovaPlan terasa **profesional & enak dipake** tanpa nambah complexity kolaborasi tim. User free yang masuk harus bisa selesai 1 workflow PRD→AC→Task→Kanban dengan zero confusion, dan user Pro merasa worth Rp 49k.

**Success criteria (measurable):**
- Activation: % user baru yang selesaikan PRD v1 dalam 10 menit > 60% (sekarang tidak diukur)
- Conversion: click “Generate AC” yang ke-block paywall tapi convert ke /pricing > 25%
- Retention: return ke History dan resume project tanpa bingung (resolveHistoryUrl tetap benar)
- Perceived quality: tidak ada lagi “PRD ke-truncate tapi ke-save jadi v2” bug (isTruncatedGeneration sudah ada, tapi butuh incremental save)
- Tech health: 0 import `next/*` tersisa di codebase

---

## 2. Global Constraints (berlaku untuk semua task)

- **Framework:** TanStack Start file-based routing di `src/routes/`, bukan Next.js. Jangan pakai `next/link` atau `next/navigation` — pakai `Link` dari `@tanstack/react-router` dan `useNavigate`.
- **Server-only modules:** `db` (`src/db/index.ts`), `pg`, `auth` wajib dynamic import di handler atau via `createServerFn`. Jangan import di top-level client bundle.
- **Credits:** 1 credit = 1 generate (PRD/AC/Task). Revision = free unlimited. Jangan tambah credit gate di revision flow (`src/routes/api/chat.ts:87` sudah benar).
- **Versions append-only:** `prd_versions` / `ac_versions` tidak pernah mutate, selalu insert baru (`src/db/schema.ts:164` uniqueIndex).
- **Step monotonic:** `projects.step` hanya naik (`flow-progress.ts:25` `advanceStep`). Jangan set langsung.
- **SSE contract:** `started → delta/thinking → done/error` (`src/routes/api/chat.ts:206`). Client consume via fetch + ReadableStream di `src/components/chat/chat-panel.tsx`.
- **Revision protocol:** `:::UPDATE_SECTION[Name]::: ... :::END_UPDATE:::` blocks, bukan full rewrite (`src/routes/api/chat.ts:359`).
- **Bahasa:** UI copy Bahasa Indonesia, istilah teknis tetap English.
- **No hardcode:** API URLs, thresholds, limits wajib di `src/lib/constants.ts` atau env var, jangan inline magic value.
- **No fake indicators:** progress/step indicator harus wired ke sinyal real (SSE delta, DB status), bukan array string rotasi timer.
- **Zustand = in-memory:** server truth di Postgres, jangan assume persist.

---

## 3. Architecture Overview

Tidak ada restrukturisasi besar. Ini adalah **polish in-place** di atas pipeline yang sudah ada:

```
Landing (/) → Ask (/ask/$id) → PRD (/prd/$id) ↔ Chat Panel (revise)
                                         ↓ (step=ac)
                                      AC (/ac/$id) — auto-generate via /api/ac/generate (SSE)
                                         ↓ (step=task)
                                     Task (/task/$id) — JSON via /api/task/generate
                                         ↓ (step=task)
                                    Kanban (/kanban/$id) — polling → SSE realtime (Fase 2)
                                         ↓
                                    History (/history) — resume via resolveHistoryUrl
```

Perubahan arsitektur kecil:
- **Kanban realtime (Fase 2):** ganti `useKanbanTasks` polling 10s (`src/hooks/use-kanban-polling.ts:44`) jadi SSE subscription (`/api/kanban/$pid` stream) dengan fallback polling. Server sudah punya `GET /api/kanban/$pid` — tinggal tambah SSE endpoint.
- **Export PDF (Fase 1):** tambah `lib/services/export-pdf.ts` wrapper di atas `document-pdf` skill, consume `formatPrdMarkdown` + `generateZipBuffer` yang ada.
- **No new DB tables di Fase 1** kecuali jika butuh `prd_comments` (deferred ke Fase 3, jadi skip).

---

## 4. Fase 1 — Professional Polish (6 workstreams)

### 4.1 PRD Version Diff View

**Problem:** `PrdDetail` (`src/components/prd/prd-detail.tsx:46`) cuma switch `currentContent` via `handleVersionSelect`. User Pro dengan 30 versions tidak bisa lihat apa yang berubah di v5 vs v4. Nilai jual “Riwayat 30 versi” jadi tidak tangible.

**Design:**
- Component baru `src/components/prd/prd-diff-viewer.tsx` — terima `oldContent: string, newContent: string`. Render side-by-side diff (library: `diff` npm atau simple line-based tanpa dep baru — pilih `diff` karena kecil). Highlight added/removed lines. Mount di dalam `PrdViewer` sebagai tab “Diff” di samping “Preview”.
- Data source: `allVersions` sudah ada di loader `prd/$id.tsx:38`. Tidak perlu fetch baru. Client-side compute diff, no server change.
- Edge: jika `oldContent === newContent` tampil “Tidak ada perubahan”. Jika salah satu kosong, fallback ke viewer biasa.
- Test: Vitest untuk diff util (added/removed/unchanged), Playwright untuk tab switch.

**Files:**
- Modify: `src/components/prd/prd-viewer.tsx` — tambah tab trigger
- Create: `src/components/prd/prd-diff-viewer.tsx`, `src/lib/diff-utils.ts` (pure line diff), `src/lib/diff-utils.test.ts`
- No DB change

### 4.2 History Search / Filter / Pagination

**Problem:** `HistoryPage` (`src/components/history/history-page.tsx:26`) render `localItems.map` tanpa filter. Di 20+ project, tidak discoverable. Loader `history.tsx:23` select all tanpa limit.

**Design:**
- Client-side filter: input search (by `name` + `preview/description`), filter chips by `step` (PRD/AC/Task), sort by `updatedAt`. Debounce 200ms. Pure client, no API change untuk V1.
- Pagination: jika > 12 items, paginate client-side (12 per page). Server-side pagination deferred — karena query tanpa limit masih oke untuk <100 projects/user (cek via `SELECT COUNT` di prod nanti).
- Update `HistoryPage` props tetap `items: HistoryItem[]`, tambah state `query`, `stepFilter`, `page`.
- Test: Vitest untuk filter logic (`src/lib/history-filter.ts`), Playwright untuk search interaction.

**Files:**
- Create: `src/lib/history-filter.ts`, `src/lib/history-filter.test.ts`
- Modify: `src/components/history/history-page.tsx`, `src/routes/history.tsx` (optional: add `limit` param, tapi keep simple dulu)

### 4.3 Paywall Halus + Stepper Jujur

**Problem:** Paywall baru muncul di `ac-detail.tsx:142` (`UPGRADE_REQUIRED` 403) setelah user klik Generate. Terasa jebakan. Stepper `flow-step-nav.tsx` belum wired ke real `projects.step` progres.

**Design:**
- Di `PrdDetail`, setelah PRD done, tampilkan CTA card “Lanjut ke AC — Butuh Pro” dengan preview blur AC (3 bullet) + harga Rp 49k + button “Lihat Paket”. Jika `plan === free`, CTA non-blocking tapi jelas. Jika `plan !== free`, CTA jadi “Generate AC” normal.
- Di `AcDetail` & `TaskDetail`, jika `latestAcContent` null dan `plan === free`, jangan auto-generate lalu error — tampilkan paywall card dulu, baru auto-generate hanya untuk Pro/Hengker. Logic `hasAutoGenerated` di `ac-detail.tsx:291` tambah gate `if (plan === "free") return;`.
- Stepper: `flow-step-nav.tsx` consume `projects.step` dari loader (sudah ada di `ac/$id.tsx:22`, `prd/$id.tsx` belum expose `step` — tambah select `step` di loader). Render 4 steps dengan state `done/current/locked` berdasarkan `stepRank()` di `flow-progress.ts:14`. Jangan pakai fake array.

**Files:**
- Modify: `src/components/layout/flow-step-nav.tsx`, `src/components/prd/prd-detail.tsx`, `src/components/ac/ac-detail.tsx`, `src/routes/prd/$id.tsx` (expose step), `src/routes/ac/$id.tsx`, `src/routes/task/$id.tsx`
- Create: `src/components/shared/paywall-card.tsx`
- Constants: tambah `PAYWALL_COPY` di `src/lib/constants.ts` (jangan hardcode string di component)

### 4.4 Migrasi `next/*` → TanStack Router

**Problem:** `chat-input.tsx:2` `import Link from "next/link"` dan `useRouter from "next/navigation"` padahal project TanStack Start. Compat shim `src/lib/next-compat/navigation.ts` menyembunyikan tech debt. Akan pecah saat upgrade Vite/TanStack.

**Design:**
- Audit repo-wide: `grep -r "from \"next/` → list semua file (ditemukan: `chat-input.tsx`, `ac-detail.tsx`, `history-page.tsx`, `kanban-board.tsx`, dll).
- Ganti satu per satu:
  - `Link` → `Link` dari `@tanstack/react-router` (props `to` bukan `href`, pakai `params` untuk dynamic routes)
  - `useRouter().push` → `useNavigate()` + `navigate({ to: "/prd/$id", params: { id } })`
  - `useSearchParams` → `useSearch` dari TanStack Router atau `Route.useSearch()`
  - `router.refresh()` → `router.invalidate()` (TanStack Router)
- Hapus `src/lib/next-compat/` setelah migrasi.
- Test: `pnpm typecheck` + `pnpm build` harus pass. Playwright smoke test untuk navigasi.

**Files:**
- Modify: `src/components/layout/chat-input.tsx`, `src/components/ac/ac-detail.tsx`, `src/components/history/history-page.tsx`, `src/components/kanban/kanban-board.tsx`, `src/components/prd/prd-detail.tsx`, dll (hasil grep)
- Delete: `src/lib/next-compat/` (setelah semua migrasi)

### 4.5 Export PDF Rapi

**Problem:** `export-service.ts:24` cuma `zip.file("prd.md")` + `tasks.json`. User butuh PDF profesional untuk share ke stakeholder/client.

**Design:**
- Buah wrapper `src/lib/services/export-pdf.ts` — pakai `document-pdf` skill (fetch via context7 jika butuh). Input: `prdContent: string` (markdown). Output: `Buffer` PDF dengan header (project name, date, version), TOC, styled markdown (pakai `react-markdown` render → PDF atau `md-to-pdf` lib — pilih yang tanpa native dep).
- Route baru `src/routes/api/export/pdf.ts` — `POST { projectId }` → auth check (`requireUser` + `eq(projects.userId)`), fetch latest PRD, generate PDF, return `application/pdf` dengan `Content-Disposition`.
- UI: tambah button “Export PDF” di `PrdViewer` toolbar di samping “Export MD/ZIP”. Disable jika `!latestVersion`.
- Jangan hardcode PDF styling — pakai constants `PDF_STYLES` di `src/lib/constants.ts`.

**Files:**
- Create: `src/lib/services/export-pdf.ts`, `src/routes/api/export/pdf.ts`
- Modify: `src/components/prd/prd-viewer.tsx`, `src/lib/constants.ts`
- Test: Vitest untuk pdf generation (mock content → buffer non-empty)

### 4.6 No-Hardcode Cleanup (Constants)

**Problem:** `chat-input.tsx:28` `MIN_PROMPT_LENGTH=20` inline, `pricing-data.ts` harga hardcode tapi tidak di `constants.ts`.

**Design:**
- Pindahkan `MIN_PROMPT_LENGTH`, `MAX_PROMPT_LENGTH=3000`, `HOME_DRAFT_DEBOUNCE_MS=300`, dll ke `src/lib/constants.ts`.
- Update semua consumer import dari constants.
- Test: `src/lib/constants.test.ts` sudah ada — tambah assertion untuk new constants.

**Files:**
- Modify: `src/lib/constants.ts`, `src/components/layout/chat-input.tsx`, dll

---

## 5. Fase 2 — Enak Dipake (3 workstreams)

### 5.1 Kanban Realtime (SSE ganti Polling)

**Problem:** `useKanbanTasks` (`src/hooks/use-kanban-polling.ts:44`) polling 10s `fetch(/api/kanban/$pid)` — boros, delay 10s saat drag.

**Design:**
- Server: tambah `src/routes/api/kanban/stream.ts` — SSE endpoint yang subscribe ke DB changes via polling server-side 2s tapi push ke client via SSE (lebih efisien karena 1 koneksi, bukan N client polling). Alternatif: tetap polling tapi interval adaptif (2s saat dragging, 30s idle). Pilih SSE untuk profesional.
- Client: `useKanbanTasks` coba SSE dulu, fallback ke polling 10s jika SSE fail (EventSource error). Keep `staleness` logic (`failureCount >=3 → stale`).
- Optimistic update: saat `update-status.ts` dipanggil, update local state dulu (`setQueryData`), rollback on error.
- Test: Vitest untuk staleness logic, Playwright untuk drag → kolom pindah <1s.

**Files:**
- Create: `src/routes/api/kanban/stream.ts`
- Modify: `src/hooks/use-kanban-polling.ts`, `src/routes/api/kanban/update-status.ts` (return updated task)

### 5.2 Template Gallery di Landing

**Problem:** Landing `hero.tsx:5` cuma 1 textarea kosong — blank page syndrome. User tidak tau harus nulis se-detail apa.

**Design:**
- Data: `src/lib/template-gallery.ts` — array 6 templates: `{ id, title, icon, prompt, platform: "web"|"mobile", description }`. Contoh: “SaaS Analytics Dashboard”, “Marketplace UMKM”, “Aplikasi Habit Tracker”, dll. Prompt sudah include detail minimal 150 karakter (melewati `MIN_PROMPT_LENGTH`).
- UI: di bawah `ChatInput` di `hero.tsx`, grid 3×2 cards. Klik card → prefill `message` di `ChatInput` via prop callback `onSelectTemplate(prompt)`. `ChatInput` expose `setMessage` via prop atau lift state ke `HeroContent`.
- Tidak perlu DB, static data. Track click via `feedback` table optional.
- Test: Playwright klik template → textarea terisi → send → redirect ke /ask.

**Files:**
- Create: `src/lib/template-gallery.ts`, `src/components/layout/template-gallery.tsx`
- Modify: `src/components/layout/hero.tsx`, `src/components/layout/chat-input.tsx` (accept `initialValue` + `onTemplateSelect`)

### 5.3 Upload Brief untuk Grounding AI

**Problem:** `api/chat.ts:175` sudah ada `groundStack()` dynamic import tapi tidak ada UI upload. AI cuma dapat ide singkat user, tidak ada konteks kompetitor/brief PDF.

**Design:**
- UI: di `Ask` flow (`src/routes/ask/$id.tsx` + `src/components/ask/`), tambah section “Tambah Konteks (opsional)” — upload PDF/TXT (max 2MB, max 5000 char extracted) + input URL. Parse client-side via `FileReader` text extraction (untuk PDF, pakai `pdfjs` atau simple text — V1 cukup support .txt/.md dulu, PDF deferred).
- Flow: upload content disimpan di `sessionStorage` (`novaplan:ask-context`) atau kirim sebagai `groundingSource` extra field di `POST /api/ask/options` dan `POST /api/chat` (`message` + `context`). Server `groundStack` sudah concat — tinggal append context ke `groundingSource`.
- Limit: jangan simpan file di DB, hanya text snippet. Jika >5000 char, truncate + warning.
- Test: Vitest untuk truncate + sanitasi, Playwright untuk upload flow.

**Files:**
- Create: `src/components/ask/context-upload.tsx`, `src/lib/brief-parse.ts`, `src/lib/brief-parse.test.ts`
- Modify: `src/routes/ask/$id.tsx`, `src/components/ask/ask-flow.tsx`, `src/routes/api/chat.ts` (accept `briefContext`), `src/routes/api/ask/options.ts`

---

## 6. Out of Scope (Fase 3 Skip)

- Team workspace / `project_members` table / invite flow
- Jira/Linear/Notion integrations (`lib/integrations/`)
- PRD comments / stakeholder feedback loop
- Public gallery / community templates
- API v1 webhooks

---

## 7. Data Model Changes

**Fase 1:** No DB migration (semua client-side atau pure compute). Exception jika butuh `pdf_exports` log — skip, tidak perlu.

**Fase 2:** No DB migration. Kanban SSE tidak butuh table baru. Brief upload tidak persist di DB (sessionStorage only).

Jika nanti butuh persist brief, tambah `projects.brief_context TEXT` — tapi deferred.

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| TanStack Router migrasi pecah navigasi | Kerjakan file per file, `pnpm typecheck` + Playwright smoke tiap file. Keep compat shim sampai akhir, hapus terakhir. |
| Diff diff lib nambah bundle size | Pakai `diff` micro lib (2kb) atau implementasi line-based sendiri di `diff-utils.ts` tanpa dep. |
| SSE kanban broken di proxy/Vercel | Fallback polling sudah ada, staleness logic tetap jalan. Test di preview deploy. |
| PDF generation berat di server | Generate on-demand, jangan pre-generate. Limit 1 concurrent per user via rate-limit. |
| Revision `UPDATE_SECTION` mismatch | Tambah log warning kalau `sectionIdx === -1`, tampilkan toast “Revisi tidak terdeteksi, coba pakai nama section persis”. |

---

## 9. Testing Strategy

- **Vitest unit:** `diff-utils.test.ts`, `history-filter.test.ts`, `brief-parse.test.ts`, `constants.test.ts` — pure functions, no DB.
- **Playwright e2e:** smoke untuk tiap workstream (diff tab, search, paywall, navigation, export pdf, kanban drag, template click, upload).
- **Manual QA:** cek `pnpm build` + `pnpm typecheck` tiap task. Verify no `next/*` import tersisa via `grep`.

---

## 10. Rollout Order (Dependency)

1. 4.6 Constants cleanup (foundation, no UI)
2. 4.4 Router migrasi (blocking untuk semua nav changes)
3. 4.2 History filter (isolated)
4. 4.1 Diff view (isolated)
5. 4.3 Paywall + Stepper (butuh router migrasi selesai)
6. 4.5 Export PDF (isolated)
7. 5.2 Template gallery (isolated)
8. 5.3 Brief upload (butuh template gallery selesai untuk UX flow)
9. 5.1 Kanban realtime (paling risky, terakhir)

Setiap task commit + push terpisah sesuai `no-assumptions.md` Rule 8.
