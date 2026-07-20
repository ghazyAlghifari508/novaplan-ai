# PRD-04: Acceptance Criteria Generation Page

## Problem
After PRD is done, user needs structured acceptance criteria per feature before coding. Current app stops at PRD — no AC generation exists. User would manually derive AC, breaking the automated pipeline. AC must strictly derive from PRD content (no hallucination).

## Scope
**In:** New route `/ac/[projectId]`, AI generates AC from PRD via SSE streaming, AC saved as structured JSONB (per-feature criteria), TOC sidebar, chat revision panel, version tracking, "Revisi AC Dulu" + "Lanjut Generate Task" buttons, flow step nav (step 1 ✓, step 2 active).

**Out:** AC template customization (fixed format for MVP), collaborative editing, auto-generate on first visit (user clicks "Generate AC" button).

---

## User Flows

### Normal Flow
1. User on `/prd/[id]` clicks "Lanjut Bikin Acceptance Criteria"
2. Redirected to `/ac/[projectId]`
3. Page loads: AC status = "pending", shows empty state with "Generate AC" button
4. User clicks "Generate AC"
5. SSE streaming begins: AI generates per-feature AC based on latest PRD version
6. AC sections appear progressively in viewer (same SSE pattern as PRD)
7. On complete: status becomes "completed", toast "AC berhasil digenerate"
8. User can read, scroll TOC, revise via chat

### Flow: Revise AC
1. User clicks "Revisi AC Dulu" (or chat icon toggle)
2. Chat panel opens right side (reuse ChatPanel component)
3. User types e.g. "Tambah kriteria untuk error handling di fitur login"
4. SSE stream patches AC sections using `:::UPDATE_SECTION[name]:::` markers (same pattern as PRD revision)
5. Chat bubble shows confirmation message

### Flow: Continue to Task
1. User clicks "Lanjut Generate Task"
2. POST to update `projects.step = 'task'`
3. Redirect to `/task/[projectId]`

### Negative Flow A: No PRD Content
1. User visits `/ac/[projectId]` where PRD has no content
2. AC generation disabled
3. Message: "PRD belum tersedia. Selesaikan PRD terlebih dahulu."
4. Link back to `/prd/[projectId]`

### Negative Flow B: AC Generation Fails Mid-Stream
1. SSE drops after partial AC generated
2. Resume modal appears (same as existing PRD resume modal)
3. User can pick alternative AI model and resume from last successful chunk
4. If user cancels: partial AC saved, user can revise via chat

### Negative Flow C: AC Hallucination (AI adds features not in PRD)
1. AI generates AC with feature "Fitur Manajemen Inventaris" that wasn't in PRD
2. Detection: compare AC feature names against PRD sections/highlights
3. Warning badge: "Beberapa AC mungkin tidak sesuai PRD. Review sebelum lanjut."
4. User revises via chat to remove hallucinated items

### Flow: Mobile
1. Same responsive pattern as PRD-03
2. TOC hidden <768px, toggle via hamburger
3. Chat: bottom sheet 60vh when opened
4. Action buttons stack vertically on mobile

---

## UI States

### Loading / Generating
- AC Viewer shows skeleton sections (3-4 gray blocks with shimmer)
- TOC shows gray placeholder text
- Generating indicator: pulsing dot + "AI sedang menyusun Acceptance Criteria..."
- Cancel button available (stops SSE via AbortController)

### Empty State (pre-generation)
- "Acceptance Criteria belum digenerate" centered
- "Generate AC" primary button (disabled if no PRD content)
- "Kembali ke PRD" secondary link

### Active State (AC loaded)
- AC rendered as structured sections per feature
- Each feature section: heading with feature name → bullet-point criteria list
- TOC lists feature names with scroll-spy highlight
- Version badge "v1" at top
- Action buttons: "Revisi AC Dulu" (secondary) | "Lanjut Generate Task" (primary)

### Error State (fetch/generation failed)
- Error boundary with retry
- "Gagal memuat AC. Coba refresh."
- Partial content preserved if any

### Revision State
- Chat panel open (right or bottom-sheet)
- `:::UPDATE_SECTION[Feature Name]:::` markers patch specific feature sections
- Visual flash on updated section (brief yellow highlight)

---

## Layout Spec (Desktop, same as PRD-03)

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar — Step 2 active (Step 1 ✓)                          │
├──────┬─────────────────────────────────────┬─────────────────┤
│ TOC  │  AC VIEWER                          │  CHAT (optional)│
│      │  ┌─ v1 ──────────────────────────┐  │                 │
│ •Ftr1│  │  ## Feature: Auth Login       │  │  Chat Header    │
│ •Ftr2│  │  ### Acceptance Criteria      │  │  ─────────────  │
│ •Ftr3│  │  - [ ] Email format validated │  │  Messages       │
│ •Ftr4│  │  - [ ] Password min 8 chars   │  │  ...            │
│      │  │  - [ ] OTP flow works         │  │                 │
│      │  │  - [ ] Error shown on fail    │  │  Input Area     │
│      │  │  ## Feature: Dashboard        │  │                 │
│      │  │  ...                          │  │                 │
│      │  └───────────────────────────────┘  │                 │
│      │  [Revisi AC Dulu] [→ Generate Task] │                 │
├──────┴─────────────────────────────────────┴─────────────────┤
└──────────────────────────────────────────────────────────────┘
```

---

## API Contract

### POST /api/ac/generate
```typescript
// REQUEST
{
  projectId: string;
  conversationId?: string;
}

// RESPONSE (SSE stream)
// data: {"type":"started"}
// data: {"type":"delta","content":"## Acceptance Criteria\n\n### Feature: Auth Login\n..."}
// data: {"type":"done","acVersionId":"...","version":1}
// data: {"type":"error","error":"...","partialContent":"..."}
```

### POST /api/ac/revise
```typescript
// REQUEST
{
  message: string;
  mode: "ac_revise";
  projectId: string;
  conversationId: string;
  currentAcContent: string;
}

// RESPONSE — same SSE as PRD revision
// Uses :::UPDATE_SECTION[Feature Name]::: markers for patching
```

### GET /api/ac/[projectId]
```typescript
// RESPONSE
{
  acVersions: Array<{
    id: string;
    version: number;
    content: AcFeature[];   // Structured JSONB
    change_summary: string | null;
    created_at: string;
  }>;
  currentVersion: number;
  latestContent: AcFeature[];
}

// AcFeature type
interface AcFeature {
  featureName: string;
  criteria: string[];       // Array of AC statements
}
```

---

## Component Tree

```
AcPage (/ac/[id])
├── AcDetail (NEW — analogous to PrdDetail)
│   ├── TableOfContents (reuse from PRD-03, modified for AC features)
│   ├── AcViewer (NEW — renders structured AC)
│   │   ├── AcFeatureSection (×N)
│   │   │   ├── FeatureHeader
│   │   │   └── CriteriaList (checklist of AC items)
│   │   └── ActionButtons ("Revisi AC Dulu" / "Lanjut Generate Task")
│   ├── ChatPanel (reuse existing, AC mode)
│   └── ResumeModal (reuse existing)
└── Navbar (existing) → FlowStepNav: Step 2 active
```

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/app/ac/[id]/page.tsx` | **CREATE** | New route |
| `src/app/ac/[id]/loading.tsx` | **CREATE** | Loading skeleton |
| `src/app/ac/[id]/error.tsx` | **CREATE** | Error boundary |
| `src/components/ac/ac-detail.tsx` | **CREATE** | Main layout (analogous to prd-detail) |
| `src/components/ac/ac-viewer.tsx` | **CREATE** | AC rendering component |
| `src/app/api/ac/generate/route.ts` | **CREATE** | AC generation endpoint |
| `src/app/api/ac/revise/route.ts` | **CREATE** | AC revision endpoint |
| `src/lib/services/ac-service.ts` | **CREATE** | AC DB operations |
| `src/lib/prompts-ac.ts` | **CREATE** | AC generation prompt |
| `src/lib/model-config.ts` | Modify (minor) | Add AC mode to model selection |
| `migrations/YYYYMMDDHHMMSS_add_ac_versions.sql` | **CREATE** | DB migration |

---

## DB Schema (ac_versions)

```sql
CREATE TYPE ac_status AS ENUM ('pending', 'generating', 'completed');

CREATE TABLE ac_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '[]',   -- AcFeature[] array
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add to projects table
ALTER TABLE projects ADD COLUMN ac_status ac_status NOT NULL DEFAULT 'pending';
```

---

## Prompts (src/lib/prompts-ac.ts)

```typescript
export const AC_GENERATION_PROMPT = `Kamu adalah NovaPlan, AI yang ahli membuat Acceptance Criteria.
Tugasmu: berdasarkan PRD berikut, buat Acceptance Criteria untuk setiap fitur yang disebutkan.

## ATURAN MUTLAK:
1. HANYA buat AC untuk fitur yang ADA di PRD. JANGAN menambahkan fitur baru.
2. Setiap AC harus spesifik, terukur, dan testable.
3. Format output per fitur:
   Feature: [Nama Fitur sesuai PRD]
   - [ ] [Kriteria 1]
   - [ ] [Kriteria 2]
   ...

PRD CONTENT:
{prdContent}`;
```

---

## Edge Cases / Open Questions
- [ ] PRD mentions a feature but doesn't detail it → AI should create basic AC with note "detail terbatas di PRD"
- [x] Multiple PRD versions → AC always based on LATEST version
- [ ] AC generated, user revises PRD → AC becomes potentially stale. Show warning badge: "PRD berubah sejak AC digenerate. Review AC."
- [ ] Very long PRD (50+ pages) → AC generation may hit token limits. Stream in chunks, resume if interrupted.
- [x] User navigates away during AC generation → AC continues server-side, saved on completion. Next visit shows completed content.

## Security
- Route protected by middleware (match `/ac/*`)
- API validates project ownership via `requireAuth()` + project_id check
- RLS on ac_versions: owner only (via project_id → user_id join)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| AI hallucinates AC not in PRD | High | High | Strict prompt constraint; AC-to-PRD cross-reference warning |
| AC too generic to be useful | Medium | Medium | Prompt engineering: require specific, testable criteria with examples |
| User community expects AC in different format | Medium | Low | Structured JSONB allows multiple renderers later |

## Dependencies
- PRD-03 (layout pattern)
- PRD-02 (flow step nav)
- PRD-10 (DB migration)

## Effort Estimate
- New files: 10
- Files modified: 2
- Complexity: High (AI prompt engineering is critical path)
