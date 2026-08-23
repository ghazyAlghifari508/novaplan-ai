# AI Agent Handoff Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memastikan AI coding agent (Claude Code, Cursor, dll.) menerima dokumen lengkap (PRD + AC + Tasks + rules lintas-agent) dan menghasilkan aplikasi yang tidak simpel — via fix bug AC kosong, format `AGENTS.md`, checkpoint per fase, dan pengetatan prompt task/AC.

**Architecture:** Empat lapis perbaikan pada handoff pipeline Novaplan→AI agent: (1) export endpoints kini mengirim AC asli, (2) CLI dapat menulis `AGENTS.md` sebagai rules file lintas-agent, (3) prompt template memberi agent alur checkpoint-per-fase, (4) prompt generation menuntut traceability AC→subtask, detail teknis spesifik, state coverage, dan kontrak API.

**Tech Stack:** TypeScript, TanStack Start (routes), Commander (CLI), Vitest, Biome.

**Spec:** Keputusan desain dari sesi diskusi 2026-08-24 (dirangkum di bawah). Tidak ada spec doc terpisah; plan ini self-contained.

## Background & Decisions (spec ringkas)

1. **Bug terkonfirmasi**: `/api/export/prd` hardcode `ac: null` dan `/api/export/zip` hardcode `ac: undefined` — AC tidak pernah sampai ke agent. **Fix sudah ditulis & terverifikasi live** (AC GudangKilat 11.443 char terkirim), tinggal commit (Task 1).
2. **Rules file**: `.claude/rules/project-spec.md` itu Claude-spesifik. Standar lintas-agent = `AGENTS.md` di root. CLI `packages/cli` sudah punya pola `--format cursor|claude` — tinggal tambah branch `agents`.
3. **Checkpoint per fase**: agent harus berhenti + lapor ringkasan di akhir tiap fase, tunggu kata "lanjut" — mencegah context drift di sesi panjang.
4. **Kedalaman output**: gap bukan di format PRD/AC (sudah kuat), tapi di (a) task `details` yang boleh generik, (b) AC yang belum mewajibkan state coverage UI & kontrak API.

## Global Constraints

- Bahasa copy prompt & UI: Indonesia; istilah teknis tetap English.
- Server-only modules (`db`, `auth`) wajib dynamic import — tidak relevan untuk file di plan ini, tapi jangan tambahkan import top-level baru.
- Append-only versioning; jangan sentuh logika credit/generate di plan ini.
- Baseline test failures TERDOKUMENTASI (BUKAN regresi): `flow-progress.test.ts > rejects aborted output`; suite DB-env `ac-service.test.ts`, `derive-project-name.test.ts`, `prd-service.test.ts` butuh DATABASE_URL. Jangan coba "memperbaiki" mereka dalam plan ini.
- Tidak ada script `typecheck` — verifikasi types pakai `pnpm exec tsc --noEmit` (baseline error dikenal: `vite.config.ts(23,34)` TS2353).
- Stage hanya file yang disebut di task — working tree punya deletion `docs/plan/*` milik user yang BUKAN bagian plan ini.
- Commit message English (standar git).

---

### Task 1: Commit fix pengiriman AC pada export endpoints

> **✅ PRE-EXECUTED** — task ini sudah dikerjakan dan ter-push di commit `4cdb5f5` sebelum sesi eksekusi dimulai. Lewati semua step di bawah; gunakan hanya sebagai konteks (fix: `src/routes/api/export/prd.ts` + `src/routes/api/export/zip.ts` kini fetch `getLatestAcMarkdown`). Mulai eksekusi dari Task 2.

**Files:**
- Modify (sudah diedit, belum di-commit): `src/routes/api/export/prd.ts`
- Modify (sudah diedit, belum di-commit): `src/routes/api/export/zip.ts`

**Interfaces:**
- Produces: `POST /api/export/prd` kini mengembalikan `ac: string | null` (AC markdown asli, bukan selalu null); `POST /api/export/zip` kini menyertakan `ac.md` di dalam ZIP bila AC ada. Konsumen: `implementation-options.tsx` (`data.ac`), Task 3.

- [ ] **Step 1: Verifikasi isi diff kedua file**

Run: `git diff src/routes/api/export/prd.ts src/routes/api/export/zip.ts`
Expected: kedua file import `getLatestAcMarkdown` dari `@/lib/services/ac-service` + `formatAcMarkdown` dari export-service; `Promise.all` kini fetch 3 hal (prd, ac, tasks); prd.ts return `ac: acContent ? formatAcMarkdown(acContent) : null`; zip.ts pass `ac: acContent ? formatAcMarkdown(acContent) : undefined`. TIDAK ada perubahan lain.

- [ ] **Step 2: Verifikasi live endpoint mengembalikan AC**

Pastikan dev server jalan (`pnpm dev`, port 3000) dan browser terautentikasi (chrome-devtools MCP). Di halaman `http://localhost:3000/history` jalankan evaluate_script:

```js
async () => {
  const res = await fetch("/api/export/prd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId: "<PROJECT_DENGAN_AC>" }),
  });
  const data = await res.json();
  return { status: res.status, acLen: data.ac?.length ?? null };
}
```

Expected: `{ status: 200, acLen: > 1000 }` (pakai project yang sudah generate AC, mis. GudangKilat).

- [ ] **Step 3: Lint kedua file**

Run: `pnpm biome check src/routes/api/export/prd.ts src/routes/api/export/zip.ts`
Expected: clean (0 error).

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/export/prd.ts src/routes/api/export/zip.ts
git commit -m "fix(export): include real Acceptance Criteria in PRD and ZIP exports

Both endpoints hardcoded an empty AC field (null/undefined), so the
Prompt AI Agent flow always embedded '(Belum ada AC)' and the ZIP never
contained ac.md. Fetch latest AC markdown alongside PRD and tasks."
```

---

### Task 2: CLI — format `agents` menulis AGENTS.md

**Files:**
- Modify: `packages/cli/src/commands/export.test.ts`
- Modify: `packages/cli/src/commands/export.ts:89-99`
- Modify: `packages/cli/src/index.ts:120-124`

**Interfaces:**
- Consumes: existing signature `exportRulesCommand(projectId: string, options: { format?: string })`.
- Produces: `exportRulesCommand(id, { format: "agents" })` → tulis `AGENTS.md` di cwd dengan konten sama seperti format lain (# Project Rules + Tech Stack & Architecture + Acceptance Criteria + Strict Rules). Dikonsumsi Task 3 (teks prompt menjalankan `--format agents`).

- [ ] **Step 1: Tulis failing test**

Tambahkan test baru di dalam `describe("exportRulesCommand")` pada `packages/cli/src/commands/export.test.ts` (setelah test "writes .cursorrules..."):

```typescript
	it("writes AGENTS.md when --format agents is passed", async () => {
		vi.mocked(apiGet)
			.mockResolvedValueOnce({ content: PRD, version: 1 })
			.mockResolvedValueOnce({ content: AC, version: 1 });

		vi.mocked(writeFileSync).mockClear();
		await exportRulesCommand("proj-1", { format: "agents" });

		const [path, content] = vi.mocked(writeFileSync).mock.calls[0];
		expect(String(path).replace(/\\/g, "/")).toBe("AGENTS.md");
		const md = content as string;
		expect(md).toContain("# Project Rules");
		expect(md).toContain("React 19");
		expect(md).toContain("User bisa login via Google OAuth");
		expect(md).toContain("ONLY implement features explicitly listed");
	});
```

- [ ] **Step 2: Run test, verify FAIL**

Run: `pnpm vitest run packages/cli/src/commands/export.test.ts`
Expected: test baru FAIL — path yang tertulis adalah `.claude/rules/project-spec.md` (branch else), bukan `AGENTS.md`.

- [ ] **Step 3: Implementasi branch agents**

Di `packages/cli/src/commands/export.ts`, ganti blok if/else (baris 89-99) menjadi:

```typescript
		if (format === "cursor") {
			writeFileSync(".cursorrules", md);
			console.log("✓ Written .cursorrules");
		} else if (format === "agents") {
			writeFileSync("AGENTS.md", md);
			console.log("✓ Written AGENTS.md");
		} else {
			const dir = ".claude/rules";
			if (!existsSync(dir)) {
				mkdirSync(dir, { recursive: true });
			}
			writeFileSync(join(dir, "project-spec.md"), md);
			console.log(`✓ Written ${dir}/project-spec.md`);
		}
```

- [ ] **Step 4: Update wiring & help text di index.ts**

Di `packages/cli/src/index.ts`, ganti definisi command export rules (baris 119-124):

```typescript
exportCmd
	.command("rules")
	.argument("<projectId>", "Project UUID")
	.description(
		"Generate agent rules file with PRD stack + AC (--format agents writes AGENTS.md)",
	)
	.option("--format <format>", "Output format (agents|claude|cursor)")
	.action(exportRulesCommand);
```

- [ ] **Step 5: Run tests, verify PASS**

Run: `pnpm vitest run packages/cli/src/commands/export.test.ts`
Expected: SEMUA test PASS termasuk 6 test lama (default tetap claude, cursor tetap .cursorrules, dedup heading tetap jalan).

- [ ] **Step 6: Lint + commit**

Run: `pnpm biome check --write packages/cli/src/commands/export.ts packages/cli/src/commands/export.test.ts packages/cli/src/index.ts`
Expected: clean / fixed formatting only.

```bash
git add packages/cli/src/commands/export.ts packages/cli/src/commands/export.test.ts packages/cli/src/index.ts
git commit -m "feat(cli): add --format agents writing cross-agent AGENTS.md

AGENTS.md at repo root is the emerging cross-agent standard (Codex,
Cursor, Jules read it natively). Same content as the claude/cursor
formats; claude remains the default."
```

---

### Task 3: Prompt template — setup rules agents + checkpoint per fase

**Files:**
- Modify: `src/components/task/implementation-options.tsx:135-154` (blok "Alur per FASE" dalam konstanta `AI_AGENT_PROMPT_TEMPLATE`)

**Interfaces:**
- Consumes: CLI behavior dari Task 2 (`novaplan export rules <id> --format agents` → `AGENTS.md`).
- Produces: teks prompt final yang dikirim user ke AI coding agent.

- [ ] **Step 1: Ganti langkah 0 (setup rules)**

Di konstanta `AI_AGENT_PROMPT_TEMPLATE`, cari blok:

```
### Alur per FASE (setiap feature group = 1 fase):
0. SETUP PROJECT RULES (sekali di awal):
   Jalankan \`novaplan export rules {projectId}\` untuk generate file .claude/rules/project-spec.md.
   File ini berisi Tech Stack, Architecture, dan Acceptance Criteria yang WAJIB diikuti.
   AI agent akan otomatis membaca file ini di setiap session.
```

Ganti menjadi:

```
### Alur per FASE (setiap feature group = 1 fase):
0. SETUP PROJECT RULES (sekali di awal):
   Jalankan \`novaplan export rules {projectId} --format agents\` untuk generate file AGENTS.md di root project.
   File ini berisi Tech Stack, Architecture, dan Acceptance Criteria yang WAJIB diikuti.
   BACA ULANG file AGENTS.md ini di awal SETIAP session baru sebelum mulai bekerja.
```

Perhatikan: escape backtick (\`) harus dipertahankan karena blok ini di dalam template literal TypeScript.

- [ ] **Step 2: Tambah blok CHECKPOINT setelah langkah 5**

Cari baris:

```
5. Ulangi dari langkah 1 untuk fase berikutnya
```

Tambahkan tepat setelahnya (masih di dalam template literal, sebelum `### Aturan penting:`):

```

### CHECKPOINT WAJIB ANTAR FASE:
- Setelah SEMUA task dalam satu fase berstatus completed, BERHENTI. JANGAN langsung mulai fase berikutnya.
- Sajikan ringkasan fase: task yang diselesaikan, poin AC yang tercakup (sebutkan nomor AC-X.Y), dan file yang dibuat/diubah.
- TUNGGU user menulis "lanjut" sebelum memulai fase berikutnya.
```

- [ ] **Step 3: Sanity check konsistensi teks**

Run: `grep -n ".claude" src/components/task/implementation-options.tsx`
Expected: nihil (tidak ada lagi referensi .claude di file ini).

- [ ] **Step 4: Lint + commit**

Run: `pnpm biome check --write src/components/task/implementation-options.tsx`
Expected: clean / fixed formatting only.

```bash
git add src/components/task/implementation-options.tsx
git commit -m "feat(prompt): cross-agent rules setup and per-phase checkpoints

Point the AI agent at 'export rules --format agents' (AGENTS.md)
instead of the Claude-specific path, and require the agent to stop
after each completed phase with a summary (tasks done, AC points
covered, files changed) until the user says continue."
```

---

### Task 4: Perkuat prompt task — traceability + detail teknis wajib

**Files:**
- Modify: `src/lib/prompts-task.ts:29-36` (blok ATURAN)

**Interfaces:**
- Consumes: input AC markdown (disisipkan setelah system prompt oleh `src/routes/api/task/generate.ts`).
- Produces: task tree JSON yang description task-nya berakhiran `(Cover AC-X.Y, ...)`. `parseTaskJson` tidak divalidasi ulang (hanya struktur) — tidak ada perubahan schema/test yang diperlukan.

- [ ] **Step 1: Tambah aturan 6 & 7**

Di `TASK_GENERATION_PROMPT`, cari blok:

```
ATURAN:
1. HANYA untuk fitur yang EKSPLISIT di AC — JANGAN tambah fitur baru.
2. Task = actionable (verb + object). Subtask = atomic (single responsibility).
3. Subtask = deliverable terpisah yang bisa di-PR independen. Detail = langkah internal dalam satu deliverable.
4. Setiap subtask WAJIB punya "details" (min 1 item).
5. KOMPLEKSITAS ADAPTIF: sesuaikan jumlah task/subtask/detail dengan kompleksitas fitur dari AC. Fitur simpel → ringkas. Fitur kompleks → mendalam. JANGAN paksa angka — biarkan kompleksitas fitur menentukan kedalaman.

Output HANYA JSON, tanpa penjelasan tambahan.
```

Ganti menjadi (tambah dua aturan sebelum baris Output):

```
ATURAN:
1. HANYA untuk fitur yang EKSPLISIT di AC — JANGAN tambah fitur baru.
2. Task = actionable (verb + object). Subtask = atomic (single responsibility).
3. Subtask = deliverable terpisah yang bisa di-PR independen. Detail = langkah internal dalam satu deliverable.
4. Setiap subtask WAJIB punya "details" (min 1 item).
5. KOMPLEKSITAS ADAPTIF: sesuaikan jumlah task/subtask/detail dengan kompleksitas fitur dari AC. Fitur simpel → ringkas. Fitur kompleks → mendalam. JANGAN paksa angka — biarkan kompleksitas fitur menentukan kedalaman.
6. TRACEABILITY WAJIB: description setiap task WAJIB diakhiri referensi AC yang dicover dengan format "(Cover AC-X.Y, AC-X.Z)". SETIAP nomor AC pada input WAJIB ter-cover minimal oleh satu subtask di antara semua fitur. Ada AC yang tidak ter-cover = output GAGAL.
7. DETAILS TEKNIS SPESIFIK: setiap item "details" wajib konkret minimal salah satu dari: path file yang dibuat/diubah, endpoint/API yang dipanggil beserta method-nya, aturan validasi eksak (field, tipe, batas nilai), atau perilaku error state (code/pesan). DILARANG detail generik seperti "buat komponen" atau "tambahkan logika" tanpa konteks teknis.

Output HANYA JSON, tanpa penjelasan tambahan.
```

- [ ] **Step 2: Verifikasi tidak ada test yang assert isi prompt**

Run: `grep -rn "TASK_GENERATION_PROMPT" src --include="*.test.ts"`
Expected: nihil (sudah diverifikasi saat penulisan plan; re-run untuk konfirmasi).

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm biome check src/lib/prompts-task.ts; pnpm exec tsc --noEmit 2>&1 | Select-String -Pattern "prompts-task"`
Expected: biome clean; tsc tidak melaporkan error di prompts-task (baseline vite.config saja).

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts-task.ts
git commit -m "feat(prompt): require AC traceability and technical detail depth

Every task must declare which AC numbers it covers and every AC number
must map to at least one subtask. Subtask details must name concrete
artifacts (file paths, endpoints, validation rules, error states) so
coding agents cannot produce generic implementations."
```

---

### Task 5: Perkuat template AC — state coverage + kontrak API

**Files:**
- Modify: `src/lib/prompts-ac.ts:12` (blok ATURAN MUTLAK)

**Interfaces:**
- Consumes: PRD content (disisipkan setelah template oleh pemanggil).
- Produces: dokumen AC yang kini juga memuat kriteria state loading/empty/error/success per fitur UI dan spesifikasi endpoint per fitur data. Tidak ada konsumen programatik yang parse section spesifik selain marker `<!-- SECTION -->` milik PRD (AC tidak diparse per-section) — aman.

- [ ] **Step 1: Tambah aturan 13 & 14**

Di `AC_TEMPLATE`, cari:

```
12. Hindari instruksi operator generik — ganti spesifikasi validasi eksak di boundary kontrak.

Konteks PRD akan diberikan setelah prompt ini. Generate AC SEKARANG.
```

Ganti menjadi:

```
12. Hindari instruksi operator generik — ganti spesifikasi validasi eksak di boundary kontrak.
13. STATE COVERAGE: untuk setiap fitur dengan antarmuka UI, WAJIB ada kriteria yang mendefinisikan perilaku state loading, empty, error, dan success — termasuk pesan atau tampilan eksaknya.
14. KONTRAK API: untuk setiap fitur yang menyentuh data/backend, WAJIB ada spesifikasi endpoint minimal: HTTP method, path, payload utama, response code sukses, dan satu skenario error dengan response code/pesan eksak.

Konteks PRD akan diberikan setelah prompt ini. Generate AC SEKARANG.
```

- [ ] **Step 2: Verifikasi tidak ada test yang assert isi prompt**

Run: `grep -rn "AC_GENERATION_PROMPT" src packages --include="*.test.ts"`
Expected: nihil.

- [ ] **Step 3: Lint + typecheck**

Run: `pnpm biome check src/lib/prompts-ac.ts; pnpm exec tsc --noEmit 2>&1 | Select-String -Pattern "prompts-ac"`
Expected: biome clean; tsc nihil di file ini.

- [ ] **Step 4: Commit**

```bash
git add src/lib/prompts-ac.ts
git commit -m "feat(prompt): require UI state coverage and API contracts in AC

AC documents must now define loading/empty/error/success states with
exact messages for every UI feature, and specify endpoint contracts
(method, path, payload, success and error codes) for data features —
removing the ambiguity that let coding agents improvise shallow UX."
```

---

### Task 6: Verifikasi menyeluruh + push

**Files:** tidak ada perubahan baru — gerbang kualitas saja.

- [ ] **Step 1: Full unit test suite**

Run: `pnpm vitest run 2>&1 | Select-Object -Last 8`
Expected PERSIS baseline: `1 failed test | 156 passed` (flow-progress aborted-output) + `3 failed files` (ac-service, derive-project-name, prd-service — DB-env) + SEMUA test lain pass termasuk `export.test.ts` (7 test setelah Task 2).

- [ ] **Step 2: Typecheck + lint menyeluruh pada file tersentuh**

Run: `pnpm exec tsc --noEmit 2>&1 | Select-String -Pattern "export|prompts-|implementation-options"`
Expected: nihil (baseline vite.config saja).
Run: `pnpm biome check src/routes/api/export/ src/lib/prompts-task.ts src/lib/prompts-ac.ts src/components/task/implementation-options.tsx packages/cli/src/commands/export.ts packages/cli/src/commands/export.test.ts packages/cli/src/index.ts`
Expected: 0 error.

- [ ] **Step 3: Push semua commit**

Run: `git push`
Expected: main ter-update tanpa reject.

- [ ] **Step 4 (opsional, manual): E2E smoke kualitas output**

Buat/generate ulang satu project kecil lewat UI → bandingkan task tree baru vs lama: description memuat `(Cover AC-X.Y)`, details menyebut file/endpoint/validasi. Ini membakar kredit — jangan dijalankan otomatis; minta persetujuan user dulu.

---

## Self-Review Notes

- Spec coverage: 4 keputusan background → Task 1 (bug AC), Task 2+3 (AGENTS.md + checkpoint), Task 4+5 (kedalaman). Lengkap.
- Placeholder scan: semua step memuat kode/konten eksak; tidak ada TBD.
- Konsistensi nama: `--format agents`, `AGENTS.md`, `exportRulesCommand(projectId, { format })` dipakai konsisten lintas task.
