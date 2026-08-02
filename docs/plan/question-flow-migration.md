# Ganti `/setup` → Question Flow 2-Sesi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ganti halaman pilihan Auto/Manual (`/setup`) dengan alur tanya-jawab 2 sesi (`/ask/[projectId]`) yang opsi jawabannya digenerate AI, supaya PRD yang dihasilkan akurat sesuai preferensi user — bukan tebakan AI.

**Architecture:** Route baru `/ask/$id` (TanStack Start file route) render client component `AskFlow` yang orchestrate 2 sesi state lokal (React `useState`, tidak ada store baru). Sesi 1 fetch opsi pertanyaan dari endpoint baru `POST /api/ask/options` (SSE tidak perlu — cukup satu JSON response, mirror pola non-stream). Sesi 2 murni dropdown lokal, tidak perlu API. Submit akhir compile semua jawaban jadi satu blok teks, pakai `savePendingPrdPrompt()` yang sudah ada (sessionStorage handoff), redirect ke `/prd/[projectId]` — `chat-panel.tsx` auto-submit `useEffect` yang sudah ada otomatis konsumsi tanpa perubahan endpoint `/api/chat`.

**Tech Stack:** TanStack Start/Router (file-based routing, `createServerFn`), Drizzle ORM + `pg`, better-auth (`requireUser`/`requireUserServer`), React 19 (`useState`/`useCallback`/`useEffect`, tanpa Zustand store baru), Tailwind CSS v4 (utility class + CSS vars `var(--bg-card)` dll, pola existing), TypeScript strict, Biome (`pnpm check`).

## Global Constraints

- `/setup` dan `/setup/manual` — route, component, SEMUA referensi — dihapus total, tidak ada soft-deprecate. Grep akhir `"/setup"` di `src/` harus 0 match (kecuali `routeTree.gen.ts` yang auto-regenerate).
- Opsi jawaban sesi 1 WAJIB digenerate AI per-request, tidak boleh hardcode di codebase.
- Model AI generate opsi = model yang user pilih di home (`sessionStorage: novaplan:selected-model`), lewat `selectModels(plan, model)` — pola sama seperti PRD generation.
- Tidak ada migration/kolom DB baru. Q&A mentah tidak disimpan terpisah — hanya versi terkompilasi masuk PRD prompt.
- `chat-panel.tsx` auto-submit `useEffect`, `/api/chat` endpoint, `task-service.ts`, diagram, kanban — TIDAK disentuh.
- Setiap Task diverifikasi dengan `npx tsc --noEmit` sebelum lanjut ke Task berikutnya.
- Semua UI baru pakai pola styling existing: `font-inter`, CSS var `style={{ background: "var(--bg-card)" }}`, `border-(--border-subtle)`, `shadow-(--shadow-surface)` — konsisten dengan `setup-client.tsx`/`manual-setup-client.tsx` yang dihapus (referensi visual, bukan hasil copy-paste).

---

## Rencana Detail (Desain & Arsitektur)

### Kenapa desain ini

Masalah root: `/setup` cuma nawarin 2 tombol (auto/manual). Auto = AI nebak semua asumsi teknis+bisnis tanpa nanya user. Manual = 1 form generik (6 field, termasuk 1 field bebas `techStack` string kosong) yang gak nge-drive AI milih stack secara terstruktur. Efeknya: PRD sering meleset dari preferensi asli user — alasan eksplisit user minta fitur ini.

Solusi: pecah proses "kasih konteks ke AI" jadi 2 sesi terpisah — non-teknis (S1) dan teknis (S2) — dengan pertanyaan+opsi yang **di-generate AI** (bukan hardcode) supaya pertanyaannya kontekstual ke prompt awal user, sementara struktur teknis (S2) tetap dropdown kontrol ketat (biar hasil compile predictable & AI-parseable) dengan mutual-exclusion logic (Frontend+Backend terpisah XOR Fullstack Framework).

### Kenapa opsi AI-generated (bukan hardcode) untuk S1

User eksplisit: opsi jawaban bukan hardcode. Alasannya implisit dari root cause — pertanyaan yang sama utk semua prompt (mis. "siapa target audiens?" dengan opsi tetap ["Umum","B2B","B2C"]) gak akan align dengan prompt spesifik user ("aplikasi kasir warung" vs "platform trading crypto"). AI generate pertanyaan+opsi berdasarkan prompt awal → lebih relevan.

### Kenapa model sama dengan pilihan user di home

Konsistensi UX: kalau user pilih model X buat generate PRD, opsi pertanyaan yang muncul juga harus "berpikir" dengan model yang sama — biar kualitas/gaya opsi konsisten dengan apa yang nanti generate PRD-nya. Pola ini sudah ada persis di `handleGenerate` (`task-detail.tsx:77`) dan chat-panel (`ai-orchestrator.ts` `selectModels(plan, requestedModel?)`), tinggal reuse.

### Kenapa tanpa kolom DB baru

`savePendingPrdPrompt()` sudah menyediakan jalur sessionStorage→auto-submit yang matang (5 menit TTL awalnya untuk `setup-prompt`, tanpa TTL untuk `prd-prompt`). Menyimpan Q&A mentah butuh migration + UI baca-balik yang tidak diminta user — YAGNI. Kompilasi jadi teks di client, kirim sebagai prompt PRD biasa, sudah cukup dan konsisten dengan pola `manual-setup-client.tsx` yang sudah teruji.

### Struktur file

**Dihapus total:**
- `src/routes/setup/index.tsx`
- `src/routes/setup/manual.tsx`
- `src/app/setup/setup-client.tsx`
- `src/app/setup/manual/manual-setup-client.tsx`
- Folder `src/app/setup/manual/` dan `src/app/setup/` (setelah kosong)

**Baru — backend:**
- `src/lib/prompts-ask.ts` — system prompt generate pertanyaan+opsi (pola sama `prompts-task.ts`: `export const ASK_OPTIONS_GENERATION_PROMPT`).
- `src/routes/api/ask/options.ts` — `POST` handler, non-stream (satu JSON response, bukan SSE — tidak perlu progressive reveal untuk daftar pertanyaan pendek).
- Tambahan di `src/lib/services/task-service.ts`? **Tidak** — dibuat file baru `src/lib/services/ask-service.ts` isi `parseAskOptionsJson` (task-service.ts scope-nya task tree, bukan tempat yang tepat — file baru kecil, sesuai pola 1-file-1-domain existing: `ac-service.ts`, `task-service.ts`, `prd-service.ts`).

**Baru — frontend:**
- `src/routes/ask/$id.tsx` — TanStack route.
- `src/app/ask/ask-flow.tsx` — orchestrator client component (2 sesi, state, submit).
- `src/app/ask/question-card.tsx` — 1 pertanyaan S1: pill options + "+ Lainnya" + skip.
- `src/app/ask/stack-dropdown.tsx` — 1 dropdown S2: pilihan + "Lainnya" + disabled state.

**Dimodifikasi:**
- `src/components/layout/chat-input.tsx` — `handleSend()`: create project dulu, push ke `/ask/${id}`.
- `src/components/auth/login-form.tsx` — default redirect.
- `src/components/prd/prd-detail.tsx` — `handleRetryGenerate`: redirect langsung `/prd/[id]`, hapus jalur `/setup`.
- `src/components/layout/app-layout.tsx` — `hideNavbarRoutes`.
- `src/components/layout/flow-step-nav.tsx` — step baru "question".
- `src/components/layout/navbar.tsx` — `isFlowStepRoute`.
- `src/lib/prompt-handoff.ts` — helper simpan platform (`saveAskPlatform`/`getAskPlatform`, minimal, reuse pola `getStorage()`).

### Kontrak endpoint `/api/ask/options`

Request: `POST { projectId: string, prompt: string, platform: "web" | "mobile", model?: string }`
Response sukses: `200 { questions: Array<{ id: string; question: string; options: string[] }> }`
Response gagal: `{ error: string }` dengan status 400/401/404/429/500 sesuai kondisi (pola identik `task/generate.ts` tapi tanpa SSE — auth 401 via `requireUser` throw, project not found 404, rate limit 429, parse gagal 500).

Auth: `requireUser(getRequestHeaders())`. Rate limit: `checkRateLimit(user.id, plan, "api_call")` — dipilih `"api_call"` (bukan `"ai_generate"`) karena ini bukan generate PRD/AC/Task yang kena quota utama, sama seperti pola task/generate.ts yang juga pakai `"api_call"` untuk cek rate-limit generik. **Tidak** kena PRD quota (tidak decrement `quotas.prdUsed`) — quota PRD baru kepotong pas generate PRD sungguhan di `/api/chat`.

### Kontrak `AskFlow` (state shape)

```ts
type NonTechAnswer = { value: string; isCustom: boolean; skipped: boolean };
type TechAnswers = {
  frontend?: string;
  backend?: string;
  fullstackFramework?: string;
  database?: string;
  deployment?: string;
};
```

Sesi 1 → `Record<string, NonTechAnswer>` keyed by `question.id` dari response API.
Sesi 2 → `TechAnswers`, tiap field `undefined` = belum diisi/di-skip.

### Alur compile-to-prompt (submit akhir)

Mirror persis pola `manual-setup-client.tsx` `compiledPrompt` template literal — bedanya sumber data dari 2 sesi bukan 1 form:

```ts
const compiledPrompt = `Tolong buatkan PRD dengan spesifikasi berikut:

${platformLabel}

--- Preferensi Non-Teknis ---
${nonTechLines.join("\n")}

--- Preferensi Teknis ---
Frontend: ${techAnswers.frontend || "Biarkan AI yang memilih"}
Backend: ${techAnswers.backend || "Biarkan AI yang memilih"}
Fullstack Framework: ${techAnswers.fullstackFramework || "Tidak dipakai / Biarkan AI yang memilih"}
Database: ${techAnswers.database || "Biarkan AI yang memilih"}
Deployment: ${techAnswers.deployment || "Biarkan AI yang memilih"}`;
```

`nonTechLines` = tiap pertanyaan S1 yang terjawab jadi baris `"- {question}: {value}"`, yang di-skip jadi `"- {question}: (Biarkan AI yang memilih)"`.

### Mutual-exclusion logic (S2)

State-driven, bukan validasi submit-time:
- `techAnswers.frontend` atau `techAnswers.backend` terisi (salah satu saja cukup) → `fullstackFramework` dropdown `disabled`.
- `techAnswers.fullstackFramework` terisi → `frontend` dan `backend` dropdown `disabled`.
- Field yang jadi penyebab disable dikosongkan lagi (`undefined`) → re-enable otomatis (derived dari state tiap render, bukan flag terpisah — tidak ada race).

```ts
const fullstackDisabled = Boolean(techAnswers.frontend || techAnswers.backend);
const feBeDisabled = Boolean(techAnswers.fullstackFramework);
```

### Opsi dropdown S2 (constants, hardcode boleh — ini bukan opsi AI-generated, beda dari S1)

```ts
const FRONTEND_WEB_OPTIONS = ["React (Vite)", "Next.js", "Vue.js", "Svelte", "Astro", "Native HTML/CSS/JS", "TanStack Start", "Nuxt", "Angular"];
const FRONTEND_MOBILE_OPTIONS = ["Flutter", "React Native", "Native iOS (Swift)", "Native Android (Kotlin)", "Expo"];
const BACKEND_OPTIONS = ["Express.js", "Fastify", "Go", "Python (FastAPI/Django)", "Supabase", "Insforge", "Convex", "Firebase"];
const FULLSTACK_FRAMEWORK_OPTIONS = ["Laravel Blade", "Laravel + React (Inertia)", "Laravel + Vue (Inertia)", "Next.js (FE+BE)", "Nuxt.js (FE+BE)", "TanStack Start (FE+BE)"];
const DATABASE_OPTIONS = ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "Neon", "Supabase Postgres"];
const DEPLOYMENT_OPTIONS = ["Vercel", "Docker/K8s (self-hosted)", "Coolify", "VPS Manual", "Railway", "Netlify", "GitHub Pages"];
```

`FRONTEND_*_OPTIONS` dipilih berdasar `platform` (`"web" | "mobile"`) yang dibawa dari home via sessionStorage baru `novaplan:ask-platform`.

---

## Fase 1 — Hapus total `/setup`

### Task 1.1: Hapus route & component files, update semua call-site referensi

**Files:**
- Delete: `src/routes/setup/index.tsx`
- Delete: `src/routes/setup/manual.tsx`
- Delete: `src/app/setup/setup-client.tsx`
- Delete: `src/app/setup/manual/manual-setup-client.tsx`
- Delete folder: `src/app/setup/manual/` (setelah file di atas dihapus, jika kosong)
- Delete folder: `src/app/setup/` (setelah semua di atas dihapus, jika kosong total)
- Modify: `src/components/layout/chat-input.tsx:139,143` (bagian ini di-superscede oleh Fase 4 — lihat Task 4.1, jangan dobel-edit di sini)
- Modify: `src/components/auth/login-form.tsx:25`
- Modify: `src/components/prd/prd-detail.tsx:190-196`
- Modify: `src/components/layout/app-layout.tsx:13`

**Interfaces:**
- Konsumsi: tidak ada (pure deletion + reference cleanup)
- Produce: codebase bebas total dari string `/setup` (kecuali `routeTree.gen.ts` auto-generated)

- [ ] **Step 1: Hapus 4 file + 2 folder**

```bash
rm src/routes/setup/index.tsx
rm src/routes/setup/manual.tsx
rm src/app/setup/setup-client.tsx
rm src/app/setup/manual/manual-setup-client.tsx
rmdir src/app/setup/manual
rmdir src/app/setup
```

- [ ] **Step 2: `src/components/auth/login-form.tsx` — ganti default redirect**

Baris 25, sebelum:
```ts
const redirectTo = searchParams.get("redirect") || "/setup";
```
Sesudah:
```ts
const redirectTo = searchParams.get("redirect") || "/";
```

Alasan: login dari navbar/general access (bukan dari home prompt flow) tidak lagi punya default tujuan `/setup`. Flow home-prompt punya redirect eksplisit sendiri di Fase 4 (`/login?redirect=/ask/${projectId}` — lihat Task 4.1), jadi default fallback `/` aman.

- [ ] **Step 3: `src/components/prd/prd-detail.tsx` — retry generate langsung ke `/prd/[id]`, bukan `/setup`**

Baris 185-196, sebelum:
```ts
const handleRetryGenerate = useCallback(async () => {
  sessionStorage.setItem("novaplan:selected-model", errorRetryModel);
  setGeneratingPRD(false);
  setStreamingPRDContent("");

  // Save as pending prompt so /setup page picks it up
  savePendingPrdPrompt(projectName || "Project Baru", "auto", projectName);

  startTransition(() => {
    router.push(`/setup`);
  });
}, [projectName, errorRetryModel, setGeneratingPRD, setStreamingPRDContent, router]);
```
Sesudah:
```ts
const handleRetryGenerate = useCallback(async () => {
  sessionStorage.setItem("novaplan:selected-model", errorRetryModel);
  setGeneratingPRD(false);
  setStreamingPRDContent("");

  // Save as pending prompt so ChatPanel's auto-submit effect picks it up directly
  savePendingPrdPrompt(projectName || "Project Baru", "auto", projectName);

  startTransition(() => {
    router.push(`/prd/${projectId}`);
  });
}, [projectName, projectId, errorRetryModel, setGeneratingPRD, setStreamingPRDContent, router]);
```

Catatan: ini FIX bug sekaligus — sebelumnya `savePendingPrdPrompt` menulis ke `PRD_PROMPT_KEY` lalu redirect ke `/setup`, padahal `/setup`'s `SetupClient` baca dari `SETUP_PROMPT_KEY` (`consumeSetupPrompt()`) — key berbeda, jadi retry lama sebenarnya tidak pernah benar-benar reconnect ke prompt yang baru disimpan (mengandalkan project sudah ada, `SetupClient` fallback redirect ke `/` jika `SETUP_PROMPT_KEY` kosong — retry lama kemungkinan besar redirect ke home, bukan retry sungguhan). Redirect langsung ke `/prd/${projectId}` benar karena `chat-panel.tsx` auto-submit `useEffect` (baris 651-672) baca `PRD_PROMPT_KEY` langsung via `consumePendingPrdPrompt()` — key yang sama persis dipakai `savePendingPrdPrompt` di atas.

`projectId` sudah ada sebagai prop `PrdDetailProps.projectId` (lihat `prd-detail.tsx:27`) — tambahkan ke dependency array `useCallback`.

- [ ] **Step 4: `src/components/layout/app-layout.tsx` — hapus `/setup` dari `hideNavbarRoutes`**

Baris 13, sebelum:
```ts
const hideNavbarRoutes = ["/login", "/auth/callback", "/prd", "/setup", "/onboarding", "/settings"];
```
Sesudah:
```ts
const hideNavbarRoutes = ["/login", "/auth/callback", "/prd", "/onboarding", "/settings"];
```

(`/ask` TIDAK ditambahkan ke `hideNavbarRoutes` — sebaliknya, `/ask` HARUS tampil navbar dengan step indicator baru "Question", lihat Fase 5.)

- [ ] **Step 5: Jalankan `npx tsc --noEmit`, pastikan tidak ada import error dari file yang dihapus**

Run: `npx tsc --noEmit`
Expected: tidak ada error `Cannot find module` yang mereferensikan `setup-client`, `manual-setup-client`, atau path `routes/setup/*`. (Task 4.1 di Fase 4 masih akan mengubah `chat-input.tsx` — errors terkait file itu baru akan clear setelah Fase 4 selesai; untuk Task 1.1 ini fokus hanya pastikan file yang DIHAPUS tidak lagi direferensikan di tempat SELAIN `chat-input.tsx`.)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: hapus route dan komponen /setup, redirect retry-PRD langsung ke /prd/[id]"
```

---

## Fase 2 — Backend: endpoint generate opsi jawaban AI

### Task 2.1: `src/lib/prompts-ask.ts` — system prompt

**Files:**
- Create: `src/lib/prompts-ask.ts`

**Interfaces:**
- Consumes: tidak ada
- Produces: `export const ASK_OPTIONS_GENERATION_PROMPT: string` — dikonsumsi Task 2.3 (`api/ask/options.ts`)

- [ ] **Step 1: Tulis prompt lengkap**

```ts
// Ask-flow question generation prompt for NovaPlan.
// Generates non-technical clarifying questions + short pill-style answer
// options, tailored to the user's initial prompt. Strict JSON output.

export const ASK_OPTIONS_GENERATION_PROMPT = `Kamu adalah NovaPlan AI, product discovery expert yang menyusun pertanyaan klarifikasi NON-TEKNIS untuk memahami kebutuhan produk sebelum PRD digenerate.

ATURAN KETAT (WAJIB DIIKUTI):
1. Generate 5-7 pertanyaan berbasis prompt awal user yang diberikan setelah instruksi ini.
2. Pertanyaan HARUS non-teknis: masalah yang ingin dipecahkan, target audiens, gaya/nuansa desain, fitur prioritas, model bisnis, skala pengguna, dll — JANGAN tanya soal stack teknis (itu sesi terpisah).
3. Tiap pertanyaan wajib punya 3-5 opsi jawaban singkat berupa "pill" (maks 4-5 kata per opsi, BUKAN kalimat panjang).
4. Opsi HARUS relevan dan spesifik terhadap prompt awal user — JANGAN generik yang bisa dipakai untuk semua produk.
5. Gunakan format JSON persis seperti ini, tanpa teks lain di luar JSON:

{
  "questions": [
    {
      "id": "snake_case_id_singkat",
      "question": "Pertanyaan lengkap dalam Bahasa Indonesia?",
      "options": ["Opsi singkat 1", "Opsi singkat 2", "Opsi singkat 3"]
    }
  ]
}

6. Field "id" harus unik per pertanyaan, snake_case, tanpa spasi.
7. JANGAN generate pertanyaan duplikat atau opsi duplikat dalam satu pertanyaan.

Prompt awal user akan diberikan setelah instruksi ini. Generate pertanyaan SEKARANG.`;
```

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS, no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/prompts-ask.ts
git commit -m "feat: tambah system prompt generate opsi pertanyaan ask-flow"
```

### Task 2.2: `src/lib/services/ask-service.ts` — parse + validate JSON

**Files:**
- Create: `src/lib/services/ask-service.ts`
- Test: manual via Task 2.3 endpoint (tidak ada test framework runner terpisah di proyek ini untuk service kecil — cukup 1 assert-based self-check, lihat Step 2)

**Interfaces:**
- Consumes: tidak ada
- Produces: `export interface AskQuestion { id: string; question: string; options: string[] }`, `export function parseAskOptionsJson(jsonString: string): AskQuestion[] | null` — dikonsumsi Task 2.3

- [ ] **Step 1: Tulis service**

```ts
/**
 * Ask-flow question parsing - mirrors task-service.ts's parseTaskJson
 * strict-validation pattern (reject malformed shape, no partial trust).
 */
export interface AskQuestion {
  id: string;
  question: string;
  options: string[];
}

export function parseAskOptionsJson(jsonString: string): AskQuestion[] | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;

    for (const q of parsed.questions) {
      if (!q.id || typeof q.id !== "string") return null;
      if (!q.question || typeof q.question !== "string") return null;
      if (!Array.isArray(q.options) || q.options.length === 0) return null;
      if (!q.options.every((o: unknown) => typeof o === "string")) return null;
    }

    return parsed.questions as AskQuestion[];
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Self-check (assert-based, no framework)**

Tambahkan di akhir file `src/lib/services/ask-service.ts` (dev-only sanity block — dijalankan manual via `node`/`tsx`, bukan bagian build):

```ts
// ponytail: manual self-check only (no test runner wired for this service yet).
// Run with: npx tsx src/lib/services/ask-service.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  const valid = parseAskOptionsJson(JSON.stringify({ questions: [{ id: "a", question: "Q?", options: ["X", "Y"] }] }));
  console.assert(valid !== null && valid.length === 1, "valid JSON should parse");

  const invalidNoOptions = parseAskOptionsJson(JSON.stringify({ questions: [{ id: "a", question: "Q?", options: [] }] }));
  console.assert(invalidNoOptions === null, "empty options should reject");

  const invalidShape = parseAskOptionsJson("not json");
  console.assert(invalidShape === null, "malformed JSON should reject");

  console.log("ask-service self-check passed");
}
```

Run: `npx tsx src/lib/services/ask-service.ts`
Expected output: `ask-service self-check passed` (no assertion failures printed to stderr)

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/services/ask-service.ts
git commit -m "feat: tambah parseAskOptionsJson dengan self-check"
```

### Task 2.3: `src/routes/api/ask/options.ts` — endpoint

**Files:**
- Create: `src/routes/api/ask/options.ts`

**Interfaces:**
- Consumes: `ASK_OPTIONS_GENERATION_PROMPT` (Task 2.1), `parseAskOptionsJson` (Task 2.2), `selectModels`/`tryStreamWithFallback` (`ai-orchestrator.ts`, existing), `checkRateLimit` (`rate-limit.ts`, existing), `requireUser` (`session.ts`, existing), `sanitizeErrorForClient` (`error-sanitizer.ts`, existing)
- Produces: `POST /api/ask/options` — `{questions: AskQuestion[]}` on success, `{error: string}` on failure — dikonsumsi Task 3.2 (`ask-flow.tsx`)

- [ ] **Step 1: Tulis handler (non-stream, reuse `extractJson` pattern dari `task/generate.ts`)**

```ts
import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions } from "@/db/schema";
import { ASK_OPTIONS_GENERATION_PROMPT } from "@/lib/prompts-ask";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { parseAskOptionsJson } from "@/lib/services/ask-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
}

export const Route = createFileRoute("/api/ask/options")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        let user: { id: string };
        try {
          user = await requireUser(getRequestHeaders());
        } catch {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json().catch(() => ({}));
        const { projectId, prompt, platform, model } = body as {
          projectId?: string;
          prompt?: string;
          platform?: string;
          model?: string;
        };
        if (!projectId) return Response.json({ error: "Project ID required" }, { status: 400 });
        if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
          return Response.json({ error: "Prompt required" }, { status: 400 });
        }

        const [sub] = await db.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1);
        const rawPlan = sub?.plan || "free";
        const plan: Plan = ["free", "pro", "hengker"].includes(rawPlan) ? (rawPlan as Plan) : "free";

        const rateCheck = await checkRateLimit(user.id, plan, "api_call");
        if (!rateCheck.allowed) return Response.json({ error: "Too many requests", retryAfter: 60 }, { status: 429 });

        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
        if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

        const platformLabel = platform === "mobile" ? "Mobile App" : "Web App";
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: ASK_OPTIONS_GENERATION_PROMPT },
          { role: "user", content: `Platform: ${platformLabel}\n\nPrompt awal:\n${prompt}` },
        ];

        const modelsToTry = selectModels(plan, model);

        try {
          const { generator, firstChunk } = await tryStreamWithFallback(modelsToTry, messages, request.signal, 8000);
          let fullResponse = firstChunk;
          for await (const chunk of generator) fullResponse += chunk;

          const questions = parseAskOptionsJson(extractJson(fullResponse));
          if (!questions) {
            return Response.json({ error: "AI menghasilkan JSON tidak valid. Coba lagi." }, { status: 500 });
          }

          return Response.json({ questions });
        } catch (err: unknown) {
          console.error("Ask options generate error:", err);
          return Response.json({ error: sanitizeErrorForClient(err) }, { status: 500 });
        }
      },
    },
  },
});
```

Catatan desain: non-stream (kumpulkan full response lalu parse sekali) karena payload pendek (5-7 pertanyaan pendek, jauh lebih kecil dari task tree) — SSE progressive-reveal tidak memberi nilai UX yang sepadan dengan kompleksitas tambahan. `maxTokens: 8000` cukup untuk 7 pertanyaan x 5 opsi pendek.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS.

- [ ] **Step 3: Manual smoke test via dev server (setelah Task 4.1 selesai supaya ada project asli untuk test) — tandai sebagai pending, verifikasi penuh di Fase 6**

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/ask/options.ts
git commit -m "feat: tambah endpoint POST /api/ask/options"
```

---

## Fase 3 — Frontend: route `/ask/[projectId]`

### Task 3.1: `src/routes/ask/$id.tsx` — route file

**Files:**
- Create: `src/routes/ask/$id.tsx`

**Interfaces:**
- Consumes: `requireUserServer` (`session.ts`, existing), `projects` table (`db/schema.ts`, existing)
- Produces: route `/ask/$id` yang render `AskFlow` (Task 3.2) dengan props `{projectId, projectName, initialPrompt}`

- [ ] **Step 1: Tulis route file (pola identik `routes/task/$id.tsx`)**

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { and, eq } from 'drizzle-orm'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { requireUserServer } from '@/lib/session'
import { AskFlow } from '@/app/ask/ask-flow'

// ponytail: server-only db logic - loader runs on client too, must not import db there.
const loadAsk = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await requireUserServer()
    const [project] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.userId, user.id))).limit(1)

    if (!project) throw new Error('NOT_FOUND')
    return {
      projectId: id,
      projectName: project.name,
    }
  })

export const Route = createFileRoute('/ask/$id')({
  loader: async ({ params }) => {
    try {
      return await loadAsk({ data: params.id })
    } catch (e) {
      if ((e as Error).message === 'Unauthorized') throw redirect({ to: '/login' })
      throw e
    }
  },
  head: ({ loaderData }) => ({ meta: [{ title: `${loaderData?.projectName ?? 'Pertanyaan'} - NovaPlan` }] }),
  component: AskPage,
  errorComponent: () => <div className="p-10 text-center text-fog">Proyek tidak ditemukan.</div>,
})

function AskPage() {
  const d = Route.useLoaderData()
  return <AskFlow projectId={d.projectId} projectName={d.projectName} />
}
```

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: error `Cannot find module '@/app/ask/ask-flow'` (belum dibuat) — normal, akan clear setelah Task 3.2.

- [ ] **Step 3: Commit (setelah Task 3.2 selesai, gabung 1 commit — lihat Task 3.2 Step akhir)**

### Task 3.2: `src/app/ask/ask-flow.tsx` — orchestrator 2 sesi

**Files:**
- Create: `src/app/ask/ask-flow.tsx`
- Create: `src/app/ask/question-card.tsx`
- Create: `src/app/ask/stack-dropdown.tsx`
- Modify: `src/lib/prompt-handoff.ts` (tambah `saveAskPlatform`/`getAskPlatform`)

**Interfaces:**
- Consumes: `POST /api/ask/options` (Task 2.3), `savePendingPrdPrompt` (`prompt-handoff.ts`, existing), `getAskPlatform` (baru, ini task), `DEFAULT_MODEL_ID` (`model-config.ts`, existing)
- Produces: `export function AskFlow({projectId, projectName}: {projectId: string; projectName: string})` — dikonsumsi Task 3.1

- [ ] **Step 1: `src/lib/prompt-handoff.ts` — tambah helper platform (minimal, reuse `getStorage()`)**

Tambahkan di akhir file (setelah `consumePendingPrdPrompt`):

```ts
const ASK_PLATFORM_KEY = "novaplan:ask-platform";

export function saveAskPlatform(platform: "web" | "mobile") {
  getStorage()?.setItem(ASK_PLATFORM_KEY, platform);
}

export function getAskPlatform(): "web" | "mobile" {
  return getStorage()?.getItem(ASK_PLATFORM_KEY) === "mobile" ? "mobile" : "web";
}
```

- [ ] **Step 2: `src/app/ask/question-card.tsx` — 1 pertanyaan S1**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface NonTechAnswer {
  value: string;
  isCustom: boolean;
  skipped: boolean;
}

interface QuestionCardProps {
  question: string;
  options: string[];
  answer: NonTechAnswer | undefined;
  onAnswer: (answer: NonTechAnswer) => void;
}

export function QuestionCard({ question, options, answer, onAnswer }: QuestionCardProps) {
  const [customText, setCustomText] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  return (
    <div className="rounded-2xl border border-(--border-subtle) p-6 shadow-(--shadow-surface)" style={{ background: "var(--bg-card)" }}>
      <h3 className="font-inter text-base font-[510] mb-4" style={{ color: "var(--text-primary)" }}>
        {question}
      </h3>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              setShowCustomInput(false);
              onAnswer({ value: opt, isCustom: false, skipped: false });
            }}
            className={cn(
              "rounded-full px-4 py-2 font-inter text-sm transition-colors",
              answer?.value === opt && !answer.isCustom
                ? "btn-primary"
                : "border border-(--border-subtle) text-fog hover:text-snow hover:bg-white/5"
            )}
          >
            {opt}
          </button>
        ))}
        <button
          onClick={() => setShowCustomInput(true)}
          className={cn(
            "rounded-full border border-dashed border-(--border-subtle) px-4 py-2 font-inter text-sm transition-colors",
            answer?.isCustom ? "btn-primary border-solid" : "text-fog hover:text-snow hover:bg-white/5"
          )}
        >
          + Lainnya
        </button>
        <button
          onClick={() => onAnswer({ value: "", isCustom: false, skipped: true })}
          className={cn(
            "rounded-full px-4 py-2 font-inter text-sm transition-colors",
            answer?.skipped ? "bg-steel text-snow" : "text-fog hover:text-snow"
          )}
        >
          Biarkan AI yang memilih
        </button>
      </div>
      {showCustomInput && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Tulis jawabanmu..."
            className="flex-1 rounded-lg border border-(--border-subtle) px-3 py-2 font-inter text-sm outline-none shadow-(--shadow-inset)"
            style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
          />
          <button
            onClick={() => {
              if (!customText.trim()) return;
              onAnswer({ value: customText.trim(), isCustom: true, skipped: false });
              setShowCustomInput(false);
            }}
            className="btn-primary rounded-lg px-4 py-2 font-inter text-sm font-[510]"
          >
            Simpan
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: `src/app/ask/stack-dropdown.tsx` — 1 dropdown S2**

```tsx
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface StackDropdownProps {
  label: string;
  options: string[];
  value: string | undefined;
  disabled: boolean;
  onChange: (value: string | undefined) => void;
}

export function StackDropdown({ label, options, value, disabled, onChange }: StackDropdownProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customText, setCustomText] = useState("");

  const isCustomValue = Boolean(value) && !options.includes(value ?? "");

  return (
    <div className={cn("space-y-2", disabled && "opacity-40")}>
      <label className="block font-inter text-sm font-[510]" style={{ color: "var(--text-primary)" }}>
        {label}
      </label>
      <select
        disabled={disabled}
        value={showCustomInput || isCustomValue ? "__custom__" : value ?? ""}
        onChange={(e) => {
          if (e.target.value === "__custom__") {
            setShowCustomInput(true);
            return;
          }
          setShowCustomInput(false);
          onChange(e.target.value || undefined);
        }}
        className="w-full rounded-lg border border-(--border-subtle) px-4 py-3 font-inter text-sm outline-none transition-all focus:border-(--text-secondary) appearance-none shadow-(--shadow-inset) disabled:cursor-not-allowed"
        style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
      >
        <option value="">Biarkan AI yang memilih</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
        <option value="__custom__">Lainnya...</option>
      </select>
      {(showCustomInput || isCustomValue) && (
        <input
          type="text"
          disabled={disabled}
          defaultValue={isCustomValue ? value : ""}
          onChange={(e) => setCustomText(e.target.value)}
          onBlur={() => customText.trim() && onChange(customText.trim())}
          placeholder="Tulis pilihanmu..."
          className="w-full rounded-lg border border-(--border-subtle) px-4 py-3 font-inter text-sm outline-none shadow-(--shadow-inset)"
          style={{ background: "var(--bg-input)", color: "var(--text-primary)" }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: `src/app/ask/ask-flow.tsx` — orchestrator utama**

```tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSetupPrompt } from "@/lib/prompt-handoff";
import { savePendingPrdPrompt, getAskPlatform } from "@/lib/prompt-handoff";
import { QuestionCard, type NonTechAnswer } from "./question-card";
import { StackDropdown } from "./stack-dropdown";

const FRONTEND_WEB_OPTIONS = ["React (Vite)", "Next.js", "Vue.js", "Svelte", "Astro", "Native HTML/CSS/JS", "TanStack Start", "Nuxt", "Angular"];
const FRONTEND_MOBILE_OPTIONS = ["Flutter", "React Native", "Native iOS (Swift)", "Native Android (Kotlin)", "Expo"];
const BACKEND_OPTIONS = ["Express.js", "Fastify", "Go", "Python (FastAPI/Django)", "Supabase", "Insforge", "Convex", "Firebase"];
const FULLSTACK_FRAMEWORK_OPTIONS = ["Laravel Blade", "Laravel + React (Inertia)", "Laravel + Vue (Inertia)", "Next.js (FE+BE)", "Nuxt.js (FE+BE)", "TanStack Start (FE+BE)"];
const DATABASE_OPTIONS = ["PostgreSQL", "MySQL", "SQLite", "MongoDB", "Neon", "Supabase Postgres"];
const DEPLOYMENT_OPTIONS = ["Vercel", "Docker/K8s (self-hosted)", "Coolify", "VPS Manual", "Railway", "Netlify", "GitHub Pages"];

interface AskQuestion {
  id: string;
  question: string;
  options: string[];
}

interface TechAnswers {
  frontend?: string;
  backend?: string;
  fullstackFramework?: string;
  database?: string;
  deployment?: string;
}

interface AskFlowProps {
  projectId: string;
  projectName: string;
}

export function AskFlow({ projectId, projectName }: AskFlowProps) {
  const router = useRouter();
  const promptRef = useRef("");
  const [session, setSession] = useState<1 | 2>(1);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [questions, setQuestions] = useState<AskQuestion[]>([]);
  const [nonTechAnswers, setNonTechAnswers] = useState<Record<string, NonTechAnswer>>({});
  const [techAnswers, setTechAnswers] = useState<TechAnswers>({});
  const hasFetched = useRef(false);

  const platform = getAskPlatform();

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    const prompt = getSetupPrompt();
    if (!prompt) {
      router.replace("/");
      return;
    }
    promptRef.current = prompt;

    const fetchOptions = async () => {
      try {
        const res = await fetch("/api/ask/options", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            prompt,
            platform,
            model: sessionStorage.getItem("novaplan:selected-model") || undefined,
          }),
        });
        if (!res.ok) throw new Error("Gagal memuat pertanyaan");
        const data = await res.json();
        setQuestions(data.questions);
      } catch (err) {
        console.error("Fetch ask options error:", err);
        setLoadError(true);
      } finally {
        setIsLoadingQuestions(false);
      }
    };
    fetchOptions();
  }, [projectId, platform, router]);

  const fullstackDisabled = Boolean(techAnswers.frontend || techAnswers.backend);
  const feBeDisabled = Boolean(techAnswers.fullstackFramework);
  const frontendOptions = platform === "mobile" ? FRONTEND_MOBILE_OPTIONS : FRONTEND_WEB_OPTIONS;

  const answeredCount = Object.values(nonTechAnswers).filter((a) => a.value || a.skipped).length;

  const handleSubmit = async () => {
    const nonTechLines = questions.map((q) => {
      const a = nonTechAnswers[q.id];
      if (!a || (!a.value && !a.skipped)) return `- ${q.question}: (Biarkan AI yang memilih)`;
      if (a.skipped) return `- ${q.question}: (Biarkan AI yang memilih)`;
      return `- ${q.question}: ${a.value}`;
    });

    const platformLabel = platform === "mobile" ? "Mobile App" : "Web App";
    const compiledPrompt = `Tolong buatkan PRD dengan spesifikasi berikut:

[Platform: ${platformLabel}]
${promptRef.current}

--- Preferensi Non-Teknis ---
${nonTechLines.join("\n")}

--- Preferensi Teknis ---
Frontend: ${techAnswers.frontend || "Biarkan AI yang memilih"}
Backend: ${techAnswers.backend || "Biarkan AI yang memilih"}
Fullstack Framework: ${techAnswers.fullstackFramework || "Tidak dipakai / Biarkan AI yang memilih"}
Database: ${techAnswers.database || "Biarkan AI yang memilih"}
Deployment: ${techAnswers.deployment || "Biarkan AI yang memilih"}`;

    savePendingPrdPrompt(compiledPrompt, "auto", projectName);
    router.push(`/prd/${projectId}`);
  };

  const handleAiChoosesAll = () => {
    setTechAnswers({});
    handleSubmit();
  };

  if (isLoadingQuestions) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="font-inter text-fog animate-pulse">Menyusun pertanyaan...</div>
      </div>
    );
  }

  if (loadError || questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
        <p className="text-fog">Gagal memuat pertanyaan.</p>
        <button onClick={() => router.push("/")} className="btn-primary rounded-md px-4 py-2 text-sm">
          Kembali ke Home
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-16">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-inter text-2xl font-[510]" style={{ color: "var(--text-primary)" }}>
          {session === 1 ? "Ceritakan lebih lanjut" : "Preferensi Teknis"}
        </h1>
        {session === 1 && (
          <span className="font-inter text-sm text-fog">
            {answeredCount}/{questions.length}
          </span>
        )}
      </div>

      {session === 1 ? (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q.question}
              options={q.options}
              answer={nonTechAnswers[q.id]}
              onAnswer={(answer) => setNonTechAnswers((prev) => ({ ...prev, [q.id]: answer }))}
            />
          ))}
          <div className="flex justify-end pt-4">
            <button
              onClick={() => setSession(2)}
              className="btn-primary rounded-md px-6 py-2.5 font-inter text-sm font-[510]"
            >
              Lanjut
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <StackDropdown label="Frontend" options={frontendOptions} value={techAnswers.frontend} disabled={feBeDisabled} onChange={(v) => setTechAnswers((prev) => ({ ...prev, frontend: v }))} />
            <StackDropdown label="Backend" options={BACKEND_OPTIONS} value={techAnswers.backend} disabled={feBeDisabled} onChange={(v) => setTechAnswers((prev) => ({ ...prev, backend: v }))} />
            <StackDropdown label="Fullstack Framework" options={FULLSTACK_FRAMEWORK_OPTIONS} value={techAnswers.fullstackFramework} disabled={fullstackDisabled} onChange={(v) => setTechAnswers((prev) => ({ ...prev, fullstackFramework: v }))} />
            <StackDropdown label="Database" options={DATABASE_OPTIONS} value={techAnswers.database} disabled={false} onChange={(v) => setTechAnswers((prev) => ({ ...prev, database: v }))} />
            <StackDropdown label="Deployment" options={DEPLOYMENT_OPTIONS} value={techAnswers.deployment} disabled={false} onChange={(v) => setTechAnswers((prev) => ({ ...prev, deployment: v }))} />
          </div>

          <div className="flex items-center justify-between border-t border-(--border-subtle) pt-6">
            <button onClick={() => setSession(1)} className="font-inter text-sm text-fog hover:text-snow">
              Kembali
            </button>
            <div className="flex gap-3">
              <button onClick={handleAiChoosesAll} className="rounded-md border border-(--border-subtle) px-4 py-2.5 font-inter text-sm font-[510] text-fog hover:text-snow">
                Biarkan AI yang memilih semua
              </button>
              <button onClick={handleSubmit} className="btn-primary rounded-md px-6 py-2.5 font-inter text-sm font-[510]">
                Generate PRD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

Catatan: `getSetupPrompt()` (read-only, bukan `consumeSetupPrompt()`) dipakai supaya refresh halaman S1↔S2 tidak menghilangkan prompt awal — konsisten dengan komentar existing di `prompt-handoff.ts` (`getSetupPrompt` "does NOT consume it"). TTL 5 menit (`SETUP_PROMPT_MAX_AGE_MS`) tetap berlaku — kalau user diam >5 menit sebelum submit, prompt akan dianggap expired dan redirect ke `/`; ini prilaku existing yang di-inherit, bukan regresi baru.

- [ ] **Step 5: `npx tsc --noEmit`**

Expected: PASS, tidak ada error di `ask-flow.tsx`, `question-card.tsx`, `stack-dropdown.tsx`, `routes/ask/$id.tsx`.

- [ ] **Step 6: Commit (gabung Task 3.1 + 3.2)**

```bash
git add src/routes/ask/ src/app/ask/ src/lib/prompt-handoff.ts
git commit -m "feat: tambah route /ask/[id] dengan alur 2 sesi tanya-jawab"
```

---

## Fase 4 — Wiring dari Home

### Task 4.1: `chat-input.tsx` — create project lalu push ke `/ask/[id]`

**Files:**
- Modify: `src/components/layout/chat-input.tsx:110-144`

**Interfaces:**
- Consumes: `POST /api/projects` (existing, `routes/api/projects/index.ts`), `saveAskPlatform` (Task 3.2)
- Produces: navigasi ke `/ask/${project.id}` menggantikan `/setup`

- [ ] **Step 1: Ganti `handleSend()`**

Baris 110-144, sebelum:
```ts
  const handleSend = async () => {
    if (!message.trim()) return;

    if (message.trim().length < MIN_PROMPT_LENGTH) {
      setPromptError(`Deskripsikan produkmu lebih detail (minimal ${MIN_PROMPT_LENGTH} karakter) agar AI bisa menghasilkan PRD yang berkualitas.`);
      return;
    }
    setPromptError("");

    // Store model & platform preference alongside the prompt
    const originalMessage = message.trim();
    const enrichedPrompt = isMobileMode
      ? `[Platform: Mobile App]\n${originalMessage}`
      : `[Platform: Web App]\n${originalMessage}`;

    saveSetupPrompt(enrichedPrompt);
    // Save original message for display in chat bubble (without platform tags)
    sessionStorage.setItem("novaplan:original-message", originalMessage);
    sessionStorage.setItem("novaplan:selected-model", selectedModel);

    let isAuthenticated = false;
    try {
      const { data: authData } = await authClient.getSession();
      isAuthenticated = !!authData?.user?.id;
    } catch {
      isAuthenticated = false;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/setup")}`);
      return;
    }

    router.push("/setup");
  };
```
Sesudah:
```ts
  const handleSend = async () => {
    if (!message.trim()) return;

    if (message.trim().length < MIN_PROMPT_LENGTH) {
      setPromptError(`Deskripsikan produkmu lebih detail (minimal ${MIN_PROMPT_LENGTH} karakter) agar AI bisa menghasilkan PRD yang berkualitas.`);
      return;
    }
    setPromptError("");

    // Store model & platform preference alongside the prompt
    const originalMessage = message.trim();
    const enrichedPrompt = isMobileMode
      ? `[Platform: Mobile App]\n${originalMessage}`
      : `[Platform: Web App]\n${originalMessage}`;

    saveSetupPrompt(enrichedPrompt);
    saveAskPlatform(isMobileMode ? "mobile" : "web");
    // Save original message for display in chat bubble (without platform tags)
    sessionStorage.setItem("novaplan:original-message", originalMessage);
    sessionStorage.setItem("novaplan:selected-model", selectedModel);

    let isAuthenticated = false;
    try {
      const { data: authData } = await authClient.getSession();
      isAuthenticated = !!authData?.user?.id;
    } catch {
      isAuthenticated = false;
    }

    if (!isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent("/ask")}`);
      return;
    }

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: enrichedPrompt }),
      });
      if (!res.ok) throw new Error("Gagal membuat proyek");
      const project = await res.json();
      router.push(`/ask/${project.id}`);
    } catch (err) {
      console.error("Create project error:", err);
      setPromptError("Gagal membuat proyek. Coba lagi.");
    }
  };
```

- [ ] **Step 2: Update import di puncak file**

Baris 7, sebelum:
```ts
import { saveSetupPrompt } from "@/lib/prompt-handoff";
```
Sesudah:
```ts
import { saveSetupPrompt, saveAskPlatform } from "@/lib/prompt-handoff";
```

Catatan: `router.push(\`/login?redirect=${encodeURIComponent("/ask")}\`)` sengaja redirect ke `/ask` (bukan `/ask/${projectId}`) karena project belum dibuat saat user belum login — setelah login, user perlu submit prompt lagi (behavior sama dengan flow lama yang juga redirect ke `/setup` generik, bukan project spesifik, karena project juga belum ada di titik itu).

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: PASS — ini menghapus error `Cannot find module` yang tersisa dari Task 1.1 Step 5.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/chat-input.tsx
git commit -m "feat: home prompt buat project lalu redirect ke /ask/[id]"
```

---

## Fase 5 — Navbar step nav

### Task 5.1: `flow-step-nav.tsx` — step "Question" baru

**Files:**
- Modify: `src/components/layout/flow-step-nav.tsx`

**Interfaces:**
- Consumes: tidak ada baru
- Produces: `FlowStep` union bertambah `"question"`, `routeToStep()` route `/ask/*` → `"question"` — dikonsumsi `navbar.tsx` (Task 5.2)

- [ ] **Step 1: Ganti `FlowStep` union + `STEPS` + `routeToStep`**

Baris 13-26, sebelum:
```ts
export type FlowStep = "prd" | "ac" | "task";

const STEPS: { key: FlowStep; label: string }[] = [
  { key: "prd", label: "PRD" },
  { key: "ac", label: "AC" },
  { key: "task", label: "Task" },
];

export function routeToStep(pathname: string): FlowStep {
  if (pathname.startsWith("/ac/") || pathname === "/ac") return "ac";
  if (pathname.startsWith("/task/") || pathname === "/task") return "task";
  if (pathname.startsWith("/kanban/") || pathname === "/kanban") return "task";
  return "prd";
}
```
Sesudah:
```ts
export type FlowStep = "question" | "prd" | "ac" | "task";

const STEPS: { key: FlowStep; label: string }[] = [
  { key: "question", label: "Question" },
  { key: "prd", label: "PRD" },
  { key: "ac", label: "AC" },
  { key: "task", label: "Task" },
];

export function routeToStep(pathname: string): FlowStep {
  if (pathname.startsWith("/ask/") || pathname === "/ask") return "question";
  if (pathname.startsWith("/ac/") || pathname === "/ac") return "ac";
  if (pathname.startsWith("/task/") || pathname === "/task") return "task";
  if (pathname.startsWith("/kanban/") || pathname === "/kanban") return "task";
  return "prd";
}
```

Catatan: fallback tetap `"prd"` untuk semua route lain (termasuk `/prd/*`) — behavior existing tidak berubah untuk step selain question.

- [ ] **Step 2: `npx tsc --noEmit`**

Expected: PASS.

- [ ] **Step 3: Commit (gabung dengan Task 5.2)**

### Task 5.2: `navbar.tsx` + `app-layout.tsx` — deteksi route `/ask/`

**Files:**
- Modify: `src/components/layout/navbar.tsx:28`
- Modify: `src/components/layout/app-layout.tsx:17-20`

**Interfaces:**
- Consumes: `routeToStep` (Task 5.1)
- Produces: navbar tampil `FlowStepNav` di `/ask/*`, body-scroll-lock aktif di `/ask/*` (workspace behavior, konsisten dengan PRD/AC/Task/Kanban)

- [ ] **Step 1: `navbar.tsx` — tambah `/ask/` ke `isFlowStepRoute`**

Baris 28, sebelum:
```ts
  const isFlowStepRoute = pathname.startsWith("/prd/") || pathname.startsWith("/ac/") || pathname.startsWith("/task/") || pathname.startsWith("/kanban/");
```
Sesudah:
```ts
  const isFlowStepRoute = pathname.startsWith("/ask/") || pathname.startsWith("/prd/") || pathname.startsWith("/ac/") || pathname.startsWith("/task/") || pathname.startsWith("/kanban/");
```

Catatan: right-side action buttons (`step === "prd"` → tombol "Generate AC", `step === "ac"` → tombol "Generate Task") TIDAK butuh entri baru untuk `step === "question"` — next/previous button untuk sesi 1/2 sudah built-in di dalam `AskFlow` component sendiri (lihat Task 3.2 Step 4, tombol "Lanjut"/"Kembali"/"Generate PRD"), bukan tanggung jawab navbar. Kondisi existing (`step === "prd"`, `step === "ac"`) otomatis tidak match saat `step === "question"`, jadi navbar kanan kosong di halaman ask — ini benar, tidak perlu else-branch tambahan.

- [ ] **Step 2: `app-layout.tsx` — tambah `/ask/` ke workspace body-scroll-lock**

Baris 17-20, sebelum:
```ts
  const isWorkspace = (pathname.startsWith("/prd/") && !pathname.startsWith("/prd/share/"))
    || pathname.startsWith("/ac/")
    || pathname.startsWith("/task/")
    || pathname.startsWith("/kanban/");
```
Sesudah:
```ts
  const isWorkspace = pathname.startsWith("/ask/")
    || (pathname.startsWith("/prd/") && !pathname.startsWith("/prd/share/"))
    || pathname.startsWith("/ac/")
    || pathname.startsWith("/task/")
    || pathname.startsWith("/kanban/");
```

- [ ] **Step 3: `npx tsc --noEmit`**

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/flow-step-nav.tsx src/components/layout/navbar.tsx src/components/layout/app-layout.tsx
git commit -m "feat: tambah step navbar Question untuk /ask/[id]"
```

---

## Fase 6 — Verifikasi

- [ ] `npx tsc --noEmit` bersih setelah tiap fase (bukan cuma di akhir) — sudah tercakup sebagai Step di tiap Task di atas.
- [ ] Grep akhir pastikan `/setup` 0 sisa referensi di `src/` (kecuali `routeTree.gen.ts` yang regenerate sendiri):

Run: `grep -rn '"/setup"' src/ --include='*.ts' --include='*.tsx' | grep -v routeTree.gen.ts`
Expected: no output (0 matches)

- [ ] Dev server: full flow manual — home prompt → `/ask/[id]` sesi 1 (test skip, lainnya, pill select) → sesi 2 (test mutual-exclusion dua arah, mobile vs web frontend list, lainnya, biarkan AI pilih) → submit → cek PRD ke-generate mengandung konteks jawaban → lanjut AC → Task → cek navbar 4 step + checkmark jalan.
- [ ] Cek regenerate-PRD link dari `prd-detail.tsx` masih jalan (tidak nyasar ke `/ask` kalau memang harusnya tidak) — sudah dipastikan di Task 1.1 Step 3: redirect langsung `/prd/[id]`, tidak lewat `/ask` maupun `/setup`.
- [ ] Jalankan dev server sebentar / build agar `routeTree.gen.ts` regenerate tanpa entri `/setup` dan dengan entri `/ask/$id` baru:

Run: `pnpm generate-routes` (atau biarkan `pnpm dev` auto-regenerate saat file route baru terdeteksi)
Expected: `src/routeTree.gen.ts` tidak lagi memuat string `/setup`, memuat entri baru untuk `/ask/$id`.

---

## Yang TIDAK berubah

- `chat-panel.tsx` auto-submit `useEffect` — reuse apa adanya.
- `/api/chat` endpoint — tidak diubah, Q&A masuk lewat compiled prompt text.
- DB schema — tidak ada migration baru (kecuali nanti ternyata perlu simpan raw Q&A, saat itu baru tambah kolom jsonb di `projects`, bukan sekarang).
- `task-service.ts`, diagram, kanban — tidak tersentuh.
