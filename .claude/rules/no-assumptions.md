# No-Assumption & Deep Analysis Rules

## Core Principle

**NEVER answer from assumptions.** Every claim about the codebase must be verified with tools. Every implementation must be grounded in actual code evidence. Guessing wastes user time and ships broken code.

---

## Rule 1: No Assumption Responses

When the user asks a question about the app, codebase, features, bugs, errors, design, UX, or architecture:

1. **Do NOT answer from memory or training data.** Your memory of this codebase is unreliable.
2. **Do NOT assume file contents, function signatures, or behavior.** Read the file first.
3. **Do NOT assume "it probably works like X."** Verify with Grep/Read/Glob.
4. **If you don't know, say "I don't know, let me check."** Then use tools to find out.

### Red Flags in Your Own Responses

If you catch yourself saying any of these, STOP — you're guessing:

- "I think this file..."
- "This probably means..."
- "Based on typical Next.js apps..."
- "The error is likely caused by..."
- "I believe the issue is..."
- "Most likely..."

Replace with: "Let me verify" → then use tools.

---

## Rule 2: Brainstorm Before Answering Complex Questions

When the user asks a question that requires analysis, design thinking, or multiple possible approaches:

1. **Identify if brainstorming is needed.** Questions like:
   - "How should we implement X?"
   - "What's the best approach for Y?"
   - "Why is this happening?"
   - "How do we fix this?"
   - "What do you think about Z?"
   - Any question with multiple valid answers

2. **Brainstorm BEFORE responding.** Use the brainstorming skill if available. If not:
   - List 2-3 possible approaches
   - For each: pros, cons, effort level
   - Recommend one with reasoning grounded in the actual codebase

3. **Do NOT give a single answer without exploring alternatives.** The first idea is rarely the best one.

4. **Do NOT brainstorm in silence.** Show your thinking to the user. They may have context you lack.

---

## Rule 3: Deep Audit Before Implementation

Before implementing ANY change related to features, bugs, errors, design, or UX:

### Step 1: Understand the Current State

```
1. Read the relevant files (not just the target file — read its callers, imports, and dependencies)
2. Trace the execution flow end-to-end
3. Identify ALL files that will be affected by the change
4. Check existing patterns — how has this codebase solved similar problems before?
```

### Step 2: Root Cause Analysis (for bugs/errors)

```
1. Do NOT fix symptoms. Find root cause.
2. Reproduce the issue mentally or with tools
3. Trace from the error message back to the source
4. Check recent git changes that may have introduced the bug
5. Verify the fix addresses root cause, not just the visible symptom
```

### Step 3: Impact Assessment

```
1. What files change?
2. What depends on those files?
3. What could break?
4. Is this change backward-compatible?
5. Are there tests that need updating?
```

---

## Rule 4: Use Relevant Skills & Agents

When implementing changes, ALWAYS check for and use relevant skills/agents:

### NovaPlan Tech Stack Reference

| Layer | Technology |
|---|---|
| Framework | TanStack Start + TanStack Router (file-based routing) |
| UI | React 19, Radix UI, shadcn/ui, Tailwind CSS 4, Framer Motion |
| State | Zustand, TanStack Query |
| Auth | Better Auth (Google + GitHub OAuth) |
| DB | PostgreSQL 17 (local), Drizzle ORM |
| AI | Vercel AI SDK (`ai` package), @ai-sdk/openai |
| Validation | Zod v4 |
| Lint/Format | Biome |
| Testing | Vitest (unit), Playwright (e2e) |
| Build | Vite 8, TypeScript 6 |
| Package Manager | pnpm |

### Skills & Agents Map — Match to Task

| Task Type | Skills / Agents | Notes |
|---|---|---|
| **New feature** | `superpowers:brainstorming` → `ecc:planner` → `ecc:code-architect` | Always brainstorm first, then plan, then implement |
| **React/TSX change** | `ecc:react-reviewer` agent | MUST USE for any .tsx/.jsx change |
| **TypeScript change** | `ecc:typescript-reviewer` agent | MUST USE for any .ts change |
| **Build error** | `ecc:build-error-resolver`, `ecc:react-build-resolver` | React-specific resolver for TSX compile/hydration errors |
| **Bug fix** | `superpowers:systematic-debugging` → `ecc:code-explorer` | Systematic debugging skill first, then explore |
| **UI/UX change** | `ecc:a11y-architect`, `ecc:frontend-design-direction`, `ui-design-system` skill, `ecc:react-patterns` | A11y check mandatory for UI changes |
| **Database change** | `ecc:database-reviewer`, `ecc:postgres-patterns`, `ecc:database-migrations` | For Drizzle schema, queries, migrations |
| **Security** | `ecc:security-reviewer`, `ecc:security-scan` skill, `better-auth-security-best-practices` skill | MUST USE after auth/API endpoint changes |
| **Performance** | `ecc:performance-optimizer` | Bundle size, render perf, algorithmic |
| **Code review** | `ecc:code-reviewer` skill / agent | After every code change |
| **Testing** | `superpowers:test-driven-development`, `ecc:tdd-guide` skill | Vitest for unit, Playwright for e2e |
| **E2E testing** | `ecc:e2e-runner` agent | Playwright-based |
| **Docs update** | `ecc:doc-updater`, `ecc:update-codemaps`, `ecc:update-docs` | After feature changes |
| **TanStack/Router** | `context7-mcp` skill → `mcp__context7__resolve-library-id` + `mcp__context7__query-docs` | Fetch current TanStack docs, never guess API |
| **Tailwind CSS** | `context7-mcp` skill | Fetch Tailwind v4 docs (class syntax changed from v3) |
| **Drizzle ORM** | `context7-mcp` skill | Fetch current Drizzle docs |
| **Better Auth** | `context7-mcp` skill + `better-auth-security-best-practices` skill | Fetch docs + security patterns |
| **Vercel AI SDK** | `claude-api` skill + `context7-mcp` skill | For AI SDK usage, model config |
| **Radix UI / shadcn** | `shadcn-component-discovery` skill | Component patterns and variants |
| **Cleanup/refactor** | `ecc:refactor-cleaner`, `ecc:code-simplifier` | Dead code removal, simplification |
| **Silent failures** | `ecc:silent-failure-hunter` | Swallowed errors, bad fallbacks |
| **App run/verify** | `run` skill | Launch dev server to verify changes |

### How to Use Skills

1. Before starting work, ask: "Is there a skill for this?"
2. If yes, invoke it FIRST — before any code changes
3. Follow the skill's workflow exactly
4. If no skill exists, follow the manual audit process (Rule 3)
5. For library/framework questions: ALWAYS use `context7-mcp` to fetch current docs — never answer from training data

---

## Rule 5: Verify Every Claim

Before stating ANY fact about the codebase, verify it:

| You Want to Say | Verify With |
|---|---|
| "File X does Y" | `Read` the file |
| "Function Z is called by..." | `Grep` for callers |
| "This component uses..." | `Read` the component |
| "The error comes from..." | `Grep` for the error message |
| "This pattern is used in..." | `Grep` for the pattern |
| "No files depend on this" | `Grep` for imports/references |

**If you cannot verify a claim, state the uncertainty explicitly.**

---

## Rule 6: No Hallucinated Code

When writing or editing code:

1. **Read the file first.** Never write to a file you haven't read in this conversation.
2. **Check existing patterns.** Look at how similar code is written in this project.
3. **Verify imports exist.** Don't import from paths you haven't confirmed.
4. **Check types.** Don't assume type signatures — read the type definitions.
5. **Test your logic mentally.** Walk through the code with sample inputs before committing.

---

## Rule 7: Explain Before Implementing

Before making significant changes:

1. **State what you found** from your analysis
2. **State what you plan to change** and why
3. **State the risk** — what could break
4. **Wait for user confirmation** if the change is non-trivial

Exception: trivial fixes (typo, obvious one-liner) — just do it and report.

---

## Rule 8: Commit + Push After Every Task

After completing any task:

1. `git add` the changed files
2. `git commit` with a descriptive message
3. `git push` to remote

No exceptions unless user explicitly says otherwise.

---

## Anti-Patterns

| Anti-Pattern | Why It's Wrong | Correct Behavior |
|---|---|---|
| Answering "I think it's because..." | Guessing, may mislead | "Let me check" → tools |
| Fixing without reading callers | May break other code | Grep for all callers first |
| Assuming file contents | Files change, memory is stale | Read the file |
| Skipping brainstorm | First idea often wrong | List alternatives, compare |
| Implementing without skill check | Missing established workflows | Check skills first |
| "This is a simple change" | Simple changes break things too | Still do impact assessment |
| Claiming "no dependencies" without searching | May have hidden imports | Grep for references |
| Using training data for library APIs | APIs change, training data is old | Use Context7 or docs |

---

## Rule 9: Gunakan Bahasa Indonesia

Selalu jawab pertanyaan user dalam **Bahasa Indonesia** kecuali:

- User menulis dalam bahasa Inggris → jawab bahasa Inggris
- User menulis dalam bahasa lain → jawab dalam bahasa yang sama
- Kode, error message, nama file, nama fungsi, URL → tetap dalam bahasa aslinya (English)
- Commit message, PR description → English (standar git)

**Jangan translate istilah teknis** — tetap pakai nama asli: React hooks, database query, API endpoint, polling, caching, dll. Jangan dipaksa jadi bahasa Indonesia ("kait reaksi", "kueri basis data").

Pattern: penjelasan → Bahasa Indonesia. Kode/teknis → English as-is.

---

## Summary

1. **No assumptions** — verify everything with tools
2. **Brainstorm first** — explore alternatives before recommending
3. **Deep audit** — understand the codebase before changing it
4. **Use skills** — leverage established workflows
5. **Verify claims** — every fact needs evidence
6. **No hallucinated code** — read before write
7. **Explain before implement** — state findings and plan
8. **Commit + push** — every task, no exceptions
