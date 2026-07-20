# PRD-08: Auto-Updating Kanban Board

## Problem
Once implementation starts, user needs progress visibility across features/tasks/subtasks. Manual kanban is friction. AI coding agent reports status → kanban updates automatically. No task tracking exists in app.

## Scope
**In:** New page `/kanban/[projectId]`, 4 columns (Belum Mulai/Dikerjakan/Selesai/Gagal), all tasks/subtasks as cards, auto-polling via API, count badges, loading/empty/error states, responsive horizontal scroll on mobile.

**Out:** Manual drag-and-drop reordering (phase 2), WebSocket real-time (polling MVP), multi-user assignment, Gantt chart.

---

## User Flows

### Normal Flow
1. User clicks "Mulai Implementasi" → redirect to `/kanban/[projectId]`
2. Kanban shows 4 columns with all tasks + subtasks:
   - "Belum Mulai": all tasks initially (count badge: 12)
   - "Dikerjakan": 0
   - "Selesai": 0
   - "Gagal": 0
3. Cards grouped by feature (feature header within column)
4. Polling starts: every 10 seconds, GET `/api/kanban/[projectId]`
5. CLI/MCP reports task completed → server updates DB
6. Next poll: card moves from "Belum Mulai" → "Selesai" with animation (brief yellow flash)

### Flow: View Task Details
1. User clicks card → modal/bottom-sheet with task details:
   - Name, description, feature name
   - Dependencies list
   - Subtask checklist
   - Started at, completed at timestamps

### Flow: Mobile
1. Horizontal scroll: 4 columns side-by-side, scrollable horizontally
2. Column header with count stays fixed
3. Card taps → bottom sheet with details
4. Pull-to-refresh for manual poll

### Negative Flow A: No Tasks
1. User lands on kanban but no tasks exist
2. "Belum ada task. Generate task tree terlebih dahulu."
3. Link to `/task/[projectId]`
4. All columns show empty state illustrations

### Negative Flow B: Poll Fails
1. After 3 consecutive failed polls (network/server error)
2. Warning banner: "Koneksi ke server terputus. Menampilkan data terakhir."
3. Data shown from last successful response
4. Retry button: "Coba lagi"
5. If 10 consecutive fails → show error state fully

### Negative Flow C: CLI/MCP Not Connected
1. After 1 hour with zero status updates
2. Info banner: "Belum ada update status. Pastikan CLI/MCP terhubung."
3. Link to settings: "Buat API Key"
4. Kanban still shows all tasks as "Belum Mulai" (functional but static)

---

## UI States

### Loading
- 4 skeleton columns with 3-4 skeleton cards each (gray blocks)
- Shimmer animation per card
- No count badges

### Active State
- 4 columns in flex row
- Cards grouped by feature within column
- Feature group header: feature name + color bar
- Count badge per column header
- Cards show: name, feature badge, subtask count, dependency count
- Auto-scroll to recently changed card (highlighted)

### Empty State (pre-generation)
- "Task tree belum digenerate" centered
- Illustration: kanban board icon
- "Generate Task Tree" button → redirect to `/task/[projectId]`

### Error State (data unavailable)
- "Gagal memuat kanban" centered
- Retry button
- If partial data available: show stale data + warning banner

### Banner States
- **No connection banner**: yellow, dismissable
- **No CLI/MCP banner**: blue, contains link to settings
- **AC changed warning**: yellow, "Task mungkin tidak sesuai AC terbaru"
- **Polling retrying**: orange, auto-dismiss on success

---

## Layout Spec

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar — Step 3 active (Step 1 ✓, Step 2 ✓)               │
├──────────────────────────────────────────────────────────────┤
│                              (banners)                       │
│  ┌──────Belum Mulai──────┐ ┌───Dikerjakan────┐ ┌──Selesai──┐ │
│  │ ● 12 tasks            │ │ ● 3 tasks       │ │ ● 8 tasks │ │
│  │ ───────────────────── │ │ ──────────────── │ │ ─────────  │ │
│  │ ┌─ Auth ──────────┐   │ │ ┌─ Dashboard ─┐ │ │ ┌─ Auth─┐  │ │
│  │ │ Login API       │   │ │ │ Charts      │ │ │ │ JWT  │  │ │
│  │ │ Register API    │   │ │ │             │ │ │ │ OTP  │  │ │
│  │ │ Forgot Pass     │   │ │ │             │ │ │ └──────┘  │ │
│  │ └─────────────────┘   │ │ └─────────────┘ │ │ ┌─ Dash─┐ │ │
│  │ ┌─ Dashboard ──────┐  │ │                 │ │ │ Data  │ │ │
│  │ │ User Schema       │  │ │                 │ │ └──────┘  │ │
│  │ └─────────────────┘  │ │                 │ │           │ │
│  └──────────────────────┘ └─────────────────┘ └───────────┘ │
│                              ┌────Gagal──────┐               │
│                              │ ● 1 task      │               │
│                              │               │               │
│                              │ ┌─ Auth ────┐ │               │
│                              │ │ S3 Upload │ │               │
│                              │ └───────────┘ │               │
│                              └───────────────┘               │
├──────────────────────────────────────────────────────────────┤
└──────────────────────────────────────────────────────────────┘
```

### Card Spec
```
┌──────────────────────────┐
│ 🔧 Login API             │  ← name with icon
│ ftr: Auth                │  ← feature badge (colored dot + name)
│ ○ 3 subtasks             │  ← subtask count (if any)
│ ↪ depends on User Schema │  ← dependency (if any)
│ ────────                  │
│ started: 10:30           │  ← timestamp (if in_progress)
└──────────────────────────┘
```
- Width: 260px min, full column width on mobile
- Padding: 12px
- Background: `bg-obsidian`, border radius 8px, shadow on hover
- Border-left: 3px feature color

---

## Component Tree

```
KanbanPage (/kanban/[id])
├── KanbanBoard
│   ├── KanbanBanner (connection/MCP status)
│   ├── KanbanColumn (×4)
│   │   ├── ColumnHeader (name + count badge)
│   │   ├── FeatureGroup (×N per column)
│   │   │   ├── FeatureGroupHeader (colored bar + name)
│   │   │   └── TaskCard (×N per feature)
│   │   │       └── SubtaskProgress (○ 2/5 subtasks)
│   │   └── EmptyColumn (illustration if 0 cards)
│   └── ZoomControls? No — kanban is scroll, not canvas
```

---

## API Contract

### GET /api/kanban/[projectId]
```typescript
// RESPONSE
{
  columns: {
    pending: TaskCard[];        // "Belum Mulai"
    in_progress: TaskCard[];    // "Dikerjakan"
    completed: TaskCard[];      // "Selesai"
    failed: TaskCard[];         // "Gagal"
  };
  staleness: 'live' | 'stale' | 'disconnected';
  lastUpdateAt: string;         // ISO timestamp
}

interface TaskCard {
  id: string;
  type: 'task' | 'subtask';
  parentId?: string;            // feature_id for tasks, task_id for subtasks
  featureName: string;
  name: string;
  description: string;
  status: string;
  subtaskCount?: number;
  subtaskCompleted?: number;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
}
```

### POST /api/kanban/update-status (from CLI/MCP)
```typescript
// REQUEST
{
  apiKey: string;              // Bearer token
  projectId: string;
  taskType: 'task' | 'subtask';
  taskId: string;
  status: 'in_progress' | 'completed' | 'failed';
  message?: string;            // Optional failure reason
}
```

---

## Polling Hook (use-kanban-polling.ts)

```typescript
interface UseKanbanPollingOptions {
  projectId: string;
  intervalMs?: number;          // Default 10000 (10s)
  enabled?: boolean;            // Pause polling when tab not visible
}

interface UseKanbanPollingReturn {
  data: KanbanData | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  staleness: 'live' | 'stale' | 'disconnected';
  refetch: () => Promise<void>;
}

// Behavior:
// - Poll on mount
// - Poll every intervalMs
// - Pause when document.hidden = true (Page Visibility API)
// - Resume on visibility change
// - Backoff: on consecutive errors, increase interval (10s → 30s → 60s)
// - Reset to 10s on successful poll
// - Max 3 failed polls before showing stale state
```

---

## DB Schema (status columns already in tasks/subtasks per PRD-10)

No new tables. Uses existing `tasks.status` and `subtasks.status` added in PRD-10 migration.

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/app/kanban/[id]/page.tsx` | **CREATE** | New route |
| `src/app/kanban/[id]/loading.tsx` | **CREATE** | Skeleton |
| `src/app/kanban/[id]/error.tsx` | **CREATE** | Error boundary |
| `src/app/api/kanban/[pid]/route.ts` | **CREATE** | GET kanban data |
| `src/app/api/kanban/update-status/route.ts` | **CREATE** | POST status update |
| `src/components/kanban/kanban-board.tsx` | **CREATE** | Main board layout |
| `src/components/kanban/kanban-column.tsx` | **CREATE** | Column with cards |
| `src/components/kanban/kanban-card.tsx` | **CREATE** | Task card |
| `src/components/kanban/feature-group.tsx` | **CREATE** | Card group by feature |
| `src/components/kanban/kanban-banner.tsx` | **CREATE** | Status banners |
| `src/hooks/use-kanban-polling.ts` | **CREATE** | Polling logic |

---

## Edge Cases
- [ ] Task with 0 subtasks → show no subtask indicator (hide ○)
- [ ] All tasks completed → column "Selesai" expands to fill width, subtle celebration confetti?
- [ ] Feature spans multiple columns → cards in different columns but grouped consistently
- [ ] 100+ cards in one column → column scrolls internally, virtual scroll if >50
- [ ] Project archived → kanban becomes read-only (no status updates accepted)
- [x] Same task updated twice rapidly → last-write-wins (CLI sends PUT, not increment)
- [ ] User has kanban open in 2 tabs → both poll, eventual consistency fine

## Security
- Protected by middleware (`/kanban/*`)
- API validates project ownership (existing RLS)
- Status update endpoint validates API key (Bearer token) against `api_keys` table
- Rate limit status updates: 30 updates/minute per API key

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| No CLI/MCP → kanban never updates | High | High | Manual mark-as-complete option phase 2 for MVP |
| Polling creates server load with many users | Medium | Medium | Backoff when tab hidden, cached responses |
| Status update race condition | Low | High | last-write-wins with timestamp comparison |

## Dependencies
- PRD-05 (tasks/subtasks exist)
- PRD-07 (redirect from "Mulai Implementasi")
- PRD-09 (CLI/MCP for auto-updates — without it, kanban is static but functional)
- PRD-10 (DB schema)

## Effort Estimate
- New files: 11
- Complexity: Medium
