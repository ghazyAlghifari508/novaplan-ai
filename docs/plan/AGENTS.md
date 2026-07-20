# AGENTS.md — Panduan Implementasi Update Besar NovaPlan AI

> Dokumen ini khusus untuk implementasi 10 PRD di `docs/plan/`. Wajib dibaca SETIAP KALI sebelum memulai fase implementasi baru. Root `AGENTS.md` tetap berlaku untuk aturan umum.

## WAJIB: Aturan Sebelum Implementasi

### 🔍 Analisis Codebase (WAJIB — Langkah 1 Sebelum Coding)
- BACA dulu kode yang ADA sebelum menulis kode BARU. Jangan edit file tanpa baca isinya dulu.
- Pahami: flow data end-to-end, dependency antar file, state management, API flow, reusable components.
- Cek apakah fungsi/komponen yang kamu butuhin SUDAH ADA di codebase → pakai ulang, jangan bikin ulang.
- Cek apakah pattern yang kamu butuhin SUDAH ADA (contoh: SSE streaming di `ChatPanel`, patch section di `livePatchPrd`) → ikuti pattern yang sama.

### 📋 Wajib Baca PRD Terkait
- Sebelum implementasi SATU PRD, baca PRD file di `docs/plan/` secara utuh.
- Pahami: scope, user flow normal + negative, UI states (loading/empty/error), API contract, file affected.
- JANGAN implementasi fitur yang ada di "Out of scope".

### 🛑 Jangan Asal & Halusinasi
- JANGAN tebak API, function name, props, atau tipe yang gak ada di codebase.
- Kalo ragu → baca file terkait, cek imports, cek type definitions.
- Kalo bener2 gak tau → tanya user, jangan asumsikan.
- JANGAN generate fitur yang gak ada di PRD. JANGAN nambah "nice to have" tanpa instruksi.

### 📂 Folder & File Convention
- File baru ikutin struktur folder yang ada (existing pattern).
- Jangan bikin file di tempat yang salah. Contoh: komponen task di `src/components/task/`, API route di `src/app/api/task/`.
- Migration files: `migrations/YYYYMMDDHHMMSS_<name>.sql` — ikuti existing naming.

---

## Skill & Plugin Per Fase Implementasi

### Fase 1: Foundation — DB Migration (PRD-10)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `insforge` | ✅ WAJIB | InsForge SDK pattern, auth, RLS policies |
| `ecc:database-reviewer` (agent) | ✅ WAJIB | Review SQL schema, indexes, RLS |
| `supabase-postgres-best-practices` (skill) | ✅ | PostgreSQL pattern (walau InsForge, syntax sama) |
| `ecc:planner` (agent) | ✅ Sebelum mulai | Plan migration order, dependency antar tabel |

**Prompt untuk mulai:**
> "Baca PRD-10 di docs/plan/10-database-evolution.md. Gunakan skill insforge + agent ecc:planner untuk rencanakan migration order. Lalu implement semua 6 migration files."

---

### Fase 1: Foundation — Homepage & Setup Redesign (PRD-01)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `ecc:code-explorer` (agent) | ✅ Sebelum coding | Pahami dulu flow landing → setup → prd saat ini. Baca chat-input.tsx, prompt-handoff.ts, setup-client.tsx |
| `ecc:react-reviewer` (agent) | ✅ WAJIB setelah coding | Review .tsx changes |
| `ecc:typescript-reviewer` (agent) | ✅ | prompt-handoff.ts type safety |
| `mattpocock-skills:codebase-design` (skill) | ✅ | Design setup page 2-kartu opsi |
| `superpowers:subagent-driven-development` (skill) | ✅ Recommended | Dispatch 3 subagents parallel: landing page, setup page, prompt-handoff |

**Prompt untuk mulai:**
> "Implement PRD-01 (Homepage & Setup Redesign) sesuai docs/plan/01-homepage-redesign.md. Baca dulu file terkait dengan ecc:code-explorer. Lalu implement dengan superpowers:subagent-driven-development."

---

### Fase 1: Foundation — Flow Step Nav (PRD-02)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `ecc:react-reviewer` (agent) | ✅ WAJIB | FlowStepNav component, responsive behavior |
| `mattpocock-skills:codebase-design` (skill) | ✅ | Design component API, route detection logic |
| `ecc:silent-failure-hunter` (agent) | ✅ | Edge case: route gak match, step NULL, mobile overflow |

**Prompt untuk mulai:**
> "Implement PRD-02 (Flow Step Navigation) sesuai docs/plan/02-flow-step-navigation.md. Baca navbar.tsx dan app-layout.tsx dulu untuk paham existing structure."

---

### Fase 2: PRD Workspace — PRD Redesign (PRD-03)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `ecc:code-architect` (agent) | ✅ SEBELUM coding | Blueprint: remove sidebar tanpa break chat & TOC |
| `ecc:react-reviewer` (agent) | ✅ WAJIB | prd-detail.tsx rewrite (400+ lines) |
| `ecc:silent-failure-hunter` (agent) | ✅ | Props yg masih dikirim ke component yg dihapus, state yg patah |
| `superpowers:using-git-worktrees` (skill) | ✅ Recommended | Isolasi refactor besar dari main branch |
| `simplify` (skill) | ✅ | Sederhanakan usePanelResize — remove left resize |

**Prompt untuk mulai:**
> "Baca PRD-03 dan kode prd-detail.tsx dulu dengan ecc:code-architect. Implement blueprint-nya, lalu review dengan ecc:react-reviewer."

---

### Fase 3: AC Page (PRD-04)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `ecc:code-architect` (agent) | ✅ SEBELUM coding | Blueprint reuse pattern dari /api/chat buat /api/ac/generate |
| `mattpocock-skills:domain-modeling` (skill) | ✅ | Domain AcFeature, criteria structure, versioning |
| `ecc:react-reviewer` (agent) | ✅ WAJIB | AC viewer, reuse PrdViewer pattern |
| `ecc:typescript-reviewer` (agent) | ✅ | Service layer, JSONB type safety |
| `superpowers:subagent-driven-development` (skill) | ✅ Recommended | 3 agents parallel: API, UI, prompt |
| `simplify` (skill) | ✅ | Jangan bikin komponen chat baru — reuse ChatPanel existing dari src/components/chat/ |
| `insforge` (skill) | ✅ | ac_versions table, insert/query pattern |

**Prompt untuk mulai:**
> "Baca PRD-04. Cari pattern SSE streaming di chat/route.ts dengan ecc:code-explorer. Implement blueprint dengan code-architect. Pakai superpowers subagent-driven-development."

---

### Fase 4: Whiteboard — Task Diagram (PRD-05) ⚠️ RISK TERTINGGI

⚠️ **WAJIB baca ini sebelum mulai:**

| Urutan | Skill/Plugin | Untuk |
|--------|-------------|-------|
| **Langkah 1** | `mattpocock-skills:research` (skill) | Research React Flow (@xyflow/react) vs custom SVG. Ukur bundle size, API complexity, mobile support. |
| **Langkah 2** | `mattpocock-skills:prototype` (skill) | Bikin prototype: 1 canvas, 5 node cards, 3 connectors. Test sendiri. |
| **Langkah 3** | `ecc:architect` (agent) | Decision: library choice, zoom/pan strategy, virtual rendering untuk 100+ nodes. Tulis ADR. |
| **Langkah 4** | `superpowers:using-git-worktrees` (skill) | 🌳 WAJIB — kerja di worktree terisolasi |
| **Langkah 5** | `ecc:code-architect` (agent) | Blueprint: shared canvas component (PRD-05 + PRD-06), auto-layout |
| **Langkah 6** | `superpowers:subagent-driven-development` (skill) | Dispatch subagents: canvas infrastructure, auto-layout, connectors |
| **Langkah 7** | `ecc:react-reviewer` (agent) | WAJIB review — complex React state |
| **Langkah 8** | `ecc:performance-optimizer` (agent) | WAJIB — review performance 50-100 nodes, virtual rendering, connection batching |

**Prompt untuk mulai:**
> "Research dulu library whiteboard dengan mattpocock-skills:research. Compare @xyflow/react vs custom SVG. Kasih report sebelum aku decide."

---

### Fase 4: Whiteboard — Sitemap Tab (PRD-06)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| Same as PRD-05 | ✅ | Reuse canvas component — bedanya cuma node renderer + tree layout |
| `superpowers:verification-before-completion` (skill) | ✅ | Tab switching preserve zoom state, tree layout correct |

**Prompt untuk mulai:**
> "Implement PRD-06 setelah PRD-05 selesai. Reuse whiteboard-canvas yang udah dibikin. Cuma beda node renderer jadi sitemap."

---

### Fase 5: Export — Implementation Options (PRD-07)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `ecc:react-reviewer` (agent) | ✅ | Dropdown, modal, clipboard API, download logic |
| `ecc:code-reviewer` (agent) | ✅ | ZIP generation — edge cases (file not found, empty project) |
| `simplify` (skill) | ✅ | Sederhanakan button state logic — cukup sessionStorage + useState |
| `ecc:security-reviewer` (agent) | ✅ | Pastikan ZIP gak include API key atau data sensitif |

**Prompt untuk mulai:**
> "Implement PRD-07. Baca dulu task-detail.tsx buat tau dimana "Pilih Implementasi" button ditaruh. Simplify button state logic."

---

### Fase 5: Kanban Board (PRD-08)

| Skill/Plugin | Wajib? | Untuk |
|-------------|--------|-------|
| `mattpocock-skills:codebase-design` (skill) | ✅ | Design kanban column component API |
| `ecc:react-reviewer` (agent) | ✅ | 4-column layout, card grouping, count badges |
| `ecc:silent-failure-hunter` (agent) | ✅ | Polling backoff, tab visibility pause, connection lost state |
| `ecc:typescript-reviewer` (agent) | ✅ | use-kanban-polling hook — cleanup on unmount, type safety |

**Prompt untuk mulai:**
> "Implement PRD-08. Baca PRD dulu. Perhatikan: loading skeleton, empty state, error state, polling backoff. Jangan lupa responsive horizontal scroll."

---

### Fase 6: CLI/MCP Tool (PRD-09) ⚠️ RISK MEDIUM-HIGH

⚠️ **WAJIB baca ini sebelum mulai:**

| Urutan | Skill/Plugin | Untuk |
|--------|-------------|-------|
| **Langkah 1** | `mattpocock-skills:research` (skill) | Research @modelcontextprotocol/sdk latest API, npm package structure |
| **Langkah 2** | `ecc:architect` (agent) | System design: monorepo vs separate repos, API v1 auth flow, MCP tool schema |
| **Langkah 3** | `ecc:security-reviewer` (agent) | ✅ WAJIB — API key storage (SHA-256), rate limiting, scope, CORS |
| **Langkah 4** | `superpowers:using-git-worktrees` (skill) | 🌳 Recommended — packages/mcp-server di worktree terpisah |
| **Langkah 5** | `superpowers:subagent-driven-development` (skill) | 3 agents parallel: mcp-server, api-key UI, API v1 routes |
| **Langkah 6** | `ecc:code-reviewer` (agent) | Final review keamanan + kualitas |

**Prompt untuk mulai:**
> "Baca PRD-09. Research dulu @modelcontextprotocol/sdk API dengan mattpocock-skills:research. Report ke aku sebelum implementasi."

---

## Ringkasan Agent Dispatch Logic

```
┌──────────────────────────────────────────────────────────────┐
│                  DECISION TREE: AGENT SELECTION               │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  Baca PRD file → pahami scope, file affected, API contract   │
│       ↓                                                       │
│  Cek codebase → baca file yg akan diubah (READ dulu!)         │
│       ↓                                                       │
│  Complex layout restructure? → ecc:code-architect            │
│  Performance sensitive? → ecc:performance-optimizer          │
│  Security impact? → ecc:security-reviewer                     │
│  Database changes? → ecc:database-reviewer                    │
│  .tsx changes? → ecc:react-reviewer (WAJIB)                   │
│  .ts non-React? → ecc:typescript-reviewer                     │
│  Parallel tasks? → superpowers:subagent-driven-development    │
│  Risky refactor? → superpowers:using-git-worktrees           │
│                                                               │
│  Setelah implement:                                           │
│  npm run build → fix error → review agent → commit            │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

## Verbose Prompt Template per Fase

Copy-paste ini untuk mulai tiap fase:

### Fase 1
```
Baca docs/plan/10-database-evolution.md dan docs/plan/01-homepage-redesign.md dan docs/plan/02-flow-step-navigation.md.
Gunakan ecc:code-explorer untuk pahami dulu struktur kode yang ada.
Implement semua sesuai PRD dengan superpowers:subagent-driven-development.
Wajib: ecc:react-reviewer setelah semua file diubah.
```

### Fase 2
```
Baca docs/plan/03-prd-page-redesign.md.
Gunakan ecc:code-architect untuk blueprint restructure PrdDetail.
Implement dengan superpowers:subagent-driven-development.
Wajib: ecc:react-reviewer + ecc:silent-failure-hunter.
```

### Fase 3
```
Baca docs/plan/04-acceptance-criteria.md.
Trace dulu pattern SSE streaming di src/app/api/chat/route.ts dengan ecc:code-explorer.
Implement dengan superpowers:subagent-driven-development (3 subagents: API, UI, prompt).
Wajib: ecc:react-reviewer + ecc:typescript-reviewer.
```

### Fase 4
```
Baca docs/plan/05-whiteboard-task-diagram.md dan docs/plan/06-sitemap-whiteboard.md.
Langkah 1: research library dengan mattpocock-skills:research.
Langkah 2: prototype dengan mattpocock-skills:prototype.
Setuju dulu sama user sebelum coding.
```

### Fase 5
```
Baca docs/plan/07-implementation-options.md dan docs/plan/08-kanban-board.md.
Implement dengan superpowers:subagent-driven-development.
Wajib: ecc:react-reviewer + ecc:silent-failure-hunter (kanban polling).
```

### Fase 6
```
Baca docs/plan/09-cli-mcp-tool.md.
Langkah 1: research @modelcontextprotocol/sdk dengan mattpocock-skills:research.
Langkah 2: architect design dengan ecc:architect.
Setuju dulu sama user sebelum coding.
Wajib: ecc:security-reviewer.
```

---

## Aturan Ponytail — Spesifik Implementasi

- **Reuse > Rewrite**: Udah ada ChatPanel? Pakai ulang buat AC chat. Udah ada PrdViewer? Pakai pattern yang sama buat AC Viewer.
- **Jangan tambah dependency**: Kalo bisa pake CSS transform buat zoom/pan, jangan instal library. Kalo terpaksa React Flow, itung dulu bundle size impact.
- **Satu komponen, satu tanggung jawab**: Jangan bikin komponen raksasa. Pecah kalo udah >300 lines.
- **Hapus kode mati**: Sidebar dihapus di PRD-03? Hapus juga filenya, jangan cuma di-unmount.
- **Skip test framework berat**: Test cukup pake assert basic. Jangan instal testing library baru.

### Daftar komponen/pattern yang WAJIB dicek ulang (jangan bikin ulang):
| Yang udah ada | Lokasi | Bisa dipake ulang untuk |
|--------------|--------|------------------------|
| ChatPanel | `src/components/chat/chat-panel.tsx` | AC chat, kanban detail modal |
| PrdViewer | `src/components/prd/prd-viewer.tsx` | Template AC Viewer |
| livePatchPrd | `src/components/chat/chat-panel.tsx:20-40` | AC revision patching |
| SSE stream reader | `src/components/chat/chat-panel.tsx:149-337` | AC generation streaming |
| TOC | `src/components/prd/table-of-contents.tsx` | AC TOC (reuse with different parser) |
| VersionHistory | `src/components/prd/version-history.tsx` | AC version history |
| LimitModal | `src/components/chat/limit-modal.tsx` | All quota-related modals |
| ResumeErrorModal | `src/components/chat/resume-error-modal.tsx` | AC resume modal |
| ModelDropdown | `src/components/chat/model-dropdown.tsx` | AI model selection (reuse as-is) |
| usePanelResize | `src/hooks/use-panel-resize.ts` | Right panel resize |
| prompt-handoff | `src/lib/prompt-handoff.ts` | SessionStorage prompt bridge |
| auth helpers | `src/lib/auth.ts` | Server-side auth di semua API routes |
| RLS pattern | `migrations/*.sql` | RLS policies for new tables |
| cn() utility | `src/lib/utils.ts` | Classname merging (existing pattern) |

---

## Final Checklist — Sebelum Commit Tiap PRD

- [ ] Baca PRD file — semua requirement terpenuhi?
- [ ] `npm run build` — 0 error?
- [ ] Semua UI states (loading, empty, error, active) ada?
- [ ] Mobile responsive tested?
- [ ] Negative flow handled?
- [ ] Flow step nav update sesuai (kalo relevan)?
- [ ] RLS policies applied?
- [ ] `ecc:react-reviewer` udah jalan (untuk .tsx)?
- [ ] `ecc:silent-failure-hunter` udah jalan (untuk logic complex)?
- [ ] Kode mati udah dihapus (sidebar, unused imports)?
- [ ] `ecc:typescript-reviewer` udah jalan?

---

*Dokumen ini referensi untuk setiap implementasi fase. Baca ulang sebelum mulai fase baru.*
