# PRD-03: PRD Page Redesign — Workspace Layout Overhaul

## Problem
Current `/prd/[id]` wastes ~200px left sidebar on project history. In the new flow, user works on ONE project at a time — sidebar is dead space. TOC buried inside PRD viewer. No clear next-step action to AC. Chat panel competes for space with sidebar.

## Scope
**In:** Remove left sidebar, full-width PRD viewer, TOC as left-side vertical navigation (sticky), collapsible right chat panel, "Revisi PRD Dulu" and "Lanjut Bikin AC" action buttons, version at top.

**Out:** Drag-to-resize panels (simplified to fixed widths), project list switching (removed), dual-panel editing.

---

## User Flows

### Normal Flow: Review PRD
1. User arrives at `/prd/[id]` after generation completes
2. Sees: TOC left sidebar (~180px) | PRD Viewer (center, full remaining width) | Chat panel collapsed
3. Version number displayed in top-left of center panel ("v3")
4. Reads PRD content, scrolls through sections
5. Can click TOC heading to jump to section

### Flow: Open Chat for Revision
1. User sees "Revisi PRD Dulu" button sticky at bottom of PRD
2. Clicks it → Chat panel slides open from right (320px default)
3. Chat input auto-focused, placeholder: "Ketik instruksi revisi..."
4. User types revision → SSE stream patches PRD (existing logic)
5. User clicks "Hide Chat" → panel closes, PRD fills space

### Flow: Progress to AC
1. After PRD is final, user clicks "Lanjut Bikin Acceptance Criteria" button
2. Button at bottom-right of PRD, always visible when scrolled to bottom
3. Redirects to `/ac/[projectId]`
4. Updates `projects.step = 'ac'` in DB

### Flow: Mobile
1. User on screen <768px
2. TOC hidden (toggle via hamburger top-left)
3. PRD viewer fills full width
4. Chat: bottom sheet (60vh) when opened via "Revisi PRD Dulu"
5. "Lanjut Bikin AC" button sticks below PRD content

### Negative Flow A: No PRD Content Yet
1. User somehow lands on `/prd/[id]` during generation
2. Shows streaming spinner/placeholder (existing behavior)
3. TOC empty (no headings to parse)
4. Buttons disabled until content detected

### Negative Flow B: Deleted Project
1. User visits `/prd/[deleted-id]`
2. Server component throws 404
3. Error boundary renders: "Proyek tidak ditemukan" with link to `/`

### Negative Flow C: AC Without PRD Completion
1. User forces visit to `/ac/[id]` before PRD done
2. Middleware/server checks `projects.step`
3. If step < 'ac', redirect back to `/prd/[id]` with toast: "Selesaikan PRD terlebih dahulu"

---

## UI States

### Loading State
- Skeleton: TOC left gray bars (3 lines shimmer) | PRD area gray blocks
- No version indicator
- No buttons until content loaded

### Empty State (no PRD content)
- "PRD belum tersedia" centered message
- "Mulai generate dari beranda" link
- TOC hidden
- Chat disabled

### Error State (fetch failed)
- Error boundary with retry button
- "Gagal memuat PRD. Coba refresh halaman."
- TOC and chat still render (if cached data)

### Active State (PRD loaded)
- TOC: scrollable list with current section highlighted (intersection observer)
- PRD viewer: scrollable, full markdown rendered
- Version badge: "v{n}" top-right of PRD area
- Action buttons sticky at bottom

---

## Layout Spec (Desktop, ≥1280px)

```
┌──────────────────────────────────────────────────────────────┐
│  Navbar (PRD-02) — Step 1 active                           │
├──────┬─────────────────────────────────────┬─────────────────┤
│ TOC  │  PRD VIEWER                         │  CHAT (optional)│
│      │  ┌─ v3 ──────────────────────────┐  │                 │
│ •Ovrv│  │  ## 1. Overview               │  │  Chat Header    │
│ •Goa │  │  ### 1.1 Latar Belakang       │  │  ─────────────  │
│ •Req │  │  ...                          │  │  Messages       │
│ •Cor │  │  ### 1.2 Deskripsi Produk     │  │  ...            │
│ •Usr │  │  ...                          │  │                 │
│ •Arc │  │  ## 2. Goals & Success        │  │  Input Area     │
│ •DB  │  │  ...                          │  │                 │
│ •Des │  │                               │  │                 │
│      │  └───────────────────────────────┘  │                 │
│      │  [Revisi PRD] [→ Lanjut Bikin AC]   │                 │
├──────┴─────────────────────────────────────┴─────────────────┤
│  Footer (optional)                                           │
└──────────────────────────────────────────────────────────────┘
```

- TOC width: 180px fixed, `hidden md:block`, scrollable
- PRD viewer: `flex-1`
- Chat width: 320px fixed when open, `hidden xl:block` on desktop
- Action buttons: fixed bottom of PRD area, right-aligned

---

## Component Changes

### DELETE: ProjectSidebarContent
- File: `src/components/prd/project-sidebar.tsx`
- Also: `delete-project-modal.tsx`, `project-context-menu.tsx` (can keep but unused by default)

### MODIFY: PrdDetail (src/components/prd/prd-detail.tsx)
```typescript
// NEW PROPS — simplified
interface PrdDetailProps {
  projectId: string;
  projectName: string;
  latestVersion: PrdVersion;
  allVersions: PrdVersion[];
  conversationId: string;
  plan: Plan;
  revisionLimit: number;
}
// REMOVED: projects, initialMessages (sidebar handled elsewhere)
```

### MODIFY: PrdViewer (src/components/prd/prd-viewer.tsx)
- Add: `showToc` prop (boolean, default true)
- Add: TOC rendered as separate left element, not inline
- Keep existing markdown rendering and code handling

### ADD: ActionButtons (NEW component)
- "Revisi PRD Dulu" — opens chat panel, focuses input
- "Lanjut Bikin AC" — POST to update project step, redirect to `/ac/[id]`

---

## Data Flow

```typescript
// "Lanjut Bikin AC" click handler
async function handleContinueToAc() {
  // POST /api/projects/[id]/step
  const res = await fetch(`/api/projects/${projectId}/step`, {
    method: 'POST',
    body: JSON.stringify({ step: 'ac' })
  });
  if (res.ok) router.push(`/ac/${projectId}`);
}

// Chat toggle handler
function handleToggleChat() {
  setIsChatOpen(prev => !prev);
  if (!isChatOpen) {
    // Wait for panel to slide open, then focus input
    setTimeout(() => chatInputRef.current?.focus(), 300);
  }
}
```

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/components/prd/prd-detail.tsx` | **REWRITE** | Remove sidebar, new layout, action buttons |
| `src/components/prd/prd-viewer.tsx` | Modify | Detach TOC from inline rendering |
| `src/components/prd/table-of-contents.tsx` | Modify | Reposition as left sidebar element |
| `src/components/prd/project-sidebar.tsx` | DELETE | No longer used |
| `src/hooks/use-panel-resize.ts` | Modify | Remove left resize, keep right chat resize |
| `src/components/prd/__tests__/prd-detail.test.tsx` | Create | Verify new layout renders correctly |

---

## Edge Cases / Open Questions
- [ ] TOC scrolls independently of PRD content → sync scroll position on click?
  - Yes: click TOC heading → smooth-scroll PRD content to matching section. Intersection Observer highlights current TOC item as user scrolls.
- [x] What happens to PRD page if user has no versions yet? → Shows "PRD belum tersedia" state + "Buat PRD dari beranda" link.
- [ ] Chat panel on desktop: should it auto-open when user clicks "Revisi PRD Dulu"?
  - Yes, auto-open with slide animation. If already open, just focus input.
- [ ] Mobile: where do action buttons go? → Below PRD content, full-width, sticky at bottom on scroll.

## Security
- Same as existing: middleware protects `/prd/*`, RLS ensures project ownership
- "Lanjut Bikin AC" validates project ownership server-side before changing step

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Users lose ability to switch between projects | High | Medium | `/prd` index page still shows project grid; mobile sidebar accessible |
| TOC takes too much space on small screens | Medium | Low | Hidden below xl breakpoint, toggle via hamburger |
| Chat panel on desktop uses fixed 320px — may feel cramped | Medium | Low | 320px is baseline; user can't resize in MVP |

## Dependencies
- PRD-01 (entry flow)
- PRD-02 (flow step nav in navbar)
- Blocking for: PRD-04 (AC page uses same layout pattern)

## Effort Estimate
- Files rewritten: 1 (prd-detail.tsx)
- Files modified: 4
- Files deleted: 1
- New files: 0
- Complexity: Medium (layout restructuring)
