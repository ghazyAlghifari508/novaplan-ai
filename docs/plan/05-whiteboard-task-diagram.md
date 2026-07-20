# PRD-05: Whiteboard / Task Diagram Page

## Problem
Tasks from AC need visual structure. Linear lists obscure dependencies, feature grouping, and hierarchy. n8n/LangFlow-style node diagram lets developers intuitively understand work breakdown. This is the core UX differentiator of the vibecoding platform.

## Referensi Visual
Foto contoh ada di `docs/fotocontoh/contohfotountukfiturgeneratetask.png`. Warna & tema di foto TIDAK diikuti (foto putih, app kita dark theme). Yang diikuti: layout node cards, connector lines, hierarchy features→tasks→subtasks, zoom/pan canvas.

## Scope
**In:** New route `/task/[projectId]`, AI generates features→tasks→subtasks from AC, interactive canvas (zoom/pan/drag), node cards with connectors, auto-layout, "Task Board" + "Sitemap" tabs, zoom controls, "Pilih Implementasi" button, Flow Step Nav step 3 active.

**Out:** Drag-to-reposition nodes (MVP uses auto-layout, position saving later), collapsible feature groups, manual node creation.

---

## UI Layout (from foto contoh)

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar — Step 3 active        [Pilih Implementasi]           │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│    ┌─────── Feature: Auth ──────────┐                        │
│    │  ┌─── Task: Login API ───────┐ │                        │
│    │  │  ○ Validasi input         │ │                        │
│    │  │  ○ Generate JWT token     │ │                        │
│    │  │  ○ Integrasi OTP         │ │                        │
│    │  └──────────────────────────┘ │                        │
│    │                               │                        │
│    │  ┌─── Task: Register API ────┐ │                        │
│    │  │  ○ Form validation        │ │                        │
│    │  │  ○ Email verification     │ │                        │
│    │  └──────────────────────────┘ │                        │
│    └───────────────────────────────┘                        │
│                                                               │
│    ┌─────── Feature: Dashboard ────┐                        │
│    │  ┌─── Task: Charts ──────────┐ │                        │
│    │  │  ○ Data fetching          │ │                        │
│    │  │  ○ UI components          │ │                        │
│    │  └──────────────────────────┘ │                        │
│    └───────────────────────────────┘                        │
│                                      [+] [−] [100%] [Reset] │
├──────────────────────────────────────────────────────────────┤
│  [Task Board] [Sitemap]                                      │
└──────────────────────────────────────────────────────────────┘
```

- Kanvas: full width/height, dark background (`bg-onyx`)
- Grid dots subtle (CSS background)
- Feature cards: border-left colored (auto-assign warna per fitur)
- Task cards: nested di dalam feature, list subtask
- Connector lines antar task yg depend: garis SVG curved putus-putus
- Zoom controls bottom-right
- Tab "Task Board" | "Sitemap" di atas kanvas

---

## User Flows

### Normal Flow
1. User on `/ac/[projectId]` clicks "Lanjut Generate Task"
2. Redirect to `/task/[projectId]`
3. Page loads: canvas empty, "Generate Task Tree" button prominent
4. User clicks generate
5. AI receives: PRD content + AC content → generates structured JSON
6. Server saves to DB → returns structured tree
7. Auto-layout positions nodes per foto contoh
8. Canvas auto-zooms to fit all nodes (fit-to-screen on first load)

### Normal Flow: Node Interaction
1. Hover task card → subtle scale-up + shadow
2. Click task card → modal/bottom-sheet with detail: description, status, dependensi, subtask list
3. Subtask items: checkbox + nama (seperti list di foto contoh)
4. Feature header: nama fitur + color bar

### Flow: Mobile (<768px)
- Canvas disabled, fallback ke stacked accordion
- Feature = accordion header, click to expand
- Tasks = nested list with subtask checkboxes
- Zoom/pan not needed

### Negative Flow A: No AC Content
- "Acceptance Criteria belum digenerate. Generate AC terlebih dahulu."
- Link ke `/ac/[projectId]`

### Negative Flow B: AI Generate Failed
- Incomplete JSON → validation error → toast + retry
- No partial tree rendered

### Negative Flow C: Empty Features (AI gak nemu fitur)
- "AI tidak dapat mengidentifikasi fitur. Coba refine AC."

---

## UI States

### Loading
- Canvas skeleton: 3-4 feature card outlines + 2-3 task outlines per feature
- Center spinner: "Menyusun task tree..."

### Empty State (pre-generate)
- "Task tree belum dibuat"
- "Generate Task Tree" primary button
- "Kembali ke AC" secondary link

### Active State
- Kanvas penuh dengan grid dots
- Feature cards with colored border
- Task cards with subtask list
- Zoom controls bottom-right
- Tab bar top: [Task Board] [Sitemap]

### Error State
- "Gagal memuat task tree" + retry
- "Hubungi support" link

### Warning State (AC changed)
- Yellow banner: "AC berubah. [Regenerate task tree]"

---

## Component Tree

```
TaskPage (/task/[id])
├── TaskDetail (NEW)
│   ├── TabBar (Task Board | Sitemap)
│   ├── WhiteboardCanvas (SHARED with PRD-06)
│   │   ├── CanvasGrid (CSS dot pattern)
│   │   ├── CanvasLayer (CSS transform container)
│   │   │   ├── FeatureGroup (×N)
│   │   │   │   ├── FeatureCard (header, color bar)
│   │   │   │   └── TaskNode (×N per feature)
│   │   │   │       └── SubtaskItem (list inside task)
│   │   │   └── ConnectionLines (SVG overlay)
│   │   └── ZoomControls (+, -, %, Reset)
│   ├── EmptyState / LoadingState / ErrorState
│   └── MobileFallback (accordion list)
└── Navbar → [Pilih Implementasi] button
```

---

## Node Card Specs

### Feature Card
```
┌──────────────────────────────────┐
│ ██ Auth                          │  ← color bar + name
│ ┌─ Task: Login API ──────────┐   │
│ │ ○ Validasi input           │   │
│ │ ○ Generate JWT token       │   │
│ │ ○ Integrasi OTP            │   │
│ └────────────────────────────┘   │
│ ┌─ Task: Register API ───────┐   │
│ │ ○ Form validation          │   │
│ │ ○ Email verification       │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
```
- Background: `bg-obsidian`, border: `border-graphite`
- Left border: 3px, warna auto-assign per fitur (indigo, emerald, amber, dll)
- Width: responsive (min 280px, max 400px)
- Rounded corners: 8px

### Task Node (when not inside feature — standalone)
```
┌────────────────────────────┐
│ 🔧 Login API               │  ← icon + name
│ Buat endpoint POST /login  │  ← description (1 line)
│ ○ 3 subtasks               │  ← count
│ [pending]                   │  ← status badge
│ ═════════════════════════  │  ← separator
│ ↪ depends on: User Schema  │  ← dependency (if any)
└────────────────────────────┘
```

### Subtask Item (inside task card)
```
○ Validasi input email       ← checkbox style + name
● Generate JWT token         ← filled = completed
○ Integrasi OTP
```

### Connection Lines
- SVG overlay, absolute positioned on canvas
- Feature→Task: solid line, `stroke-graphite`, 1.5px
- Task→Subtask: dotted line (inside task card, visual indent)
- Cross-feature dependency: dashed, colored
- Arrow markers on dependency endpoints

---

## Data Model & API Contract

### POST /api/task/generate
```typescript
// REQUEST: { projectId }
// RESPONSE:
{
  features: Array<{
    id: string;
    name: string;
    description: string;
    order: number;
    tasks: Array<{
      id: string;
      name: string;
      description: string;
      order: number;
      dependencies: string[];  // Task IDs
      subtasks: Array<{
        id: string;
        name: string;
        description: string;
        order: number;
      }>;
    }>;
  }>;
}
```

### GET /api/task/[projectId]
```typescript
// RESPONSE
{
  features: Feature[];
  tasks: Task[];
  subtasks: Subtask[];
  status: 'pending' | 'generating' | 'completed';
}
```

---

## Files Affected

| File | Action |
|------|--------|
| `src/app/task/[id]/page.tsx` | CREATE |
| `src/app/task/[id]/loading.tsx` | CREATE |
| `src/app/task/[id]/error.tsx` | CREATE |
| `src/app/api/task/generate/route.ts` | CREATE |
| `src/app/api/task/[pid]/route.ts` | CREATE |
| `src/components/task/task-detail.tsx` | CREATE |
| `src/components/task/whiteboard-canvas.tsx` | CREATE (SHARED) |
| `src/components/task/feature-card.tsx` | CREATE |
| `src/components/task/task-node.tsx` | CREATE |
| `src/components/task/subtask-item.tsx` | CREATE |
| `src/components/task/connection-lines.tsx` | CREATE |
| `src/components/task/zoom-controls.tsx` | CREATE |
| `src/components/task/tab-bar.tsx` | CREATE |
| `src/lib/services/task-service.ts` | CREATE |
| `src/lib/prompts-task.ts` | CREATE |
| `src/hooks/use-canvas-zoom.ts` | CREATE (shared) |

## Open Questions
- [ ] Library: `@xyflow/react` vs custom SVG canvas? React Flow provides connectors/zoom but ~100KB. Custom = more dev time but lighter.
- [ ] Auto-layout: dagre (hierarchical) vs simple top-down column?
- [ ] Color assignment per feature: sequential palette (indigo, emerald, amber, crimson)?

## Dependencies
- PRD-04 (AC must exist)
- PRD-02 (flow nav)
- PRD-10 (DB migration)
- Blocking: PRD-06, PRD-07, PRD-08

## Effort
- New files: ~16
- Complexity: **HIGHEST**
