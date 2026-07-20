# PRD-02: Flow Step Navigation

## Problem
NovaPlan expands from 1 page (PRD) to 4+ pages (PRD → AC → Task/Sitemap → Kanban). Without persistent step indicator, users lose context of where they are in pipeline. Current navbar hides on workspace pages. User must guess what's next.

## Scope
**In:** FlowStepNav component showing 3 steps, responsive, context-aware per route, checkmark for completed steps, visible on workspace pages.

**Out:** Clickable step history (navigate to completed step), animated transitions, multi-project step overview.

---

## User Flows

### Normal Flow
1. User on `/prd/[id]` → navbar shows: `● 1 PRD` (active, filled circle) → `○ 2 AC` → `○ 3 Task, Fitur & Sitemap`
2. User clicks "Lanjut Bikin AC" → redirect to `/ac/[id]`
3. On `/ac/[id]` → navbar shows: `✓ 1 PRD` (green checkmark) → `● 2 AC` (active) → `○ 3 Task, Fitur & Sitemap`
4. User clicks "Lanjut Generate Task" → redirect to `/task/[id]`
5. On `/task/[id]` → navbar shows: `✓ 1 PRD` → `✓ 2 AC` → `● 3 Task, Fitur & Sitemap` (active)

### Negative Flow: Missing Project Step
1. User visits `/task/[id]` but project.step is null/empty
2. FlowStepNav defaults to step 1 (PRD) — safe fallback
3. App attempts to load task data → if none, show empty state

### Negative Flow: Direct URL Access
1. User types `/ac/[nonexistent-id]` directly
2. Server component validates project ownership → 404 if not found
3. FlowStepNav not rendered on error/404 pages

---

## UI States

### Loading
- FlowStepNav shows skeleton: 3 gray circles with shimmer
- No text labels visible until step resolved

### Active Step
- Filled circle with brand color (indigo)
- Step label bold: `font-[510]`
- Subtle scale animation on transition: `hover:scale-105`

### Completed Step
- Green checkmark inside circle (match existing emerald color: `#27a644`)
- Step label with strikethrough? No — grayed but visible

### Future Step
- Outlined/empty circle with muted color (`text-fog`)
- Label in muted color
- Not clickable (MVP)

### Mobile (<md)
- Steps abbreviated to single word/icons: `○ PRD → ○ AC → ○ Task`
- No labels, only circles with numbers 1/2/3
- Active step: highlight with indigo dot

---

## Component Tree

```
Navbar (modified, src/components/layout/navbar.tsx)
├── Logo + AppName (existing)
├── FlowStepNav (NEW — inserts between Logo and auth controls)
│   ├── StepBadge (×3)
│   │   ├── CircleIcon (filled/outlined/checkmark)
│   │   ├── LabelText ("PRD" / "AC" / "Task")
│   │   └── ConnectorLine (between steps)
│   └── hidden when route not in workspace paths
├── DesktopNavLinks (existing)
├── ThemeToggle (existing)
└── AuthControls (existing)

app-layout.tsx (modified, src/components/layout/app-layout.tsx)
- CHANGE: show Navbar on `/prd/*`, `/ac/*`, `/task/*`, `/kanban/*` paths
- Current: hides navbar on all `/prd/*`

FlowStepNav (NEW, src/components/layout/flow-step-nav.tsx)
```

---

## Data Flow

```typescript
// FlowStepNav props (client component)
interface FlowStepNavProps {
  currentStep: 'prd' | 'ac' | 'task';  // Derived from route + project status
  stepStatus: {
    prd: 'active' | 'completed';
    ac: 'active' | 'completed' | 'pending';
    task: 'active' | 'pending';
  };
}

// Route → Step mapping (utility function)
function routeToStep(pathname: string): 'prd' | 'ac' | 'task' {
  if (pathname.startsWith('/prd/')) return 'prd';
  if (pathname.startsWith('/ac/')) return 'ac';
  if (pathname.startsWith('/task/')) return 'task';
  if (pathname.startsWith('/kanban/')) return 'task'; // kanban = advanced task step
  return 'prd'; // default fallback
}
```

Step status derived from `projects.step` column in DB:
- `step = 'prd'` → prd:active, ac:pending, task:pending
- `step = 'ac'` → prd:completed, ac:active, task:pending
- `step = 'task'` → prd:completed, ac:completed, task:active

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/components/layout/flow-step-nav.tsx` | **CREATE** | New component |
| `src/components/layout/navbar.tsx` | Modify | Add FlowStepNav slot between logo and links |
| `src/components/layout/app-layout.tsx` | Modify | Show navbar on `/ac/`, `/task/`, `/kanban/` |
| `src/components/layout/index.ts` | Modify | Export FlowStepNav |

---

## Edge Cases / Open Questions
- [ ] After AC page, user goes back to PRD page — step shows `✓ 1 PRD` (completed) not active?
  - Answer: Route mapping determines active step. If on `/prd/`, step 1 is active regardless of completed status. Completed step indicator becomes active again when you navigate to it.
- [x] What if project step column is NULL? → default to 'prd'
- [ ] Mobile: 3 dots with "1 · 2 · 3" — is number-only clear enough without labels?
- [x] Should FlowStepNav be server or client component? → Client (needs usePathname + interactive tooltips potentially)

## Security
- Read-only component: no auth risk
- Step status computed from route, not user-controllable query params

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Step indicator shows wrong state if DB stale | Low | Med | Re-derive from route as source of truth, not DB |
| Mobile layout breaks with 3 step labels | Med | Low | Abbreviate to single words below md breakpoint |
| Navbar height change affects page layout | Med | Low | Fixed height stays 56px (h-14) with flex shrink-0 |

## Dependencies
- Blocked by: PRD-01 (entry flow must exist first)
- Blocking for: PRD-03, PRD-04, PRD-05, PRD-08 (all need step context)

## Effort Estimate
- New files: 1
- Files modified: 3
- Complexity: Low (pure UI component + route detection)
