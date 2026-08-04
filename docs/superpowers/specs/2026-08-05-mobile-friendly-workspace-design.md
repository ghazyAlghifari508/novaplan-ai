# Design Spec: Mobile-Friendly Core Workspace Flow

> **Date:** 2026-08-05  
> **Target Subsystem:** Core Workspace Flow (`/ask/$id`, `/prd/$id`, `/ac/$id`, `/task/$id`, `/kanban/$id`)

## Goal
Ensure all 5 core workspace pages are fully responsive, touch-friendly, and accessible on mobile viewports (<640px and <768px) without horizontal overflow or cramped touch targets.

---

## Component Designs

### 1. Shared Topbar & Step Navigation (`src/components/navigation/step-nav.tsx` / `topbar.tsx`)
- **Desktop (>=640px):** Keep horizontal step indicator (`Question --- PRD --- AC --- Task`).
- **Mobile (<640px):** Hide step connection lines and non-active step labels. Render a compact active-step badge (e.g. `Step 4/4: Task`) with a dropdown or tap-to-switch drawer.
- **Action Buttons:** Reduce padding on `<640px` (`px-2 py-1 text-xs`) and preserve 44px minimum tap target height.

### 2. Question Flow (`/ask/$id`)
- **Option Grid:** Enforce 1-column layout (`grid-cols-1`) below `sm:` breakpoint for all stack selection cards and prompt option buttons.
- **Touch Target:** Minimum height 44px for every clickable option card.
- **Stack Dropdown:** Render as a full-width bottom sheet on mobile screens (<640px).

### 3. PRD & AC Pages (`/prd/$id`, `/ac/$id`)
- **Split-Screen Layout:** Replace side-by-side split layout with a **Mobile Tab Toggle** ("Dokumen" vs "Chat Revisi") on viewports `<768px`.
- **Text & Padding:** Set document body text to `text-sm` with `leading-relaxed` and outer padding to `p-4` on mobile.

### 4. Task Roadmap Page (`/task/$id`)
- **Mobile Fallback:** Ensure mobile accordion list has clear status indicators and tap target height >= 44px.
- **Canvas:** Keep desktop-only interactive canvas hidden on `<768px`.

### 5. Kanban Board Page (`/kanban/$id`)
- **Column Width & Snap:** On `<640px`, change column width to `w-[85vw]` with `snap-x snap-mandatory` on the scroll container so swipe navigation between columns is smooth on mobile.
- **Task Detail Modal:** Set modal width to `w-[92vw]` and height to `max-h-[85dvh]` with clear vertical scrolling (`min-h-0 overflow-y-auto`).

---

## Testing Strategy
- Verify responsive layout across 375px (iPhone SE), 390px (iPhone 12/13/14), and 768px (iPad/Tablet) viewports.
- Confirm zero horizontal body scrollbar on all 5 routes.
