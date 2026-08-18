# NovaPlan AI Knowledge Grounding (Context7) — Design

> **Date:** 2026-08-18
> **Status:** Approved design, pending implementation plan

## Problem

NovaPlan's AI generates PRDs, ACs, and tasks from a user's product idea. The AI is a plain LLM routed through a local 9Router — it has **no external knowledge beyond its training cutoff**. When a user picks a newer or niche platform in the Ask flow (Insforge, mayar.id, mastra.ai), the model **hallucinates** its capabilities, APIs, and setup into the PRD/AC/Task. The problem is not a "bad model" — the app sends **zero grounding context**, so any model is forced to guess about tech it was not trained on.

## Goal

Ground NovaPlan's AI generation on **up-to-date, authoritative docs** for the stack the user selected, so PRDs/ACs/Tasks are accurate about real platforms — without hardcoding any library names into source code, and without adding a paid API or API keys.

## Solution

Inject a proof-of-fact layer in front of AI generation: read the stack the user picked, ask **Context7** (a free public docs-index service, no API key) for the latest documentation of each selected tech, and inject that verified context into the AI's system prompt before it generates.

Context7 (`https://mcp.context7.com/mcp`) was verified reachable via plain HTTP JSON-RPC (no key, no client needed): it exposes `resolve-library-id` (fuzzy-search by free text) and `query-docs` (fetch docs/snippets for a library).

### Non-hardcode guarantee

The grounding layer does **not** define a list of known libraries. The stack comes from the user's own Ask-flow selections (labels already present in `src/lib/stack-data.ts`, e.g. `"Insforge (BaaS)"`). Those labels — including any custom value the user types — are sent verbatim to Context7's fuzzy search. A new library appears in the Ask list (or is typed as custom) and is grounded automatically with zero code changes.

## Scope

**In scope — grounding injected into all 3 generation routes:**
- `src/routes/api/chat.ts` — PRD generate / revise / chat / resume (system prompt built ~line 149)
- `src/routes/api/ac/generate.ts` — AC generation (system prompt ~line 111)
- `src/routes/api/task/generate.ts` — Task tree generation (system prompt ~line 113)

**Out of scope:**
- Ask-flow Session 1 (`/api/ask/options`) — asks non-technical questions, has no stack to ground. Session 2 tech picks are the *source* of grounding, not a target.
- `completeChat` (non-streamed) — check whether it is used anywhere before touching; currently appears unused by routes (`streamChat` is the path).

## Architecture

### New module: `src/lib/grounding.ts`

Single fault-isolated module. Responsibility: take stack labels → return a grounded-context block (string) to append to the system prompt, or `""` (skip) on any failure.

```
groundStack(stackLabels: string[]): Promise<string>
  for each label:
    context7: resolve-library-id(label)  → best match
      on no match / error → skip this label
    context7: query-docs(libraryId, "<latest docs>")
    collect snippets
  return "" (nothing matched / all failed)   ← graceful no-op
  OR return combined grounded text block
```

**Behavior contract (critical):**
- **Never throws.** Every Context7 fetch failure, timeout, or "not found" → skip that label, continue. If everything fails → returns `""`.
- **No hardcoded library names.** Input is user-selected labels only.
- **Latest docs.** `query-docs` without a pinned version returns current documentation (auto-latest), satisfying the "must be latest" requirement.
- **Timeout + concurrency bound.** Per-request timeout (e.g. 3s) and a small concurrency limit so a slow/missing Context7 never delays generation meaningfully. Budget: grounding adds latency only on success; on failure it adds ~0.

### Data flow (per route)

```
1. Require user, plan gate, credit gate, rate limit — UNCHANGED (all run first)
2. Build base system prompt — UNCHANGED
3. NEW: derive stack labels from the route's inputs
4. NEW: grounded = await groundStack(labels)
5. systemPrompt += grounded            (appended; "" when nothing grounded)
6. selectModels() → tryStreamWithFallback(...)      — rest of streaming UNCHANGED
```

### Deriving stack labels per route

- **chat.ts:** `preferences` payload (optional `Record<string, unknown>`) already carries Ask-flow stack answers into `ensureConversation`. Flatten its values that look like stack selections.
- **ac/generate.ts & task/generate.ts:** these receive only `{ projectId }`. The stack for the project must be loaded — from the persisted conversation `preferences` (via `getConversationHistory`/conversation row) or, failing that, from scanning the PRD/AC content for stack labels. Prefer persisted `preferences`; fall back to content scan only if preferences are absent.

### Context7 client

Small client inside `grounding.ts` (or adjacent `context7-client.ts`) speaking JSON-RPC over `fetch` to `https://mcp.context7.com/mcp`. Steps per call: `initialize` → `notifications/initialized` → `tools/call`. Base URL is a constant (the Context7 public endpoint).

**Server-only.** Grounding talks to an external host → must run in a server context only. Routes are server handlers, so this is satisfied. Keep `grounding.ts` imported only by server routes (no client bundle).

### Error handling

Every external call wrapped; `groundStack` returns `""` on any failure. The generation flow is byte-for-byte unchanged when grounding is skipped. Log warnings (not errors) when grounding fails, so issues are observable without affecting users.

## Testing

- **Unit test `grounding.test.ts`** for the pure parts (label → context7 args shaping, block assembly, skip-on-empty hardening) using mocked fetch. No live network in unit tests.
- **No groundStack live test in CI** (network-dependent). Verification of the live integration is manual via the running dev server + browser.
- **Build + full test suite** must stay green (`pnpm build`, existing tests).

## Files

| Action | File |
|---|---|
| Create | `src/lib/grounding.ts` (+ optional `src/lib/context7-client.ts`) |
| Modify | `src/routes/api/chat.ts` (inject after `systemPrompt` built) |
| Modify | `src/routes/api/ac/generate.ts` (load stack, inject) |
| Modify | `src/routes/api/task/generate.ts` (load stack, inject) |
| Test | `src/lib/grounding.test.ts` |

## Non-goals / YAGNI

- No web search vendor (Exa/Brave/Tavily) — paid, unnecessary when Context7 covers the needed stack. Add only if a needed library ever evades Context7.
- No LLM-based stack extraction — Ask-flow already gives structured labels; regex/LLM parsing of free text is unneeded and fragile.
- No MCP connection pooling/streaming-keepalive — per-request handshake is simpler and adequately fast for a generation (latency already seconds-long). Add pooling only if profiling shows Context7 handshake latency matters.
- No caching layer initially — re-fetch per generation is fine and always-fresh; add cache if volume demands.