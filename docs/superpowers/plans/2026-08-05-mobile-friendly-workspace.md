# Mobile-Friendly Core Workspace Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the 5 core workspace pages (`/ask/$id`, `/prd/$id`, `/ac/$id`, `/task/$id`, `/kanban/$id`) responsive, touch-friendly, and overflow-free on mobile viewports (<640px and <768px).

**Architecture:** Tailwind CSS responsive utility classes (`sm:`, `md:`), CSS scroll snap (`snap-x snap-mandatory`), mobile tab toggle state for split-screen layouts, and compact active step badge for topbar navigation.

**Tech Stack:** React, Tailwind CSS, Lucide icons, TanStack Start/Router.

## Global Constraints

- No breaking changes to desktop layout or functionality.
- Minimum tap target height: 44px for all mobile interactive elements.
- Zero horizontal overflow (`overflow-x-hidden` body containment).
- All changes must pass `npx tsc --noEmit`.

---

### Task 1: Responsive Navigation Topbar (`src/components/navigation/step-nav.tsx`)

**Files:**
- Modify: `src/components/navigation/step-nav.tsx`

**Interfaces:**
- Consumes: active step route props (`currentStep`)
- Produces: compact mobile step indicator on `<640px`

- [ ] **Step 1: Check existing step-nav file**
- [ ] **Step 2: Add mobile compact active step badge**
- [ ] **Step 3: Run TypeScript check (`npx tsc --noEmit`)**
- [ ] **Step 4: Commit (`git commit -m "feat(ui): add responsive compact mobile step nav"`)**

---

### Task 2: Mobile Question Flow Options (`src/app/ask/ask-flow.tsx`)

**Files:**
- Modify: `src/app/ask/ask-flow.tsx`
- Modify: `src/app/ask/stack-dropdown.tsx`

**Interfaces:**
- Consumes: Question option items
- Produces: 1-column grid on `<640px` + touch target >= 44px

- [ ] **Step 1: Update grid classes to `grid-cols-1 sm:grid-cols-2`**
- [ ] **Step 2: Set minimum button height `min-h-[44px]`**
- [ ] **Step 3: Run TypeScript check (`npx tsc --noEmit`)**
- [ ] **Step 4: Commit (`git commit -m "feat(ui): make ask flow options mobile responsive"`)**

---

### Task 3: Mobile Split-Screen for PRD & AC Pages (`src/routes/prd/$id.tsx`, `src/routes/ac/$id.tsx`)

**Files:**
- Modify: `src/components/prd/prd-detail.tsx`
- Modify: `src/components/ac/ac-detail.tsx`

**Interfaces:**
- Consumes: PRD/AC content + Chat panel
- Produces: Mobile tab switcher ("Dokumen" vs "Chat") on `<768px`

- [ ] **Step 1: Add mobile tab state `[mobileTab, setMobileTab]`**
- [ ] **Step 2: Add tab bar visible only on `<md:`**
- [ ] **Step 3: Conditionally render document or chat panel on mobile**
- [ ] **Step 4: Run TypeScript check (`npx tsc --noEmit`)**
- [ ] **Step 5: Commit (`git commit -m "feat(ui): add mobile tab toggle for PRD and AC pages"`)**

---

### Task 4: Mobile Kanban Board & Touch Optimization (`src/components/kanban/kanban-board.tsx`, `kanban-column.tsx`)

**Files:**
- Modify: `src/components/kanban/kanban-board.tsx`
- Modify: `src/components/kanban/kanban-column.tsx`

**Interfaces:**
- Consumes: Kanban columns data
- Produces: `w-[85vw] sm:w-[280px]` columns with CSS scroll snap on `<640px`

- [ ] **Step 1: Add `snap-x snap-mandatory` to column container**
- [ ] **Step 2: Add `snap-center w-[85vw] sm:w-[280px]` to KanbanColumn**
- [ ] **Step 3: Run TypeScript check (`npx tsc --noEmit`)**
- [ ] **Step 4: Commit (`git commit -m "feat(ui): add mobile scroll snap and responsive width for kanban board"`)**
