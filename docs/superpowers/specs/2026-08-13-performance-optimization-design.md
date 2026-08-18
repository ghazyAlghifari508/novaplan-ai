# Performance Optimization Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate streaming re-render bottlenecks, reduce bundle size, improve perceived performance across all NovaPlan routes.

**Architecture:** Surgical per-finding fixes with individual commits. Each fix independently verifiable via Lighthouse trace and existing test suite. No architectural changes — only render pattern corrections, memoization, lazy loading, and vendor chunk optimization.

**Tech Stack:** React 19, Zustand, Vite 8, TanStack Query, Tailwind CSS 4, Framer Motion (partial removal)

## Global Constraints

- Branch: `perf/full-optimization` from `main`
- One commit per finding — enables bisect on regression
- All existing vitest tests must pass after each commit
- No new dependencies except those already in package.json
- Bahasa Indonesia UI copy preserved — no text changes
- Server-only module pattern preserved (dynamic imports for db/auth/pg)
- No functional changes — performance only

---

## Findings & Fixes (Priority Order)

### Fix 1: ChatPanel useChatStore Selector (HIGH)

**File:** `src/components/chat/chat-panel.tsx:224-234`

**Problem:** Destructures entire store without selector. ANY store update triggers full ChatPanel re-render. During streaming, `setStreamingPRDContent` fires ~60fps via rAF, causing 60 full re-renders/sec.

**Fix:** Replace destructuring with granular selectors matching Navbar pattern (`src/components/layout/navbar.tsx:31-33`).

```typescript
// Before
const { messages, isStreaming, isGeneratingPRD, creditsExhausted, addMessage, setStreaming, setGeneratingPRD, setStreamingPRDContent, setCreditsExhausted } = useChatStore();

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

**Impact:** Eliminates ~60fps full-component re-render during streaming. Only subscribed values trigger re-render.

---

### Fix 2: Markdown Components Extract to Const (MEDIUM)

**Files:**
- `src/components/prd/prd-viewer.tsx:154-206`
- `src/components/ac/ac-viewer.tsx:148-176`

**Problem:** Inline `components` prop object recreated every render. react-markdown treats new reference as prop change → full re-parse.

**Fix:** Extract to module-scope constant outside component.

```typescript
// Module scope (outside component)
const markdownComponents: Components = {
  h2: ({ children, ...props }) => <h2 id={slugify(String(children))} {...props}>{children}</h2>,
  h3: ({ children, ...props }) => <h3 id={slugify(String(children))} {...props}>{children}</h3>,
  // ... rest of components
};

// Inside component
<ReactMarkdown components={markdownComponents}>
```

**Note:** If heading ID generation depends on props/state, use `useMemo` with empty deps instead. Verify by reading actual code.

**Impact:** Eliminates react-markdown re-parse on every parent render.

---

### Fix 3: Mermaid React.memo (MEDIUM)

**File:** `src/components/prd/mermaid.tsx:27`

**Problem:** Plain function component. Parent PrdViewer re-render → all Mermaid instances re-render even with identical `chart` prop.

**Fix:** Wrap export in `React.memo`.

```typescript
export const Mermaid = React.memo(({ chart }: MermaidProps) => {
  // existing body unchanged
});
```

**Impact:** Prevents redundant diagram re-renders from parent streaming updates.

---

### Fix 4: ChatBubble React.memo (LOW)

**File:** `src/components/chat/chat-bubble.tsx:28`

**Problem:** Each message bubble re-renders when ChatPanel re-renders. Historical messages are static.

**Fix:** Wrap in `React.memo`.

```typescript
export const ChatBubble = React.memo(({ message, isLast }: ChatBubbleProps) => {
  // existing body unchanged
});
```

**Impact:** Skips historical message re-renders during streaming. Only active/streaming bubble re-renders.

---

### Fix 5: streamApiCall Deps Cleanup (MEDIUM)

**File:** `src/components/chat/chat-panel.tsx:678-694`

**Problem:** `streamApiCall` useCallback has 15 dependencies including `thinkingText` which updates per-token during reasoning phase. Each recreation invalidates `handleSendWithMessage` memo cascade.

**Fix:** Remove `thinkingText` from dependency array. Use ref for thinking text access inside callback.

```typescript
const thinkingTextRef = useRef(thinkingText);
thinkingTextRef.current = thinkingText;

const streamApiCall = useCallback(async (...) => {
  // use thinkingTextRef.current instead of thinkingText
}, [...otherDepsWithoutThinkingText]);
```

**Impact:** Reduces callback recreation from per-token to per-state-change.

---

### Fix 6: Kanban Polling → TanStack Query (MEDIUM)

**File:** `src/hooks/use-kanban-polling.ts`

**Problem:** Custom setInterval polling with manual backoff, visibility handling. Duplicates TanStack Query functionality. Raw fetch without error boundary.

**Fix:** Replace with `useQuery` + `refetchInterval`.

```typescript
import { useQuery } from '@tanstack/react-query';

export function useKanbanTasks(projectId: string) {
  return useQuery({
    queryKey: ['kanban-tasks', projectId],
    queryFn: () => fetchTasks(projectId),
    refetchInterval: 10_000,
    refetchOnWindowFocus: true,
    staleTime: 5_000,
  });
}
```

**Impact:** Eliminates ~130 lines custom polling code. Gains caching, deduplication, error boundary integration, devtools.

**Risk:** Must verify existing consumers of `useKanbanPolling` hook adapt to new return shape.

---

### Fix 7: framer-motion → CSS @keyframes (MEDIUM)

**Files:**
- `src/components/chat/chat-bubble.tsx:3`
- `src/components/layout/hero.tsx`
- `src/components/chat/typing-indicator.tsx`

**Problem:** framer-motion (~30-50KB gzipped) used only for entry animations (opacity/y). Three separate import sites.

**Fix:** Replace `motion.div` with CSS `@keyframes` + Tailwind `animate-*` utilities.

```css
/* In styles.css or component-scoped */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fadeInUp 0.3s ease-out; }
```

```tsx
// Before
<motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>

// After
<div className="animate-fade-in-up">
```

**Impact:** ~30-50KB bundle reduction. CSS animations are GPU-accelerated, no JS overhead.

**Risk:** Verify animation parity visually. Framer Motion exit animations need alternative (CSS transition or keep FM only where exit needed).

---

### Fix 8: jszip Dynamic Import (LOW)

**File:** Wherever jszip is imported (grep for `import.*jszip`)

**Problem:** jszip (~90KB gzipped) loaded eagerly despite being export-only feature.

**Fix:** Dynamic import at point-of-use.

```typescript
// Before
import JSZip from 'jszip';

// After
const handleExport = async () => {
  const JSZip = (await import('jszip')).default;
  // ... rest of export logic
};
```

**Impact:** ~90KB removed from initial bundle. Loaded only when user clicks export.

---

### Fix 9: livePatchPrd Memoization (MEDIUM)

**File:** `src/components/chat/chat-panel.tsx:34-94`

**Problem:** Multiple regex passes over entire PRD content string on every rAF flush (~60fps). For large PRDs (50KB+), O(n) string scanning per frame.

**Fix:** Memoize result against content identity. Only re-run when content actually changes.

```typescript
const patchedPrd = useMemo(() => {
  if (!isReviseMode) return streamingContent;
  return livePatchPrd(currentPrdContent, streamingContent);
}, [isReviseMode, currentPrdContent, streamingContent]);
```

**Note:** `streamingContent` changes every frame during streaming, so memo won't help during active stream. Real fix: throttle livePatchPrd calls to max 10fps during streaming, or diff-based patching. Verify actual bottleneck before implementing.

**Impact:** Reduces per-frame CPU for large PRDs during revision mode.

---

### Fix 10: Vite manualChunks Config (LOW)

**File:** `vite.config.ts`

**Problem:** No manual chunks strategy. Heavy vendor deps (mermaid, react-markdown, framer-motion) may duplicate across route chunks.

**Fix:** Add manualChunks to rollupOptions.

```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-markdown': ['react-markdown', 'remark-gfm', 'rehype-highlight'],
        'vendor-mermaid': ['mermaid'],
        'vendor-motion': ['framer-motion'],
      },
    },
  },
},
```

**Note:** Only applies if framer-motion not fully removed in Fix 7. Adjust based on final state.

**Impact:** Better vendor chunk sharing across routes. Reduced total download for multi-page sessions.

---

## Testing Strategy

1. **Per-fix verification:** Run `pnpm test` after each commit. All existing tests must pass.
2. **Lighthouse trace:** Before Fix 1 and after Fix 10, run Lighthouse performance audit on `/prd/$id` route during active streaming. Compare scores.
3. **Manual smoke test:** After all fixes, verify:
   - PRD streaming renders smoothly
   - Chat messages appear with animation
   - Mermaid diagrams render correctly
   - Kanban board polls tasks
   - Export generates valid zip
4. **Bundle analysis:** Run `pnpm build` before and after. Compare chunk sizes.

## Out of Scope

- Font optimization (Finding 6.1) — low impact, requires font file changes
- Favicon sizes attribute (Finding 6.2) — trivial, not worth commit
- CSS file consolidation (Finding 8.1) — low impact, risk of breaking styles
- WhiteboardCanvas node memoization (Finding 4.3) — acceptable for static diagram
- FlowStepNav memoization (Finding 4.4) — minimal cost, 4 items only
- extractSections caching (Finding 2.4) — premature optimization
- Request deduplication (Finding 7.3) — mitigated by destructive read pattern

</parameter>
<arg_key>description>Write performance optimization spec