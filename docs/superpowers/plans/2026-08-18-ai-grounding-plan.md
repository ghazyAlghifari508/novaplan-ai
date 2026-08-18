# NovaPlan AI Knowledge Grounding (Context7) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground NovaPlan's AI generations on latest Context7 docs for the user's selected stack, without hardcoding library names, so PRD/AC/Task stop hallucinating about newer platforms (Insforge, mayar.id, mastra.ai).

**Architecture:** A server-side `grounding.ts` module reads the tech stack from the text each generation route already holds, looks each label up in Context7 (free HTTP JSON-RPC, no key), and appends the returned docs to the system prompt. Stack labels are detected by matching against the keys of `STACK_ICONS` in the existing `src/lib/stack-data.ts` — no new hardcoded library list. Any Context7 failure skips silently (`""`), so generation never regresses.

**Tech Stack:** TypeScript, TanStack Start route handlers, `fetch` (Node global), Context7 MCP JSON-RPC over HTTP (`https://mcp.context7.com/mcp`).

## Global Constraints

- **Never hardcode a library name** in grounding logic — the only source of labels is `STACK_ICONS` keys + free-text from route content.
- **`groundStack()` never throws** — every Context7 failure/timeout/not-found → skip that label; all-fail → return `""`. Grounding is a no-op on failure.
- **Latest docs only** — `query-docs` is called without a pinned version so Context7 returns current docs.
- **Server-only** — `grounding.ts` imports only into server route handlers, never client components.
- **Credit/plan/rate-limit flow untouched** — grounding runs *after* all gates, *before* streaming.
- **No new dependencies** — use global `fetch`, no packages.
- **Bahasa Indonesia** for user-facing copy; code identifiers/comments English.
- Build must pass (`pnpm build`) after each task; existing tests stay green.

---

### Task 1: Context7 JSON-RPC client

**Files:**
- Create: `src/lib/context7-client.ts`
- Test: none for this task (covered via Task 2's mocked tests)

**Interfaces:**
- Produces: `resolveLibraryId(query: string, ms?: number): Promise<string | null>` and `queryDocs(libraryId: string, query: string, ms?: number): Promise<string>` — both used by Task 2.

A minimal MCP client over HTTP. The MCP server answers SSE-formatted responses (`event: message\ndata: <json>`); each request needs an `initialize` handshake then a `tools/call`. Implementation parses the SSE stream for the `data:` JSON payload.

- [ ] **Step 1: Create `src/lib/context7-client.ts`**

```typescript
// src/lib/context7-client.ts
// Minimal Context7 MCP client over HTTP JSON-RPC. No SDK, no API key.
// Context7 serves SSE-framed JSON-RPC responses (event: message / data: {...}).

const CONTEXT7_URL = "https://mcp.context7.com/mcp";

interface McpResult {
	result?: {
		content?: Array<{ type: string; text: string }>;
		tools?: Array<{ name: string }>;
	};
	error?: { message: string };
}

/** Send one JSON-RPC request, parse the SSE `data:` lines, return first result object. */
async function rpc(
	method: string,
	params: Record<string, unknown>,
): Promise<McpResult | null> {
	const res = await fetch(CONTEXT7_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json, text/event-stream",
		},
		body: JSON.stringify({
			jsonrpc: "2.0",
			id: Math.floor(Math.random() * 1e9),
			method,
			params,
		}),
	});
	if (!res.ok) return null;
	const text = await res.text();
	for (const line of text.split("\n")) {
		if (!line.startsWith("data:")) continue;
		try {
			const parsed = JSON.parse(line.slice(5).trim()) as {
				result?: McpResult["result"];
				error?: { message: string };
			};
			if (parsed.error) return { error: parsed.error };
			return { result: parsed.result };
		} catch {
			// ignore malformed data lines
		}
	}
	return null;
}

/** Upper-bound a JSON-RPC call so a slow Context7 never stalls generation. */
async function rpcWithTimeout(
	method: string,
	params: Record<string, unknown>,
	ms: number,
): Promise<McpResult | null> {
	const ctrl = new AbortController();
	const timer = setTimeout(() => ctrl.abort(), ms);
	try {
		return await rpc(method, params);
	} catch {
		return null;
	} finally {
		clearTimeout(timer);
		if (!ctrl.signal.aborted) {
			try {
				setTimeout(() => ctrl.abort(), 0);
			} catch {}
		}
	}
}

/**
 * Fuzzy-search a library by free text. Returns the best-matching library ID
 * (e.g. "/insforge/insforge") or null when nothing matches / call fails.
 */
export async function resolveLibraryId(
	query: string,
	ms = 3000,
): Promise<string | null> {
	const init = await rpcWithTimeout("initialize", {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "novaplan-grounding", version: "0.0.1" },
	}, ms);
	if (!init?.result) return null;

	const call = await rpcWithTimeout("tools/call", {
		name: "resolve-library-id",
		arguments: { query, libraryName: query },
	}, ms);
	const content = call?.result?.content;
	if (!content) return null;
	for (const c of content) {
		if (c.type !== "text" || !c.text) continue;
		// best match is the first bracketed library ID in the response text
		const m = c.text.match(/\[\/[\w./-]+\]/);
		if (m) return m[0].slice(1, -1);
	}
	return null;
}

/**
 * Fetch documentation snippets for a library ID (no version → auto-latest).
 * Returns the raw text content, or "" on failure.
 */
export async function queryDocs(
	libraryId: string,
	query: string,
	ms = 3000,
): Promise<string> {
	const init = await rpcWithTimeout("initialize", {
		protocolVersion: "2024-11-05",
		capabilities: {},
		clientInfo: { name: "novaplan-grounding", version: "0.0.1" },
	}, ms);
	if (!init?.result) return "";

	const call = await rpcWithTimeout("tools/call", {
		name: "query-docs",
		arguments: { libraryId, query },
	}, ms);
	const content = call?.result?.content;
	if (!content) return "";
	return content
		.filter((c) => c.type === "text" && c.text)
		.map((c) => c.text)
		.join("\n");
}
```

- [ ] **Step 2: Sanity check file compiles**

Run: `pnpm exec tsc --noEmit -p tsconfig.json 2>&1 | grep -c "context7-client"` 
Expected: prints `0` (no type errors in this file). If the project type-checks slowly, this step may be folded into Task 2's build.

- [ ] **Step 3: Commit**

```bash
git add src/lib/context7-client.ts
git commit -m "feat(ai): add Context7 MCP JSON-RPC client"
```

---

### Task 2: Grounding core — extract labels + build context block

**Files:**
- Create: `src/lib/grounding.ts`
- Consumes: `resolveLibraryId`, `queryDocs` from Task 1; `STACK_ICONS` from `@/lib/stack-data`

**Interfaces:**
- Produces: `extractStackLabels(text: string): string[]` and `groundStack(text: string): Promise<string>` — used by Tasks 4-6.

Extraction matches the text against the **existing** label keys of `STACK_ICONS` (case-insensitive). This is deliberately not a new hardcoded list: any future stack added to Ask-flow dropdowns is detected automatically. `groundStack` returns `""` on any failure path.

- [ ] **Step 1: Create `src/lib/grounding.ts`**

```typescript
// src/lib/grounding.ts
// Grounds AI generation on up-to-date Context7 docs for the user's stack.
// Label source is STACK_ICONS keys (existing stack-data) — no hardcoded list.
// Never throws: any failure returns "" so generation is byte-for-byte unchanged.

import { STACK_ICONS } from "@/lib/stack-data";
import { queryDocs, resolveLibraryId } from "@/lib/context7-client";

/** Detect stack labels (STACK_ICONS keys) present in the given text, case-insensitive. */
export function extractStackLabels(text: string): string[] {
	const lower = text.toLowerCase();
	const found: string[] = [];
	for (const label of Object.keys(STACK_ICONS)) {
		if (lower.includes(label.toLowerCase())) found.push(label);
	}
	return found;
}

/** Guard: keep resolution concurrency bounded so many labels don't pile up. */
async function mapLimit<T, R>(
	items: T[],
	limit: number,
	fn: (item: T) => Promise<R>,
): Promise<R[]> {
	const out: R[] = new Array(items.length);
	let idx = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (idx < items.length) {
			const i = idx++;
			out[i] = await fn(items[i]).catch(() => null as R);
		}
	});
	await Promise.all(workers);
	return out.filter((r) => r !== null);
}

/**
 * Resolve + fetch latest docs for each stack label, then build a single
 * grounded-context block. Returns "" when nothing resolved (graceful no-op).
 */
export async function groundStack(text: string): Promise<string> {
	const labels = extractStackLabels(text);
	if (labels.length === 0) return "";

	// First pass: resolve every label to a library id (parallel, bounded).
	const resolutions = await mapLimit(labels, 4, async (label) => {
		const id = await resolveLibraryId(label);
		return { label, id };
	});

	// Second pass: fetch docs for the ones that resolved.
	const docs = await mapLimit(resolutions, 2, async ({ label, id }) => {
		if (!id) return null;
		const content = await queryDocs(id, `${label} current documentation`);
		if (!content) return null;
		return `## ${label}\n${content}`;
	});

	const body = docs.filter((d) => d !== null).join("\n\n");
	if (!body) return "";

	return (
		"\n\n--- FAKTA EKSTERNAL TERVERIFIKASI (dari Context7 docs) ---\n" +
		"Gunakan fakta berikut untuk menjawab, JANGAN menebak detail teknis yang tidak tercakup di sini.\n" +
		body +
		"\n--- AKHIR FAKTA EKSTERNAL ---"
	);
}
```

- [ ] **Step 2: Create `src/lib/grounding.test.ts`** (pure parts only, fetch mocked)

```typescript
// src/lib/grounding.test.ts
import { describe, expect, it, vi } from "vitest";
import { extractStackLabels, groundStack } from "@/lib/grounding";

// Mock the context7 client so tests never hit the network.
vi.mock("@/lib/context7-client", () => ({
	resolveLibraryId: vi.fn(async (q: string) =>
		q.toLowerCase().includes("insforge") ? "/insforge/insforge" : null,
	),
	queryDocs: vi.fn(async () => "Insforge: integrates Postgres, auth, storage."),
}));

describe("extractStackLabels", () => {
	it("detects labels present in text, case-insensitive", () => {
		const labels = extractStackLabels(
			"Frontend: tanstack start\nBackend: insforge (baas)\nDatabase: NeoN",
		);
		expect(labels).toContain("TanStack Start");
		expect(labels).toContain("Insforge (BaaS)");
		expect(labels).toContain("Neon");
	});
	it("returns empty when no stack matches", () => {
		expect(extractStackLabels("just a plain product idea")).toEqual([]);
	});
});

describe("groundStack", () => {
	it("returns empty string when no label resolves", async () => {
		const out = await groundStack("no matching platform here");
		expect(out).toBe("");
	});
	it("builds a grounded block for a resolving label, latest docs", async () => {
		const out = await groundStack("backend pakai Insforge (BaaS)");
		expect(out).toContain("--- FAKTA EKSTERNAL TERVERIFIKASI");
		expect(out).toContain("## Insforge (BaaS)");
	});
});
```

- [ ] **Step 3: Run the test — verify it passes**

Run: `pnpm exec vitest run src/lib/grounding.test.ts`
Expected: PASS (2 describe blocks, all cases green).

- [ ] **Step 4: Verify build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/grounding.ts src/lib/grounding.test.ts
git commit -m "feat(ai): ground generation on Context7 docs via grounding module"
```

---

### Task 3: Wire grounding into chat route (PRD generate/revise/chat/resume)

**Files:**
- Modify: `src/routes/api/chat.ts`

**Interfaces:**
- Consumes: `groundStack` from Task 2.
- Context: `message` already holds the compiled prompt with "--- Preferensi Teknis ---\nFrontend: …\nBackend: …" (built in `ask-flow.tsx`). Scanning `message` yields the stack labels.

- [ ] **Step 1: Add import**

At the top of `src/routes/api/chat.ts`, with the other imports:

```typescript
import { groundStack } from "@/lib/grounding";
```

- [ ] **Step 2: Inject grounding into the system prompt**

Find the lines (currently ~148-149):

```typescript
const modelsToTry = selectModels();
systemPrompt += `\n${depthDirective("prd")}`;
```

Replace with:

```typescript
const modelsToTry = selectModels();
// Ground on latest docs for the stack mentioned in the user's prompt.
systemPrompt += `\n${depthDirective("prd")}`;
const grounded = await groundStack(message);
systemPrompt += grounded;
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/chat.ts
git commit -m "feat(ai): ground PRD generation on Context7 stack docs"
```

---

### Task 4: Wire grounding into AC route

**Files:**
- Modify: `src/routes/api/ac/generate.ts`

**Interfaces:**
- Consumes: `groundStack` from Task 2.
- Context: `prdContent` (already loaded at line ~85, contains the "Architecture & Tech Stack" section). Scanning `prdContent` yields the stack labels.

- [ ] **Step 1: Add import**

At the top of `src/routes/api/ac/generate.ts`:

```typescript
import { groundStack } from "@/lib/grounding";
```

- [ ] **Step 2: Inject grounding into the system prompt**

Find (currently line ~111):

```typescript
const systemPrompt = `${AC_GENERATION_PROMPT}\n${depthDirective("ac")}\n\n--- PRD CONTENT ---\n${prdContent}`;
```

Replace with:

```typescript
const grounded = await groundStack(prdContent);
const systemPrompt = `${AC_GENERATION_PROMPT}\n${depthDirective("ac")}\n${grounded}\n\n--- PRD CONTENT ---\n${prdContent}`;
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/ac/generate.ts
git commit -m "feat(ai): ground AC generation on Context7 stack docs"
```

---

### Task 5: Wire grounding into Task route

**Files:**
- Modify: `src/routes/api/task/generate.ts`

**Interfaces:**
- Consumes: `groundStack` from Task 2.
- Context: `acMarkdown` (already loaded at line ~88). The AC text typically restates stack/libraries from the PRD; scanning it yields labels. If `acMarkdown` contains no stack (weak signal), `groundStack` returns `""` → graceful no-op.

- [ ] **Step 1: Add import**

At the top of `src/routes/api/task/generate.ts`:

```typescript
import { groundStack } from "@/lib/grounding";
```

- [ ] **Step 2: Inject grounding into the system prompt**

Find (currently line ~113):

```typescript
const systemPrompt = `${TASK_GENERATION_PROMPT}\n\n--- ACCEPTANCE CRITERIA ---\n${acMarkdown}`;
```

Replace with:

```typescript
const grounded = await groundStack(acMarkdown);
const systemPrompt = `${TASK_GENERATION_PROMPT}\n${grounded}\n\n--- ACCEPTANCE CRITERIA ---\n${acMarkdown}`;
```

- [ ] **Step 3: Verify build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/api/task/generate.ts
git commit -m "feat(ai): ground task generation on Context7 stack docs"
```

---

### Task 6: Full-suite verification

**Files:**
- None (verification only).

**Interfaces:**
- Consumes: all prior tasks on this branch.

- [ ] **Step 1: Run full test suite**

Run: `pnpm test`
Expected: all existing tests green (104 baseline + 4 new grounding assertions).

- [ ] **Step 2: Final build**

Run: `pnpm build`
Expected: PASS.

- [ ] **Step 3: Manual smoke (optional but recommended)**

Start the dev server (`pnpm dev`), log into the app, run the Ask flow choosing **Insforge (BaaS)** as backend, generate a PRD, and confirm the PRD reflects real Insforge capabilities (Postgres/Auth/Storage) rather than hallucinated APIs. Also open DevTools Network tab and confirm an outbound request to `https://mcp.context7.com/mcp` fires during generation. If the network is unavailable, generation still completes — grounding degrades silently.

- [ ] **Step 4: Commit (if any fixes were needed)**

If Steps 1-2 required fixes, commit them. Otherwise, nothing to commit.