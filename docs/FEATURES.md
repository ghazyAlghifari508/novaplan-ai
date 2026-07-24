# NovaPlan AI — Features

## 1. PRD Generation (Core)

### Purpose
Convert short product description → professional 8-section PRD via AI.

### Flow
```
User: "Buat aplikasi e-commerce fashion..."
  → ChatInput (landing) → /setup → POST /api/chat (mode:generate)
  → SSE stream → PrdViewer live update
  → Server saves prd_versions → router.refresh()
```

### Entry Points
- `/` → `ChatInput` → `handleSend()` → sessionStorage → redirect `/setup`
- `/setup` → `SetupClient` → auto-submit via `ChatPanel.handleSendWithMessage()`
- `/prd/[id]` → `PrdDetail` → `PrdViewer` + `ChatPanel`

### Key Files
| File | Role |
|------|------|
| `chat-input.tsx` | Landing page prompt input |
| `setup-client.tsx` | Auto-submit flow |
| `chat-panel.tsx` | SSE handler, section tracking |
| `prd-detail.tsx` | Workspace container |
| `prd-viewer.tsx` | Markdown + Mermaid rendering |
| `prd-service.ts` | Save/fetch PRD versions |
| `prompts.ts` | AI system prompts |
| `api/chat/route.ts` | SSE streaming endpoint |

### Components
- `PrdViewer` — Markdown, TOC, resizable panels, version history
- `PrdDetail` — Layout: TOC | PRD | Chat panel
- `TableOfContents` — Heading extraction, clickable nav
- `Mermaid` — Diagram rendering from code blocks
- `VersionHistory` — Floating button, version diff

### State
- `useChatStore`: `isGeneratingPRD`, `generationStep`, `streamingPRDContent`, `completedSections`
- `useUIStore`: `isChatPanelOpen`, `isPRDLoading`

### Validations
- Min 20 chars prompt
- Quota check (prd_used < prd_limit)
- Rate limit (60s window)
- Auth check

---

## 2. PRD Revision

### Purpose
Update specific PRD sections without full regeneration.

### Block-Patching
AI outputs `:::UPDATE_SECTION[Section Name]:::` markers. Server regex-matches section in existing PRD and replaces content between `<!-- SECTION: -->` / `<!-- /SECTION -->`.

Client-side `livePatchPrd()` applies changes for instant visual feedback before save.

### Key Files
- `prompts.ts` — `PRD_REVISION_PROMPT`
- `api/chat/route.ts` — Server merge logic
- `chat-panel.tsx` — `livePatchPrd()`, `cleanChatBubble()`

---

## 3. Acceptance Criteria (PRD-04)

### Flow
```
/prd → "Generate AC" → /ac/[id]
  → Auto-generate if first visit + PRD exists
  → POST /api/ac/generate → SSE → AcViewer
  → save ac_versions (JSONB)
```

### Key Files
| File | Role |
|------|------|
| `ac/[id]/page.tsx` | Server page |
| `ac-detail.tsx` | AC workspace container |
| `ac-viewer.tsx` | Render parsed AC features |
| `ac-toc.tsx` | Feature navigation |
| `ac-service.ts` | Parse, save, load AC versions |
| `prompts-ac.ts` | AC system prompts |
| `api/ac/generate/route.ts` | Generate endpoint |
| `api/ac/revise/route.ts` | Revision endpoint |

### Data
```
PRD → AI → ### Feature: X\n- [ ] AC-1.1: ...
  → parseAcMarkdown() → AcFeature[] → JSONB in ac_versions
```

### Features
- Auto-generate, version history, chat revision, revision quota

---

## 4. Task Tree (PRD-05)

### Flow
```
/ac → "Generate Task" → /task/[id]
  → Auto-generate if AC exists → POST /api/task/generate
  → save features/tasks/subtasks → WhiteboardCanvas
```

### Key Files
| File | Role |
|------|------|
| `task/[id]/page.tsx` | Server page |
| `task-detail.tsx` | Workspace + tab bar |
| `whiteboard-canvas.tsx` | Interactive diagram |
| `task-node.tsx` | Canvas task node |
| `feature-card.tsx` | Feature grouping |
| `connection-lines.tsx` | Edges |
| `task-service.ts` | Parse JSON, CRUD |

### Data Structure
```json
{"features":[{"name":"Auth","tasks":[{"name":"Login API","description":"...","subtasks":[{"name":"Migration","description":"..."}]}]}]}
```

### Canvas
- Interactive whiteboard with zoom/pan
- Node positions persisted in `node_positions`
- Mobile accordion fallback

---

## 5. Sitemap (PRD-06)

### Flow
```
/task → Sitemap tab → POST /api/sitemap/generate
  → save sitemap_pages (parent_id self-ref) → tree visualization
```

### Key Files
- `task-detail.tsx` — Sitemap tab
- `sitemap-node.tsx` — Tree node
- `sitemap-service.ts` — Parse, save, load
- `api/sitemap/generate/route.ts` — SSE endpoint

### Data Structure
```json
{"pages":[{"name":"Home","path":"/","isAuthRequired":false,"children":[]}]}
```

### Features
- Canvas visualization, auth badges, cycle detection

---

## 6. Kanban Board

### Flow
```
/task → "Kanban" → /kanban/[id] → GET /api/kanban/[pid]
  → grouped by status → 4 columns → polls 10s
```

### Key Files
| File | Role |
|------|------|
| `kanban/[id]/page.tsx` | Server page |
| `kanban-board.tsx` | Board + error/empty states |
| `kanban-column.tsx` | Status column |
| `kanban-card.tsx` | Task/subtask card |
| `kanban-banner.tsx` | Notifications |
| `use-kanban-polling.ts` | Polling with backoff |
| `api/kanban/[pid]/route.ts` | GET data |
| `api/kanban/update-status/route.ts` | POST status (API key auth) |

### Columns
Pending → In Progress → Completed → Failed

### Features
- 10s polling, exponential backoff, AC staleness detection, card animation, mobile support

---

## 7. Authentication

InsForge Auth. httpOnly cookies. Middleware refresh. React `cache()` for server auth.

### Files
- `login-form.tsx`, `register-form.tsx`
- `middleware.ts`
- `auth.ts`, `auth-cookies.ts`
- `api/auth/*/route.ts`

---

## 8. Subscription & Payments

| Plan | Price | PRD/mo | Revisions |
|------|-------|--------|-----------|
| Free | Rp0 | 3 | 3 |
| Pro | Rp25k | 25 | 20 |
| Hengker | Rp75k | ∞ | ∞ |

**Gateway:** Midtrans SNAP (sandbox). Webhook for status updates.

---

## 9. Export

- `POST /api/export/prd` — All content as JSON
- `POST /api/export/zip` — ZIP with prd.md, ac.md, tasks.json, sitemap.json

---

## 10. Shared PRD

Public route `/prd/share/[token]`. Token generated via `crypto.randomBytes(9).toString("base64url")`.

---

## 11. Rate Limiting

Table-based (`rate_limits`). 60s window. Limits per plan. Fail-closed on DB error.
