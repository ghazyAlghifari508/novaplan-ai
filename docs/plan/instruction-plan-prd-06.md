# PRD-06 Instruction Plan — Sitemap Whiteboard Tab

> Planning document. **NO CODING until approved.** Reuses PRD-05 canvas infrastructure.

## 1. Context

PRD-06 = "Sitemap" tab pada route `/task/[projectId]` (halaman yang sama dengan Task Board PRD-05). User switch tab → canvas render tree sitemap (page hierarchy + auth markers) dari PRD features. Canvas, zoom, pan, connector overlay **SHARED** dari PRD-05.

**State PRD-05 (sudah ada, siap reuse):**
- `src/components/task/whiteboard-canvas.tsx` — canvas wrapper (zoom/pan via `use-canvas-zoom`, CSS transform, pointer events, keyboard pan)
- `src/components/task/zoom-controls.tsx` — zoom +/-/reset
- `src/components/task/tab-bar.tsx` — Task Board / Sitemap (Sitemap saat ini `disabled`, akan di-enable)
- `src/hooks/use-canvas-zoom.ts` — zoom/pan hook
- `src/components/task/connection-lines.tsx` — SVG overlay (saat ini horizontal connector antar feature columns — PERLU adaptasi ke tree connector)

**DB (PRD-10, applied):**
- `sitemap_pages` table: `id, project_id, user_id, parent_id (self-ref), path, name, is_auth_required, "order", created_at`
- `projects.sitemap_status`: `pending/generating/completed`
- RLS: `(SELECT auth.uid()) = user_id`

## 2. Scope

**In:**
- Enable "Sitemap" tab di tab-bar (PRD-05 bikin disabled)
- AI generate page tree dari PRD content (bukan dari AC — sitemap ada di level PRD)
- Page cards: 🔐 auth / 🌐 public, route path monospace, parent-child tree connectors
- Tree layout (top→bottom, parent centered, siblings evenly spaced)
- Zoom/pan reuse dari whiteboard-canvas
- Mobile fallback: nested list

**Out (YAGNI):**
- Visual page mockups
- Route parameter spec (`/post/[id]`)
- Dynamic routes
- Drag-to-reposition

## 3. Files

### CREATE (5)
| File | Purpose |
|------|---------|
| `src/lib/prompts-sitemap.ts` | SITEMAP_GENERATION_PROMPT — strict: derive pages from PRD features only |
| `src/lib/services/sitemap-service.ts` | parseSitemapJson, saveSitemapTree, getSitemapTree, SitemapTree interface |
| `src/app/api/sitemap/generate/route.ts` | SSE generate page tree from PRD (reuse AC/generate pattern) |
| `src/app/api/sitemap/[projectId]/route.ts` | GET sitemap tree |
| `src/components/task/sitemap-node.tsx` | Page card renderer (Lock/Globe icon + name + path + auth badge) |

### MODIFY (3)
| File | Change |
|------|--------|
| `src/components/task/tab-bar.tsx` | `sitemapEnabled` default `true` (was `false`) |
| `src/components/task/task-detail.tsx` | Tab switch: render WhiteboardCanvas dengan prop `mode: "task" \| "sitemap"`, fetch sitemap tree saat sitemap tab active, "Generate Sitemap" button |
| `src/components/task/whiteboard-canvas.tsx` | Add `mode` prop — "task" render feature columns (existing), "sitemap" render tree (sitemap-node + tree connector layout) |

### KEEP (no change)
- `use-canvas-zoom.ts`, `zoom-controls.tsx`, `connection-lines.tsx` (tree connector = new logic in whiteboard-canvas, gak pecah existing)

## 4. Data Model

```typescript
// src/lib/services/sitemap-service.ts
export interface SitemapPage {
  name: string;        // "Dashboard"
  path: string;        // "/dashboard"
  isAuthRequired: boolean;  // 🔐 true / 🌐 false
  children: SitemapPage[];  // nested tree
}

export interface SitemapTree {
  pages: SitemapPage[];  // root pages (usually 1: Home)
}
```

DB `sitemap_pages.parent_id` self-ref → reconstruct tree di service (BFS/DFS group by parent_id).

## 5. AI Prompt (strict, no hallucination)

```
SITEMAP_GENERATION_PROMPT:
- Derive pages ONLY from PRD features
- JANGAN tambah page gak relevan ke PRD
- Format JSON: { pages: [{ name, path, isAuthRequired, children: [...] }] }
- Root biasanya "Home" (public)
- Auth pages: Dashboard, Profile, Settings, Billing
- Public pages: Login, Register, About, Landing
- path format: /lowercase-kebab
```

## 6. Skills & Plugins

### Pre-coding (WAJIB)
| Skill/Plugin | Untuk |
|-------------|-------|
| `mcp__context7` (resolve-library-id + query-docs) | Fetch latest React tree layout patterns, recursive component rendering best practices |
| `ecc:code-architect` (agent) | Blueprint: whiteboard-canvas `mode` prop design, tree layout algorithm, sitemap-service DB reconstruct |
| `insforge` (skill) | sitemap_pages CRUD pattern, self-ref parent_id query, RLS |

### Implementasi
| Skill/Plugin | Untuk |
|-------------|-------|
| `superpowers:subagent-driven-development` | Parallel: API routes, service, sitemap-node component |
| `simplify` (skill) | Reuse whiteboard-canvas (jangan bikin canvas baru), reuse connection-lines pattern |

### Review (WAJIB per AGENTS.md)
| Skill/Plugin | Untuk |
|-------------|-------|
| `ecc:react-reviewer` (agent) | sitemap-node memo, tree render recursion, whiteboard-canvas mode switch |
| `ecc:typescript-reviewer` (agent) | SitemapTree types, JSONB type safety, service layer |
| `ecc:silent-failure-hunter` (agent) | Empty PRD, generate fail, stale sitemap, orphan parent_id |

## 7. Context7 MCP Usage

**Wajib pakai** per instruksi user. Query topics:
1. React recursive tree component rendering (sitemap-node render children)
2. Tree layout algorithm (top-down, parent-centered, sibling spacing) — cek apakah ada stdlib pattern atau manual
3. SVG tree connector drawing (right-angle branches)

Steps:
1. `resolve-library-id` dengan query "React recursive tree component rendering" + library "React"
2. `query-docs` dengan library ID + question spesifik
3. Apply findings ke sitemap-node + tree layout

## 8. Build Order

1. `prompts-sitemap.ts` — AI prompt
2. `sitemap-service.ts` — parseSitemapJson, saveSitemapTree, getSitemapTree (reconstruct tree from parent_id)
3. `api/sitemap/generate/route.ts` — SSE (reuse PRD-05 task generate pattern)
4. `api/sitemap/[projectId]/route.ts` — GET
5. `sitemap-node.tsx` — page card (recursive children render)
6. `whiteboard-canvas.tsx` MOD — add `mode` prop, tree layout untuk sitemap mode
7. `tab-bar.tsx` MOD — enable Sitemap tab
8. `task-detail.tsx` MOD — tab switch + fetch sitemap + generate button

## 9. Tree Layout Algorithm (ponytail: manual, no dagre)

```
- Root at top, centered (canvasWidth/2)
- Children BFS: each level y = level * 200px
- Siblings: totalWidth = childCount * (cardWidth + gap); startX = parentX - totalWidth/2
- Card: 180px width, 100px height
- Connector: vertical line parent→child midpoint, horizontal branch antar siblings
```

`ponytail: manual layout. dagre overkill untuk MVP <30 pages. Add when sitemap >50 nodes.`

## 10. Reuse Map (jangan bikin ulang)

| Sudah ada (PRD-05) | Dipake untuk PRD-06 |
|---|---|
| whiteboard-canvas.tsx | canvas shell + zoom/pan — add `mode` prop |
| use-canvas-zoom.ts | zoom/pan (as-is) |
| zoom-controls.tsx | zoom UI (as-is) |
| tab-bar.tsx | tabs (enable Sitemap) |
| connection-lines.tsx | SVG overlay pattern (tree variant) |

## 11. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Tree layout misalign (parent not centered) | High | Medium | Manual BFS layout, test with 3-level tree |
| Circular parent_id (self-ref) | Low | High | Validate parent_id != id di saveSitemapTree |
| AI hallucinate pages gak di PRD | Medium | Medium | Strict prompt, no detection MVP |
| Recursion infinite (circular children) | Low | High | Track visited ids di getSitemapTree reconstruct |
| whiteboard-canvas mode break PRD-05 task view | Medium | High | mode prop optional default "task", PRD-05 untouched |

## 12. Definition of Done

- [ ] Sitemap tab enabled, switchable
- [ ] Tab switch render sitemap tree (bukan feature columns)
- [ ] Page cards: Lock/Globe icon, name, path, auth badge
- [ ] Parent-child tree connectors visible
- [ ] Zoom/pan functional (reuse)
- [ ] Mobile nested list fallback
- [ ] Generate Sitemap button → SSE stream
- [ ] Empty state: "Generate task tree dulu" kalau no features
- [ ] tsc --noEmit 0 errors
- [ ] next build PASS
- [ ] 3 reviewer pass (react + typescript + silent-failure)

## 13. Decisions (pre-made, ponytail)

1. **Tree layout**: manual BFS, no dagre (YAGNI)
2. **Page icons**: lucide Lock (auth) / Globe (public), no emoji
3. **Card width**: 180px fixed
4. **Sitemap source**: PRD content (bukan AC) — sitemap = app structure, ada di level PRD
5. **Generate trigger**: user click "Generate Sitemap" (no auto-gen on tab switch)
6. **mode prop**: `whiteboard-canvas` add `mode?: "task" | "sitemap"` default "task" — backward compatible

## 14. Context7 Checklist

- [ ] resolve-library-id: "React recursive tree component"
- [ ] query-docs: recursive child rendering + tree layout
- [ ] query-docs: SVG tree connector right-angle branch
- [ ] Apply findings sebelum coding sitemap-node + layout
