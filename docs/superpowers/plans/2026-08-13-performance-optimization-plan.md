# Performance Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate streaming re-render bottlenecks, reduce bundle size, improve perceived performance across all NovaPlan routes.

**Architecture:** 10 surgical fixes, one commit per fix, ordered by ROI. Each fix independently testable. No architectural changes — render pattern corrections, memoization, lazy loading, vendor chunk optimization only.

**Tech Stack:** React 19, Zustand, Vite 8, TanStack Query, Tailwind CSS 4, Framer Motion

## Global Constraints

- Branch: `perf/full-optimization` (already created from main)
- One commit per task — enables bisect on regression
- All existing vitest tests must pass after each commit (`pnpm test`)
- No new dependencies
- Bahasa Indonesia UI copy preserved — no text changes
- Server-only module pattern preserved (dynamic imports for db/auth/pg)
- No functional changes — performance only
- Run `pnpm build` after Task 10 to verify no build regressions

---

### Task 1: ChatPanel useChatStore Granular Selectors

**Files:**
- Modify: `src/components/chat/chat-panel.tsx:224-234`

**Interfaces:**
- Consumes: `useChatStore` from `@/store`
- Produces: Same variables, different subscription pattern

- [ ] **Step 1: Read current store usage**

Read `src/components/chat/chat-panel.tsx` lines 220-240 to confirm exact destructured fields.

- [ ] **Step 2: Replace destructuring with selectors**

Replace lines 224-234:

```typescript
// Before (lines 224-234)
const {
	messages,
	isStreaming,
	isGeneratingPRD,
	creditsExhausted,
	addMessage,
	setStreaming,
	setGeneratingPRD,
	setStreamingPRDContent,
	setCreditsExhausted,
} = useChatStore();

// After
const messages = useChatStore((s) => s.messages);
const isStreaming = useChatStore((s) => s.isStreaming);
const isGeneratingPRD = useChatStore((s) => s.isGeneratingPRD);
const creditsExhausted = useChatStore((s) => s.creditsExhausted);
const addMessage = useChatStore((s) => s.addMessage);
const setStreaming = useChatStore((s) => s.setStreaming);
const setGeneratingPRD = useChatStore((s) => s.setGeneratingPRD);
const setStreamingPRDContent = useChatStore((s) => s.setStreamingPRDContent);
const setCreditsExhausted = useChatStore((s) => s.setCreditsExhausted);
```

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass. No behavioral change.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "perf(chat): use granular Zustand selectors in ChatPanel

Replace store destructuring with individual selectors to prevent
full-component re-render on every store update during streaming."
```

---

### Task 2: PrdViewer Markdown Components Module-Scope Const

**Files:**
- Modify: `src/components/prd/prd-viewer.tsx:154-206`

**Interfaces:**
- Consumes: `react-markdown` Components type
- Produces: `markdownComponents` constant used in JSX

- [ ] **Step 1: Read current components object**

Read `src/components/prd/prd-viewer.tsx` lines 140-220 to see exact inline components definition and any closures over component state.

- [ ] **Step 2: Extract to module scope**

If heading ID generation uses pure functions (no state), extract entire `components` object to module scope:

```typescript
// Outside component, at module level
const markdownComponents: Components = {
	h2: ({ children, ...props }) => (
		<h2 id={slugify(String(children))} {...props}>{children}</h2>
	),
	h3: ({ children, ...props }) => (
		<h3 id={slugify(String(children))} {...props}>{children}</h3>
	),
	h4: ({ children, ...props }) => (
		<h4 id={slugify(String(children))} {...props}>{children}</h4>
	),
	code: ({ className, children, ...props }) => {
		const match = /language-(\w+)/.exec(className || "");
		return match ? (
			<SyntaxHighlighter language={match[1]} PreTag="div" {...props}>
				{String(children).replace(/\n$/, "")}
			</SyntaxHighlighter>
		) : (
			<code className={className} {...props}>{children}</code>
		);
	},
	// ... copy remaining components exactly as-is
};
```

If any component closes over state/props, wrap in `useMemo(() => ({...}), [])` instead.

- [ ] **Step 3: Update JSX reference**

Replace inline `components={{...}}` with `components={markdownComponents}`.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass. PRD renders identically.

- [ ] **Step 5: Commit**

```bash
git add src/components/prd/prd-viewer.tsx
git commit -m "perf(prd): extract markdown components to module-scope const

Prevents react-markdown re-parse on every parent render by stabilizing
the components prop reference."
```

---

### Task 3: AcViewer Markdown Components Module-Scope Const

**Files:**
- Modify: `src/components/ac/ac-viewer.tsx:148-176`

**Interfaces:**
- Consumes: `react-markdown` Components type
- Produces: `markdownComponents` constant used in JSX

- [ ] **Step 1: Read current components object**

Read `src/components/ac/ac-viewer.tsx` lines 140-185.

- [ ] **Step 2: Extract to module scope**

Same pattern as Task 2. Copy exact components definition, move outside component.

- [ ] **Step 3: Update JSX reference**

Replace inline `components={{...}}` with `components={markdownComponents}`.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/ac/ac-viewer.tsx
git commit -m "perf(ac): extract markdown components to module-scope const

Same pattern as PrdViewer — stabilizes components prop reference."
```

---

### Task 4: Mermaid React.memo Wrap

**Files:**
- Modify: `src/components/prd/mermaid.tsx:27`

**Interfaces:**
- Consumes: `MermaidProps` type
- Produces: Memoized `Mermaid` component

- [ ] **Step 1: Read current export**

Read `src/components/prd/mermaid.tsx` lines 25-35 to see exact export signature.

- [ ] **Step 2: Wrap in React.memo**

```typescript
// Before
export const Mermaid: React.FC<MermaidProps> = ({ chart }) => {

// After
export const Mermaid = React.memo(({ chart }: MermaidProps) => {
```

Close the function with `});` instead of `};` at the end.

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass. Mermaid diagrams render identically.

- [ ] **Step 4: Commit**

```bash
git add src/components/prd/mermaid.tsx
git commit -m "perf(mermaid): wrap in React.memo

Prevents redundant diagram re-renders when parent PrdViewer re-renders
with identical chart prop during streaming."
```

---

### Task 5: ChatBubble React.memo Wrap

**Files:**
- Modify: `src/components/chat/chat-bubble.tsx:28`

**Interfaces:**
- Consumes: `ChatBubbleProps` type
- Produces: Memoized `ChatBubble` component

- [ ] **Step 1: Read current export**

Read `src/components/chat/chat-bubble.tsx` lines 25-35.

- [ ] **Step 2: Wrap in React.memo**

```typescript
// Before
export const ChatBubble = ({ message, isLast }: ChatBubbleProps) => {

// After
export const ChatBubble = React.memo(({ message, isLast }: ChatBubbleProps) => {
```

Close with `});`.

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/chat/chat-bubble.tsx
git commit -m "perf(chat): wrap ChatBubble in React.memo

Skips historical message re-renders during streaming. Only active
bubble re-renders."
```

---

### Task 6: streamApiCall Remove thinkingText Dependency

**Files:**
- Modify: `src/components/chat/chat-panel.tsx:678-694`

**Interfaces:**
- Consumes: `thinkingText` state, `useRef`, `useCallback`
- Produces: Stabilized `streamApiCall` callback

- [ ] **Step 1: Read current useCallback**

Read `src/components/chat/chat-panel.tsx` lines 670-700 to see exact dependency array and thinkingText usage inside callback.

- [ ] **Step 2: Add ref for thinkingText**

Before the `useCallback`, add:

```typescript
const thinkingTextRef = useRef(thinkingText);
thinkingTextRef.current = thinkingText;
```

- [ ] **Step 3: Replace thinkingText usage inside callback**

Inside `streamApiCall`, replace every `thinkingText` reference with `thinkingTextRef.current`.

- [ ] **Step 4: Remove thinkingText from dependency array**

Remove `thinkingText` from the `useCallback` deps array (line ~692).

- [ ] **Step 5: Run tests**

Run: `pnpm test`
Expected: All tests pass. Streaming behavior unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/chat-panel.tsx
git commit -m "perf(chat): remove thinkingText from streamApiCall deps

Use ref to access thinkingText inside callback, preventing recreation
on every token during reasoning phase."
```

---

### Task 7: Kanban Polling → TanStack Query

**Files:**
- Modify: `src/hooks/use-kanban-polling.ts`
- Modify: All consumers of `useKanbanPolling` (grep for import sites)

**Interfaces:**
- Consumes: `@tanstack/react-query` useQuery
- Produces: `useKanbanTasks(projectId)` hook returning `{ data, isLoading, error }`

- [ ] **Step 1: Find all consumers**

Run: `Grep pattern="useKanbanPolling" path="src/" output_mode="files_with_matches"`
Record all files that import/use this hook.

- [ ] **Step 2: Read current hook implementation**

Read `src/hooks/use-kanban-polling.ts` fully to understand return shape and API call.

- [ ] **Step 3: Rewrite hook using useQuery**

```typescript
import { useQuery } from "@tanstack/react-query";

export function useKanbanTasks(projectId: string) {
	return useQuery({
		queryKey: ["kanban-tasks", projectId],
		queryFn: async () => {
			const res = await fetch(`/api/projects/${projectId}/tasks`);
			if (!res.ok) throw new Error("Failed to fetch tasks");
			return res.json();
		},
		refetchInterval: 10_000,
		refetchOnWindowFocus: true,
		staleTime: 5_000,
		enabled: !!projectId,
	});
}
```

Preserve exact API endpoint and response shape from original implementation.

- [ ] **Step 4: Update all consumers**

Update each consumer file to use new hook name and adapt to `{ data, isLoading, error }` return shape. Map `data` to previous variable names.

- [ ] **Step 5: Delete old polling code**

Remove custom setInterval, backoff logic, visibility handler from hook file.

- [ ] **Step 6: Run tests**

Run: `pnpm test`
Expected: All tests pass. Kanban board polls correctly.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/use-kanban-polling.ts [consumer files]
git commit -m "perf(kanban): replace custom polling with TanStack Query

Eliminates ~130 lines of custom polling code. Gains caching,
deduplication, error boundary integration, and devtools support."
```

---

### Task 8: framer-motion → CSS @keyframes

**Files:**
- Modify: `src/components/chat/chat-bubble.tsx`
- Modify: `src/components/layout/hero.tsx`
- Modify: `src/components/chat/typing-indicator.tsx`
- Modify: `src/styles.css` (or equivalent global CSS file)

**Interfaces:**
- Consumes: CSS @keyframes, Tailwind animate utilities
- Produces: Same visual animations without JS runtime

- [ ] **Step 1: Find all framer-motion usage**

Run: `Grep pattern="from.*framer-motion|motion\." path="src/" output_mode="content"`
Record all files and exact animation props.

- [ ] **Step 2: Add CSS keyframes to global stylesheet**

Add to `src/styles.css`:

```css
@keyframes fadeInUp {
	from { opacity: 0; transform: translateY(8px); }
	to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
}

@keyframes pulse-dot {
	0%, 80%, 100% { transform: scale(0); }
	40% { transform: scale(1); }
}

.animate-fade-in-up { animation: fadeInUp 0.3s ease-out forwards; }
.animate-fade-in { animation: fadeIn 0.2s ease-out forwards; }
.animate-pulse-dot { animation: pulse-dot 1.4s infinite ease-in-out both; }
```

Adjust values to match existing framer-motion configs exactly.

- [ ] **Step 3: Replace motion.div in chat-bubble.tsx**

```tsx
// Before
import { motion } from "framer-motion";
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

// After
<div className="animate-fade-in-up">
```

Remove `framer-motion` import if no other usage in file.

- [ ] **Step 4: Replace in hero.tsx**

Same pattern. Match exact animation values.

- [ ] **Step 5: Replace in typing-indicator.tsx**

Same pattern. Typing dots likely use staggered delays — use `animation-delay` CSS.

- [ ] **Step 6: Verify no remaining framer-motion imports**

Run: `Grep pattern="from.*framer-motion" path="src/" output_mode="files_with_matches"`
If empty, framer-motion can be removed from package.json (separate task if desired).

- [ ] **Step 7: Run tests**

Run: `pnpm test`
Expected: All tests pass. Animations visually identical.

- [ ] **Step 8: Commit**

```bash
git add src/components/chat/chat-bubble.tsx src/components/layout/hero.tsx src/components/chat/typing-indicator.tsx src/styles.css
git commit -m "perf(ui): replace framer-motion with CSS @keyframes

~30-50KB bundle reduction. CSS animations are GPU-accelerated with
zero JS overhead."
```

---

### Task 9: jszip Dynamic Import

**Files:**
- Modify: File(s) importing jszip (find via grep)

**Interfaces:**
- Consumes: `jszip` via dynamic import
- Produces: Same export functionality, lazy-loaded

- [ ] **Step 1: Find jszip import site**

Run: `Grep pattern="import.*jszip|require.*jszip" path="src/" output_mode="content"`

- [ ] **Step 2: Convert to dynamic import**

```typescript
// Before
import JSZip from "jszip";

async function handleExport() {
	const zip = new JSZip();
	// ...
}

// After
async function handleExport() {
	const { default: JSZip } = await import("jszip");
	const zip = new JSZip();
	// ...
}
```

Remove top-level import statement.

- [ ] **Step 3: Run tests**

Run: `pnpm test`
Expected: All tests pass. Export still works.

- [ ] **Step 4: Commit**

```bash
git add [modified files]
git commit -m "perf(export): lazy-load jszip via dynamic import

~90KB removed from initial bundle. Loaded only when user triggers export."
```

---

### Task 10: Vite manualChunks Configuration

**Files:**
- Modify: `vite.config.ts`

**Interfaces:**
- Consumes: Vite/Rollup config
- Produces: Optimized vendor chunk splitting

- [ ] **Step 1: Read current vite config**

Read `vite.config.ts` fully.

- [ ] **Step 2: Add manualChunks**

Inside `defineConfig`, add to build config:

```typescript
build: {
	rollupOptions: {
		output: {
			manualChunks: {
				"vendor-markdown": ["react-markdown", "remark-gfm", "rehype-highlight"],
				"vendor-mermaid": ["mermaid"],
			},
		},
	},
},
```

Note: Omit `vendor-motion` if Task 8 removed framer-motion entirely.

- [ ] **Step 3: Verify build succeeds**

Run: `pnpm build`
Expected: Build completes without errors. Check output for new chunk names.

- [ ] **Step 4: Run tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "perf(build): add manualChunks for vendor splitting

Co-locates heavy vendor deps into shared chunks to prevent duplication
across route chunks."
```

---

## Post-Implementation Verification

After all 10 tasks complete:

1. Run `pnpm build` — verify clean build
2. Run `pnpm test` — verify all tests pass
3. Start dev server: `pnpm dev`
4. Open http://localhost:3000 in browser
5. Test PRD streaming — should feel smoother
6. Test chat — messages animate in
7. Test kanban — tasks load and poll
8. Test export — generates zip correctly
9. Compare bundle sizes: check `.output/` or dist folder

</parameter>
<arg_key>description>Write performance optimization plan