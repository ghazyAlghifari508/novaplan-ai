# PRD-06: Sitemap Whiteboard Tab

## Problem
After features/tasks defined, dev needs page/screen structure of the app. Sitemap shows routes, hierarchy, auth requirements. Without it, dev must manually figure out pages from features list. Second tab in task page.

## Referensi Visual
Foto contoh ada di `docs/fotocontoh/contohfotountukfitursitemap.png`. Warna & tema TIDAK diikuti (foto putih). Yang diikuti: layout tree hierarchy, page cards dengan icons (🔒/🌐), parent-child connectors, zoom/pan canvas.

## Scope
**In:** "Sitemap" tab on `/task/[projectId]`, reuses whiteboard canvas from PRD-05, AI generates page tree from PRD features, auth-required markers, parent-child hierarchy connectors, zoom/pan shared.

**Out:** Visual page mockups, route parameter specification (e.g. `/post/[id]`), dynamic routes.

---

## UI Layout (from foto contoh)

```
┌──────────────────────────────────────────────┐
│  [Task Board] [Sitemap]                      │
├──────────────────────────────────────────────┤
│                     🏠                        │
│                   Home                       │
│                     │                        │
│        ┌────────────┼────────────┐           │
│        │            │            │           │
│     🔐 Login     🔐 Register    🌐 About    │
│        │            │                       │
│        │            │                       │
│   🔐 Dashboard 🔐 Verify Email              │
│        │                                     │
│   ┌────┼────┐                                │
│   │    │    │                                │
│ 🔐   🔐   🔐                                │
│Profile Settings Billing                      │
│                                   [+] [−]    │
│                                   [100%]     │
│                                   [Reset]    │
└──────────────────────────────────────────────┘
```

- Tree layout: top→bottom, centered
- Root (Home) at top
- Children spread below with vertical + horizontal branch connectors
- 🔐 = auth required pages
- 🌐 = public pages
- Page card: rectangular, route path monospace below name
- Same canvas/zoom/pan as task board

---

## Page Card Spec

```
┌──────────────────────┐
│ 🔐 Dashboard         │  ← icon + page name
│ /dashboard           │  ← route (monospace, muted)
│ Auth required        │  ← badge (optional)
└──────────────────────┘
```
- Width: 180px
- Background: `bg-obsidian`
- Border: colored by access (🔐=indigo, 🌐=green)
- Icons: lucide Lock/Globe

### Layout Algorithm
- Top→bottom tree
- Parent centered above children
- Siblings evenly spaced horizontally
- Vertical spacing: 60px between levels
- Connectors: straight vertical + horizontal right-angle branches

---

## User Flows

### Normal Flow
1. User on Task Board tab → clicks "Sitemap" tab
2. Same canvas renders sitemap tree (zoom/pan preserved)
3. AI pages rendered as rectangular nodes with hierarchy
4. Pan/zoom same controls

### Mobile
- Fallback to nested list (same pattern as task board mobile)
- Indentation shows hierarchy
- Auth badge next to page name

### Negative: No Features
- Tab grayed out, "Generate task tree dulu" message

---

## Components

### SHARED with PRD-05
- `whiteboard-canvas.tsx` — same canvas, different content
- `connection-lines.tsx` — different connector layout (tree vs columns)
- `use-canvas-zoom.ts` — shared
- `tab-bar.tsx` — just adds "Sitemap" tab

### NEW
- `sitemap-node.tsx` — page card renderer (different from task node)
- `sitemap-tree-layout.ts` — tree layout algorithm

---

## Files Affected

| File | Action |
|------|--------|
| `src/components/task/sitemap-node.tsx` | CREATE |
| `src/app/api/sitemap/generate/route.ts` | CREATE |
| `src/app/api/sitemap/[pid]/route.ts` | CREATE |
| `src/lib/services/sitemap-service.ts` | CREATE |
| `src/lib/prompts-sitemap.ts` | CREATE |
| `src/components/task/tab-bar.tsx` | MODIFY |
| `src/components/task/task-detail.tsx` | MODIFY |

## Dependencies
- PRD-05 (shared canvas)
- PRD-10 (DB migration)

## Effort
- New files: 5
- Modified: 2
- Complexity: Medium (reuses most of PRD-05)
