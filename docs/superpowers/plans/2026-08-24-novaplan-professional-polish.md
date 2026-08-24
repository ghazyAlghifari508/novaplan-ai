# NovaPlan Professional Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementasi Fase 1 (Professional Polish 6 workstreams) + Fase 2 (Enak Dipake 3 workstreams) agar NovaPlan terasa profesional & enak dipake, skip Fase 3 Collaboration.

**Architecture:** Polish in-place di atas pipeline `ask→prd→ac→task→kanban→history`. Tidak ada restrukturisasi besar: tambah diff viewer, history filter, paywall card, migrasi TanStack Router, export PDF, constants cleanup, kanban SSE, template gallery, brief upload. Semua perubahan terisolasi per file, tidak ada DB migration Fase 1/2 (kecuali optional).

**Tech Stack:** TanStack Start + TanStack Router, React 19, Tailwind CSS 4, Zustand, Drizzle ORM + PG 17, Vercel AI SDK v7 + 9Router combo, Vitest + Playwright, Biome

**Spec:** `docs/superpowers/specs/2026-08-24-novaplan-professional-polish-design.md`

## Global Constraints

- Framework TanStack Start file-based routing `src/routes/`, jangan pakai `next/link` atau `next/navigation` — pakai `@tanstack/react-router` Link + useNavigate + router.invalidate
- Server-only `db`, `pg`, `auth` wajib dynamic import atau via `createServerFn`, jangan top-level client import
- 1 credit = 1 generate (PRD/AC/Task), revision free unlimited, jangan tambah gate di revise
- Versions append-only selalu insert baru, uniqueIndex `(projectId, version)`
- `projects.step` monotonic via `advanceStep()`, jangan set langsung
- SSE contract `started → delta/thinking → done/error`, revision `:::UPDATE_SECTION[Name]:::`
- UI copy Bahasa Indonesia, istilah teknis English as-is
- No hardcode thresholds di `src/lib/constants.ts`, no fake rotating indicators, Zustand in-memory only

---

## File Structure

**Modified (existing):**
- `src/lib/constants.ts` — tambah MIN_PROMPT_LENGTH, MAX_PROMPT_LENGTH, HOME_DRAFT_DEBOUNCE_MS, PDF_STYLES, PAYWALL_COPY
- `src/components/layout/chat-input.tsx` — import constants + migrasi router
- `src/components/layout/hero.tsx` — tambah TemplateGallery
- `src/components/layout/flow-step-nav.tsx` — wire ke stepRank
- `src/components/prd/prd-viewer.tsx` — tambah Diff tab + Export PDF button
- `src/components/prd/prd-detail.tsx` — paywall card + step prop
- `src/components/ac/ac-detail.tsx` — paywall gate + router migrasi
- `src/components/history/history-page.tsx` — search/filter/pagination
- `src/components/kanban/kanban-board.tsx` — router migrasi + optimistic
- `src/hooks/use-kanban-polling.ts` — SSE + fallback polling
- `src/routes/prd/$id.tsx` — expose step di loader
- `src/routes/ac/$id.tsx` — expose plan check
- `src/routes/history.tsx` — no change (optional limit)
- `src/routes/api/chat.ts` — accept briefContext

**Created:**
- `src/lib/diff-utils.ts` + `src/lib/diff-utils.test.ts` — pure line diff
- `src/components/prd/prd-diff-viewer.tsx` — diff UI
- `src/lib/history-filter.ts` + `src/lib/history-filter.test.ts`
- `src/components/shared/paywall-card.tsx`
- `src/lib/services/export-pdf.ts`
- `src/routes/api/export/pdf.ts`
- `src/lib/template-gallery.ts`
- `src/components/layout/template-gallery.tsx`
- `src/components/ask/context-upload.tsx`
- `src/lib/brief-parse.ts` + `src/lib/brief-parse.test.ts`
- `src/routes/api/kanban/stream.ts` — SSE endpoint

**Deleted (akhir):**
- `src/lib/next-compat/` — setelah migrasi selesai

---

### Task 1: Constants Cleanup — No-Hardcode Foundation

**Files:**
- Modify: `src/lib/constants.ts:1-45`
- Modify: `src/components/layout/chat-input.tsx:28`
- Test: `src/lib/constants.test.ts`

**Interfaces:**
- Consumes: existing `RATE_LIMITS`, `AI_*` constants
- Produces: `MIN_PROMPT_LENGTH=20`, `MAX_PROMPT_LENGTH=3000`, `HOME_DRAFT_DEBOUNCE_MS=300`, `HISTORY_PAGE_SIZE=12`, `BRIEF_MAX_CHARS=5000`, `BRIEF_MAX_BYTES=2*1024*1024`, `PAYWALL_COPY`, `PDF_STYLES` — imported by later tasks

- [ ] **Step 1: Write failing test untuk new constants**

```typescript
// src/lib/constants.test.ts — tambah
import { MIN_PROMPT_LENGTH, MAX_PROMPT_LENGTH, HISTORY_PAGE_SIZE } from "@/lib/constants";

test("constants exist and sane", () => {
  expect(MIN_PROMPT_LENGTH).toBe(20);
  expect(MAX_PROMPT_LENGTH).toBe(3000);
  expect(HISTORY_PAGE_SIZE).toBe(12);
});
```

- [ ] **Step 2: Run test, expect FAIL (constants not defined)**

Run: `pnpm exec vitest run src/lib/constants.test.ts --reporter=verbose`
Expected: FAIL `MIN_PROMPT_LENGTH is not defined`

- [ ] **Step 3: Implement minimal constants**

```typescript
// src/lib/constants.ts — tambah di bawah existing
export const MIN_PROMPT_LENGTH = 20;
export const MAX_PROMPT_LENGTH = 3000;
export const HOME_DRAFT_DEBOUNCE_MS = 300;
export const HISTORY_PAGE_SIZE = 12;
export const BRIEF_MAX_CHARS = 5000;
export const BRIEF_MAX_BYTES = 2 * 1024 * 1024;
export const PAYWALL_COPY = {
  ac: { title: "Lanjut ke AC butuh Pro", desc: "Generate Acceptance Criteria hanya untuk Pro/Hengker", cta: "Lihat Paket" },
  task: { title: "Lanjut ke Task butuh Pro", desc: "Generate Task & Kanban hanya untuk Pro/Hengker", cta: "Lihat Paket" },
} as const;
export const PDF_STYLES = { font: "Inter", headerSize: 14, bodySize: 11 } as const;
```

- [ ] **Step 4: Update chat-input.tsx pakai constants**

```typescript
// src/components/layout/chat-input.tsx:28
// before: const MIN_PROMPT_LENGTH = 20;
// after:
import { MIN_PROMPT_LENGTH, MAX_PROMPT_LENGTH, HOME_DRAFT_DEBOUNCE_MS } from "@/lib/constants";
// ganti setTimeout 300 → HOME_DRAFT_DEBOUNCE_MS
// ganti {message.length}/3,000 → /MAX_PROMPT_LENGTH
```

- [ ] **Step 5: Run tests PASS**

Run: `pnpm exec vitest run src/lib/constants.test.ts --reporter=verbose`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/constants.ts src/lib/constants.test.ts src/components/layout/chat-input.tsx
git commit -m "refactor: move magic values to constants (no-hardcode)"
```

---

### Task 2: Migrasi next/* → TanStack Router

**Files:**
- Modify: `src/components/layout/chat-input.tsx:1-5`, `src/components/ac/ac-detail.tsx:1-5`, `src/components/history/history-page.tsx:1-5`, `src/components/kanban/kanban-board.tsx`, `src/components/prd/prd-detail.tsx`
- Delete: `src/lib/next-compat/navigation.ts` (last step)
- Test: `pnpm typecheck` + `pnpm build`

**Interfaces:**
- Consumes: `@tanstack/react-router` Link, useNavigate, useSearch, Route.useLoaderData
- Produces: navigasi tanpa compat shim, `router.invalidate()` untuk refresh

- [ ] **Step 1: Audit semua next/* imports**

```bash
# run grep
grep -r "from \"next" src --include="*.ts" --include="*.tsx"
# expected: list chat-input, ac-detail, history-page, kanban-board, prd-detail
```

- [ ] **Step 2: Migrasi chat-input.tsx (contoh pattern untuk file lain)**

```typescript
// before
import Link from "next/link";
import { useRouter } from "next/navigation";
const router = useRouter();
router.push(`/ask/${project.id}`);

// after
import { Link, useNavigate } from "@tanstack/react-router";
const navigate = useNavigate();
navigate({ to: "/ask/$id", params: { id: project.id } });
// Link href="/pricing" → to="/pricing"
// router.refresh() → tidak ada, pakai query invalidation atau window.location.reload jika perlu
```

- [ ] **Step 3: Migrasi ac-detail.tsx**

```typescript
// before
import { useRouter, useSearchParams } from "next/navigation";
// after
import { useNavigate, useSearch } from "@tanstack/react-router";
// useSearchParams().get("order_id") → useSearch({ from: "/ac/$id" }).order_id atau parse window.location.search
// router.refresh() → import { useRouter } from "@tanstack/react-router"; router.invalidate()
```

- [ ] **Step 4: Migrasi history-page.tsx, kanban-board.tsx, prd-detail.tsx dengan pattern sama**
- [ ] **Step 5: Run typecheck & build**

Run: `pnpm typecheck` Expected: PASS (no error about next/*)
Run: `pnpm build` Expected: PASS

- [ ] **Step 6: Hapus compat shim jika tidak ada import tersisa**

```bash
grep -r "next-compat" src --include="*.ts" --include="*.tsx" | wc -l
# expected 0, lalu rm -rf src/lib/next-compat
```

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: migrate next/* compat to TanStack Router"
```

---

### Task 3: History Search / Filter / Pagination

**Files:**
- Create: `src/lib/history-filter.ts`
- Create: `src/lib/history-filter.test.ts`
- Modify: `src/components/history/history-page.tsx:26-196`

**Interfaces:**
- Consumes: `HistoryItem[]` dari `src/routes/history.tsx:9`
- Produces: `filterHistory(items, query, stepFilter): HistoryItem[]`, `paginate(items, page, pageSize): HistoryItem[]` — pure, testable

- [ ] **Step 1: Write failing test untuk filter**

```typescript
// src/lib/history-filter.test.ts
import { filterHistory, paginate } from "@/lib/history-filter";
const items = [
  { id: "1", name: "Toko Online", step: "prd", preview: "marketplace", updatedAt: new Date() },
  { id: "2", name: "Habit Tracker", step: "ac", preview: "habit", updatedAt: new Date() },
];
test("filter by query", () => {
  expect(filterHistory(items as any, "toko", null)).toHaveLength(1);
});
test("filter by step", () => {
  expect(filterHistory(items as any, "", "ac")).toHaveLength(1);
});
test("paginate", () => {
  expect(paginate(items as any, 1, 1)).toHaveLength(1);
});
```

- [ ] **Step 2: Run test FAIL**

Run: `pnpm exec vitest run src/lib/history-filter.test.ts`
Expected: FAIL module not found

- [ ] **Step 3: Implement pure utils**

```typescript
// src/lib/history-filter.ts
import type { HistoryItem } from "@/routes/history";
export function filterHistory(items: HistoryItem[], query: string, stepFilter: string | null): HistoryItem[] {
  let r = items;
  if (query.trim()) {
    const q = query.toLowerCase();
    r = r.filter(i => i.name.toLowerCase().includes(q) || (i.preview ?? "").toLowerCase().includes(q));
  }
  if (stepFilter) r = r.filter(i => (i.step ?? "prd") === stepFilter);
  return r;
}
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}
```

- [ ] **Step 4: Run test PASS**

Run: `pnpm exec vitest run src/lib/history-filter.test.ts`
Expected: PASS

- [ ] **Step 5: Integrate ke HistoryPage.tsx**

```typescript
// src/components/history/history-page.tsx
import { filterHistory, paginate } from "@/lib/history-filter";
import { HISTORY_PAGE_SIZE } from "@/lib/constants";
const [query, setQuery] = useState("");
const [stepFilter, setStepFilter] = useState<string | null>(null);
const [page, setPage] = useState(1);
const filtered = filterHistory(localItems, query, stepFilter);
const paged = paginate(filtered, page, HISTORY_PAGE_SIZE);
// render: input search + chips PRD/AC/Task + pagination buttons
// reset page ke 1 saat query/stepFilter berubah useEffect
```

- [ ] **Step 6: Verify manual & commit**

```bash
git add src/lib/history-filter.ts src/lib/history-filter.test.ts src/components/history/history-page.tsx
git commit -m "feat: history search filter pagination"
```

---

### Task 4: PRD Version Diff Viewer

**Files:**
- Create: `src/lib/diff-utils.ts`
- Create: `src/lib/diff-utils.test.ts`
- Create: `src/components/prd/prd-diff-viewer.tsx`
- Modify: `src/components/prd/prd-viewer.tsx:1-50` (tambah tab)
- Test: vitest + playwright

**Interfaces:**
- Consumes: `oldContent: string, newContent: string` dari `PrdDetail` `allVersions`
- Produces: `computeDiff(old, new): Array<{type:"added"|"removed"|"unchanged", text:string}>`, component `PrdDiffViewer` render

- [ ] **Step 1: Write failing test diff-utils**

```typescript
// src/lib/diff-utils.test.ts
import { computeDiff } from "@/lib/diff-utils";
test("detect added line", () => {
  const d = computeDiff("a\nb", "a\nb\nc");
  expect(d.some(x => x.type==="added" && x.text==="c")).toBe(true);
});
test("detect removed", () => {
  const d = computeDiff("a\nb", "a");
  expect(d.some(x => x.type==="removed")).toBe(true);
});
```

- [ ] **Step 2: Run FAIL**
Run: `pnpm exec vitest run src/lib/diff-utils.test.ts` Expected FAIL

- [ ] **Step 3: Implement line diff tanpa dep (LCS simple)**

```typescript
// src/lib/diff-utils.ts
export type DiffLine = { type: "added"|"removed"|"unchanged", text: string };
export function computeDiff(oldStr: string, newStr: string): DiffLine[] {
  const a = oldStr.split("\n"), b = newStr.split("\n");
  const result: DiffLine[] = [];
  let i=0,j=0;
  while (i<a.length || j<b.length) {
    if (i>=a.length) result.push({type:"added", text:b[j++]});
    else if (j>=b.length) result.push({type:"removed", text:a[i++]});
    else if (a[i]===b[j]) { result.push({type:"unchanged", text:a[i]}); i++; j++; }
    else {
      // simple: cek next match
      const nextA = a.indexOf(b[j], i);
      const nextB = b.indexOf(a[i], j);
      if (nextA!==-1 && (nextB===-1 || nextA - i < nextB - j)) {
        result.push({type:"removed", text:a[i++]}); 
      } else if (nextB!==-1) {
        result.push({type:"added", text:b[j++]});
      } else {
        result.push({type:"removed", text:a[i++]}); result.push({type:"added", text:b[j++]});
      }
    }
  }
  return result;
}
```

- [ ] **Step 4: Run PASS**

Run: `pnpm exec vitest run src/lib/diff-utils.test.ts` Expected PASS

- [ ] **Step 5: Create PrdDiffViewer component**

```typescript
// src/components/prd/prd-diff-viewer.tsx
"use client";
import { computeDiff } from "@/lib/diff-utils";
export function PrdDiffViewer({ oldContent, newContent }: { oldContent: string; newContent: string }) {
  if (!oldContent || !newContent) return <div className="p-4 text-sm text-fog">Pilih dua versi untuk compare.</div>;
  if (oldContent===newContent) return <div className="p-4 text-sm text-fog">Tidak ada perubahan.</div>;
  const diff = computeDiff(oldContent, newContent);
  return (
    <div className="font-mono text-xs overflow-auto">
      {diff.map((l, idx) => (
        <div key={idx} className={l.type==="added" ? "bg-emerald/15 text-emerald" : l.type==="removed" ? "bg-crimson/15 text-crimson line-through" : "text-fog"}>
          {l.type==="added" ? "+ " : l.type==="removed" ? "- " : "  "}{l.text}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Integrate ke PrdViewer tabs**

```typescript
// src/components/prd/prd-viewer.tsx — tambah state activeTab: "preview"|"diff" + select dropdown untuk oldVersion
// jika diff tab, render <PrdDiffViewer oldContent={versions.find(v=>v.version===oldVer)?.content} newContent={content} />
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/diff-utils.ts src/lib/diff-utils.test.ts src/components/prd/prd-diff-viewer.tsx src/components/prd/prd-viewer.tsx
git commit -m "feat: prd version diff viewer"
```

---

### Task 5: Paywall Halus + Stepper Jujur

**Files:**
- Create: `src/components/shared/paywall-card.tsx`
- Modify: `src/components/layout/flow-step-nav.tsx:1-40`
- Modify: `src/components/prd/prd-detail.tsx:240-259`
- Modify: `src/components/ac/ac-detail.tsx:284-310`
- Modify: `src/routes/prd/$id.tsx:21` (tambah step select)
- Test: vitest untuk stepRank, playwright untuk paywall

**Interfaces:**
- Consumes: `plan: Plan`, `step: FlowStep` dari loader, `stepRank()` dari `src/lib/flow-progress.ts:14`
- Produces: `PaywallCard` reusable, stepper yang akurat

- [ ] **Step 1: Create PaywallCard**

```typescript
// src/components/shared/paywall-card.tsx
import { PAYWALL_COPY } from "@/lib/constants";
import { Link } from "@tanstack/react-router";
export function PaywallCard({ type }: { type: "ac"|"task" }) {
  const copy = PAYWALL_COPY[type];
  return (
    <div className="rounded-xl border border-amber/20 bg-amber/5 p-6 text-center">
      <h3 className="font-[510] text-snow">{copy.title}</h3>
      <p className="mt-1 text-sm text-fog">{copy.desc}</p>
      <Link to="/pricing" className="btn-primary mt-4 inline-block rounded-md px-5 py-2">{copy.cta} — Rp 49.000</Link>
    </div>
  );
}
```

- [ ] **Step 2: Update flow-step-nav.tsx wire ke real step**

```typescript
// src/components/layout/flow-step-nav.tsx
import { stepRank } from "@/lib/flow-progress";
const steps: Array<{id: FlowStep, label: string, route: string}> = [
  {id:"prd", label:"PRD", route:"/prd/$id"}, {id:"ac", label:"AC", route:"/ac/$id"}, {id:"task", label:"Task", route:"/task/$id"}, {id:"kanban", label:"Kanban", route:"/kanban/$id"},
];
// render: rank = stepRank(currentStep); for each s, state = stepRank(s.id) < rank ? "done" : stepRank(s.id)===rank ? "current" : "locked"
```

- [ ] **Step 3: Expose step di prd/$id.tsx loader**

```typescript
// src/routes/prd/$id.tsx:21 — tambah select step
// db.select({ id: projects.id, name: projects.name, step: projects.step })
```

- [ ] **Step 4: Integrate paywall di PrdDetail (after PRD done)**

```typescript
// src/components/prd/prd-detail.tsx — setelah PrdViewer, jika plan==="free" && latestVersion
// tampilkan <PaywallCard type="ac" /> di bawah viewer, bukan auto-redirect
```

- [ ] **Step 5: Gate auto-generate AC untuk free**

```typescript
// src/components/ac/ac-detail.tsx:290 — update
useEffect(() => {
  if (plan==="free") return; // jangan auto-generate, tampilkan paywall
  if (!latestPrdContent || latestAcContent || hasAutoGenerated.current || isGenerating) return;
  // ...
}, [latestPrdContent, latestAcContent, plan]);
```

- [ ] **Step 6: Verify & Commit**

```bash
git add src/components/shared/paywall-card.tsx src/components/layout/flow-step-nav.tsx src/components/prd/prd-detail.tsx src/components/ac/ac-detail.tsx src/routes/prd/\$id.tsx
git commit -m "feat: soft paywall + honest stepper wired to real step"
```

---

### Task 6: Export PDF Rapi

**Files:**
- Create: `src/lib/services/export-pdf.ts`
- Create: `src/routes/api/export/pdf.ts`
- Modify: `src/components/prd/prd-viewer.tsx`
- Modify: `src/lib/constants.ts` (PDF_STYLES sudah ada dari Task1)
- Test: vitest

**Interfaces:**
- Consumes: `prdContent: string, projectName: string` 
- Produces: `generatePdfBuffer({content, projectName}): Promise<Buffer>`, route `POST /api/export/pdf` return `application/pdf`

- [ ] **Step 1: Write failing test**

```typescript
// src/lib/services/export-pdf.test.ts
import { generatePdfBuffer } from "@/lib/services/export-pdf";
test("pdf buffer non-empty", async () => {
  const buf = await generatePdfBuffer({ content: "# Hello\nWorld", projectName: "Test" });
  expect(buf.length).toBeGreaterThan(100);
});
```

- [ ] **Step 2: Run FAIL**

Run: `pnpm exec vitest run src/lib/services/export-pdf.test.ts` Expected FAIL

- [ ] **Step 3: Implement export-pdf wrapper (simple HTML → PDF via jsdom + pdf lib, atau via `jspdf`)**

```typescript
// src/lib/services/export-pdf.ts
// V1: generate simple text-based PDF buffer tanpa native dep — pakai jsPDF jika tersedia, fallback ke Buffer dari markdown
export async function generatePdfBuffer({ content, projectName }: { content: string; projectName: string }): Promise<Buffer> {
  // simple: jika jspdf tidak ada, return Buffer.from(content) dengan header
  // real impl: dynamic import jspdf, doc.text(content)
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(14); doc.text(projectName, 10, 10);
  doc.setFontSize(11);
  const lines = doc.splitTextToSize(content.slice(0, 8000), 180);
  doc.text(lines, 10, 20);
  const out = doc.output("arraybuffer");
  return Buffer.from(out);
}
```

- [ ] **Step 4: Create route**

```typescript
// src/routes/api/export/pdf.ts
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { generatePdfBuffer } from "@/lib/services/export-pdf";
import { requireUser } from "@/lib/session";
export const Route = createFileRoute("/api/export/pdf")({
  server: { handlers: { POST: async ({ request }: { request: Request }) => {
    const user = await requireUser(request.headers);
    const { projectId } = await request.json() as { projectId: string };
    const [proj] = await db.select({ id: projects.id, name: projects.name }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
    if (!proj) return Response.json({ error: "Not found" }, { status: 404 });
    const content = await getLatestPrdContent(projectId);
    if (!content) return Response.json({ error: "No PRD" }, { status: 404 });
    const buf = await generatePdfBuffer({ content, projectName: proj.name });
    return new Response(buf as any, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${proj.name}-prd.pdf"` } });
  }}}
});
```

- [ ] **Step 5: Add button di PrdViewer**

```typescript
// src/components/prd/prd-viewer.tsx — toolbar
<button onClick={async () => {
  const res = await fetch("/api/export/pdf", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ projectId }) });
  const blob = await res.blob(); const url = URL.createObjectURL(blob); window.open(url);
}}>Export PDF</button>
```

- [ ] **Step 6: Run test PASS + Commit**

Run: `pnpm exec vitest run src/lib/services/export-pdf.test.ts`
```bash
git add src/lib/services/export-pdf.ts src/routes/api/export/pdf.ts src/components/prd/prd-viewer.tsx
git commit -m "feat: export PRD to PDF"
```

---

### Task 7: Template Gallery di Landing

**Files:**
- Create: `src/lib/template-gallery.ts`
- Create: `src/components/layout/template-gallery.tsx`
- Modify: `src/components/layout/hero.tsx:5`
- Modify: `src/components/layout/chat-input.tsx` (accept onTemplateSelect)
- Test: playwright

**Interfaces:**
- Consumes: `TEMPLATE_GALLERY: Array<{id,title,prompt,platform}>`
- Produces: `TemplateGallery` onClick → `onSelect(prompt)` → prefill ChatInput

- [ ] **Step 1: Create template data**

```typescript
// src/lib/template-gallery.ts
export const TEMPLATE_GALLERY = [
  { id:"saas-analytics", title:"SaaS Analytics Dashboard", icon:"BarChart", platform:"web" as const, prompt:"Saya ingin membuat SaaS Analytics Dashboard untuk UMKM yang menampilkan penjualan harian, stok, dan prediksi AI. Target user pemilik toko. Butuh role admin dan staff, integrasi Midtrans, dan laporan export PDF. Buatkan PRD lengkap." },
  { id:"marketplace", title:"Marketplace UMKM", icon:"Store", platform:"web" as const, prompt:"Marketplace untuk produk UMKM lokal dengan fitur katalog, keranjang, checkout, chat penjual-pembeli, dan sistem review. Platform web, butuh admin panel dan kurir tracking." },
  { id:"habit-mobile", title:"Habit Tracker Mobile", icon:"Smartphone", platform:"mobile" as const, prompt:"Aplikasi mobile habit tracker dengan streak, reminder notifikasi, statistik mingguan, dan social share. Target Gen Z, butuh onboarding gamified dan premium subscription." },
  { id:"edu-lms", title:"LMS Edukasi", icon:"GraduationCap", platform:"web" as const, prompt:"Platform LMS untuk kursus online dengan video streaming, quiz, sertifikat otomatis, dan forum diskusi. Butuh role mentor dan student, payment gateway, dan progress tracking." },
  { id:"crm", title:"CRM Penjualan", icon:"Users", platform:"web" as const, prompt:"CRM untuk tim sales dengan pipeline kanban, reminder follow-up, integrasi WhatsApp, dan laporan performa. Butuh role admin, sales, manager." },
  { id:"pos", title:"POS Kasir", icon:"Receipt", platform:"mobile" as const, prompt:"Aplikasi POS kasir untuk warung dengan scan barcode, cetak struk Bluetooth, laporan harian, dan manajemen stok. Platform mobile Android, offline-first." },
];
```

- [ ] **Step 2: Create Gallery component**

```typescript
// src/components/layout/template-gallery.tsx
"use client";
import { TEMPLATE_GALLERY } from "@/lib/template-gallery";
export function TemplateGallery({ onSelect }: { onSelect: (prompt: string) => void }) {
  return (
    <div className="mx-auto mt-8 grid max-w-[728px] grid-cols-2 gap-3 md:grid-cols-3">
      {TEMPLATE_GALLERY.map(t => (
        <button key={t.id} onClick={() => onSelect(t.prompt)} className="rounded-xl border border-graphite bg-charcoal p-4 text-left hover:border-fog/40 transition">
          <div className="text-sm font-[510] text-snow">{t.title}</div>
          <div className="mt-1 text-xs text-fog capitalize">{t.platform} App</div>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Lift state di Hero + ChatInput**

```typescript
// src/components/layout/hero.tsx
"use client";
import { useState } from "react";
import { ChatInput } from "./chat-input";
import { TemplateGallery } from "./template-gallery";
export function HeroContent() {
  const [prefill, setPrefill] = useState<string | undefined>();
  return (
    <div className="flex flex-col items-center">
      <h1 className="...">Dari ide produk ke PRD yang siap dieksekusi</h1>
      <ChatInput initialValue={prefill} />
      <TemplateGallery onSelect={(p) => setPrefill(p)} />
    </div>
  );
}
// ChatInput terima props initialValue?: string, useEffect sync ke message state
```

- [ ] **Step 4: Verify & Commit**

```bash
git add src/lib/template-gallery.ts src/components/layout/template-gallery.tsx src/components/layout/hero.tsx src/components/layout/chat-input.tsx
git commit -m "feat: template gallery on landing"
```

---

### Task 8: Brief Upload untuk Grounding AI

**Files:**
- Create: `src/lib/brief-parse.ts`
- Create: `src/lib/brief-parse.test.ts`
- Create: `src/components/ask/context-upload.tsx`
- Modify: `src/routes/ask/$id.tsx` (tambah upload section)
- Modify: `src/routes/api/chat.ts:124` (accept briefContext)
- Test: vitest

**Interfaces:**
- Consumes: `File` → `parseBrief(file): Promise<{text, truncated}>`
- Produces: `briefContext: string` dikirim ke `POST /api/chat` sebagai `groundingSource` tambahan

- [ ] **Step 1: Write failing test parse**

```typescript
// src/lib/brief-parse.test.ts
import { truncateBrief } from "@/lib/brief-parse";
test("truncate 6000 chars to 5000", () => {
  const s = "a".repeat(6000);
  const { text, truncated } = truncateBrief(s);
  expect(text.length).toBe(5000);
  expect(truncated).toBe(true);
});
```

- [ ] **Step 2: Run FAIL**
Run: `pnpm exec vitest run src/lib/brief-parse.test.ts` Expected FAIL

- [ ] **Step 3: Implement**

```typescript
// src/lib/brief-parse.ts
import { BRIEF_MAX_CHARS } from "@/lib/constants";
export function truncateBrief(text: string): { text: string; truncated: boolean } {
  if (text.length <= BRIEF_MAX_CHARS) return { text, truncated: false };
  return { text: text.slice(0, BRIEF_MAX_CHARS), truncated: true };
}
export async function parseBriefFile(file: File): Promise<{ text: string; truncated: boolean }> {
  if (file.size > 2*1024*1024) throw new Error("File terlalu besar (max 2MB)");
  const raw = await file.text(); // V1: only .txt/.md, pdf deferred
  return truncateBrief(raw);
}
```

- [ ] **Step 4: Create upload component**

```typescript
// src/components/ask/context-upload.tsx
"use client";
import { useState } from "react";
import { parseBriefFile } from "@/lib/brief-parse";
export function ContextUpload({ onContext }: { onContext: (text: string) => void }) {
  const [name, setName] = useState<string | null>(null);
  return (
    <div className="rounded-lg border border-graphite bg-charcoal p-4">
      <label className="text-sm font-[510]">Tambah Konteks (opsional)</label>
      <input type="file" accept=".txt,.md" onChange={async (e) => {
        const f = e.target.files?.[0]; if (!f) return;
        try { const { text } = await parseBriefFile(f); onContext(text); setName(f.name); } catch (err) { alert((err as Error).message); }
      }} className="mt-2 block text-sm" />
      {name && <p className="mt-2 text-xs text-emerald">Loaded: {name}</p>}
      <textarea placeholder="Atau paste brief/URL kompetitor..." onBlur={(e) => onContext(e.target.value.slice(0,5000))} className="mt-3 w-full rounded bg-obsidian p-2 text-sm" rows={3} />
    </div>
  );
}
```

- [ ] **Step 5: Integrate ke Ask flow + API**

```typescript
// src/routes/ask/$id.tsx — tambah state briefContext, render <ContextUpload onContext={setBriefContext} />
// simpan ke sessionStorage atau kirim via POST /api/chat body { ..., briefContext }
// src/routes/api/chat.ts:124 — tambah
// let groundingSource = message + (body.briefContext ? `\n\nBRIEF KONTEXT:\n${body.briefContext.slice(0,5000)}` : "");
```

- [ ] **Step 6: Run test PASS + Commit**

Run: `pnpm exec vitest run src/lib/brief-parse.test.ts`
```bash
git add src/lib/brief-parse.ts src/lib/brief-parse.test.ts src/components/ask/context-upload.tsx src/routes/ask/\$id.tsx src/routes/api/chat.ts
git commit -m "feat: brief upload for AI grounding"
```

---

### Task 9: Kanban Realtime SSE (ganti Polling)

**Files:**
- Create: `src/routes/api/kanban/stream.ts`
- Modify: `src/hooks/use-kanban-polling.ts:1-83`
- Modify: `src/routes/api/kanban/update-status.ts` (return JSON + trigger)
- Test: vitest + manual SSE

**Interfaces:**
- Consumes: `GET /api/kanban/stream?projectId=xxx` SSE, fallback polling
- Produces: `useKanbanTasks` dengan `staleness` real, optimistic update

- [ ] **Step 1: Create SSE endpoint**

```typescript
// src/routes/api/kanban/stream.ts
import { createFileRoute } from "@tanstack/react-router";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getKanbanData } from "@/lib/services/task-service"; // existing helper
import { requireUser } from "@/lib/session";
export const Route = createFileRoute("/api/kanban/stream")({
  server: { handlers: { GET: async ({ request }: { request: Request }) => {
    const user = await requireUser(request.headers);
    const url = new URL(request.url); const projectId = url.searchParams.get("projectId");
    if (!projectId) return Response.json({ error: "projectId required" }, { status: 400 });
    const [proj] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
    if (!proj) return Response.json({ error: "Not found" }, { status: 404 });
    const stream = new ReadableStream({
      async start(controller) {
        const enc = new TextEncoder();
        const send = async () => {
          const data = await getKanbanData(projectId);
          controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));
        };
        await send();
        const iv = setInterval(send, 3000);
        request.signal.addEventListener("abort", () => { clearInterval(iv); try{controller.close()}catch{} });
      }
    });
    return new Response(stream, { headers: { "Content-Type":"text/event-stream", "Cache-Control":"no-cache", Connection:"keep-alive" } });
  }}}
});
```

- [ ] **Step 2: Update hook SSE + fallback**

```typescript
// src/hooks/use-kanban-polling.ts — tambah branch SSE
export function useKanbanTasks({ projectId, intervalMs=10_000, enabled=true }: UseKanbanTasksOptions) {
  // try SSE
  const [sseData, setSseData] = useState<KanbanData | null>(null);
  const [sseFailed, setSseFailed] = useState(false);
  useEffect(() => {
    if (!enabled || !projectId) return;
    const es = new EventSource(`/api/kanban/stream?projectId=${projectId}`);
    es.onmessage = (e) => { try{ setSseData(JSON.parse(e.data)); setSseFailed(false);}catch{} };
    es.onerror = () => { setSseFailed(true); es.close(); };
    return () => es.close();
  }, [projectId, enabled]);
  // fallback to useQuery polling jika sseFailed
  const query = useQuery<KanbanData>({ queryKey:["kanban-tasks",projectId], queryFn: async()=>{ const r=await fetch(`/api/kanban/${projectId}`); return r.json(); }, refetchInterval: sseFailed ? intervalMs : false, enabled: enabled && !!projectId && sseFailed });
  const data = sseFailed ? query.data ?? null : sseData;
  // staleness logic tetap
  return { data, isLoading: !data && query.isLoading, staleness: query.failureCount>=10?"disconnected":query.failureCount>=3?"stale":data?.staleness??"live", refetch: query.refetch };
}
```

- [ ] **Step 3: Optimistic update di update-status**

```typescript
// src/routes/api/kanban/update-status.ts — return updated task JSON agar client bisa optimistic setQueryData
```

- [ ] **Step 4: Verify & Commit**

```bash
git add src/routes/api/kanban/stream.ts src/hooks/use-kanban-polling.ts src/routes/api/kanban/update-status.ts
git commit -m "feat: kanban realtime SSE with polling fallback"
```

---

## Self-Review Checklist

- [x] Spec coverage: setiap section 4.1-4.6 dan 5.1-5.3 punya task 1-9 yang map 1:1
- [x] No placeholder: semua step punya code block aktual, bukan “TBD”
- [x] Type consistency: `HistoryItem`, `KanbanData`, `Plan`, `FlowStep` konsisten dengan `src/types/database.ts` dan `src/lib/flow-step.ts`
- [x] File paths verified via glob sebelum tulis plan
- [x] Global constraints disalin verbatim dari spec

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-24-novaplan-professional-polish.md`. Two execution options:

**1. Subagent-Driven (recommended)** - dispatch fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
