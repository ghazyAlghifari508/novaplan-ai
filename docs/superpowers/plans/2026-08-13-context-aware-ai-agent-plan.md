# Context-Aware AI Coding Agent Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance CLI and AI prompt templates to automatically inject PRD and AC context into task outputs, preventing AI coding agents from missing project requirements.

**Architecture:** Extend backend REST API endpoints (`/api/v1/projects/:id/tasks`), CLI commands (`novaplan task next` and `novaplan export rules`), and frontend `AI_AGENT_PROMPT_TEMPLATE` component to attach matched Acceptance Criteria snippets to tasks.

**Tech Stack:** TypeScript 6, Node.js, Commander / CLI, React 19, Drizzle ORM, TanStack Start.

## Global Constraints

- Tech Stack: TypeScript 6, React 19, Tailwind CSS 4, Drizzle ORM, Biome.
- Language: Bahasa Indonesia for user-facing UI copy and prompts; English for code identifiers and git messages.

---

### Task 1: Enrich Task REST API with Matched Acceptance Criteria Context

**Files:**
- Modify: `src/routes/api/v1/projects/$id/tasks.ts`
- Modify: `src/lib/services/task-service.ts`
- Test: `src/routes/api/v1/projects/$id/tasks.test.ts` (or equivalent unit test)

**Interfaces:**
- Consumes: `getLatestAcVersion(projectId)` from `src/lib/services/ac-service.ts`
- Produces: `TaskResponse` containing optional `acContext?: string` field matched by `featureName`.

- [ ] **Step 1: Write failing unit test for task list with AC context**

Create/update test to check that `GET /api/v1/projects/:id/tasks` returns `acContext` for tasks matching an AC feature name.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/routes/api/v1/projects/$id/tasks.test.ts`
Expected: FAIL due to missing `acContext` field.

- [ ] **Step 3: Implement AC context extraction in Task REST API**

Update `src/routes/api/v1/projects/$id/tasks.ts` to fetch the latest `acVersion` for the project, parse markdown sections by `featureName`, and append matching AC text to each task object returned.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test src/routes/api/v1/projects/$id/tasks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add src/routes/api/v1/projects/$id/tasks.ts src/lib/services/task-service.ts
git commit -m "feat(api): include matched AC context in tasks API response"
```

---

### Task 2: Enhance CLI `novaplan task next` Output with AC Context

**Files:**
- Modify: `packages/cli/src/commands/task.ts`
- Test: `packages/cli/src/commands/task.test.ts`

**Interfaces:**
- Consumes: Enriched `TaskResponse` with `acContext` from `/api/v1/projects/:id/tasks`
- Produces: Formatted CLI stdout including AC rules under each next task.

- [ ] **Step 1: Write failing test for `novaplan task next` output**

Verify `taskNextCommand` prints `Acceptance Criteria (AC)` block when `acContext` is present in API response.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novaplan/cli test`
Expected: FAIL due to missing AC output section in CLI log.

- [ ] **Step 3: Implement AC rendering in `taskNextCommand`**

Update `taskNextCommand` in `packages/cli/src/commands/task.ts` to check `task.acContext` and render it using `chalk.yellow` formatting before the action prompt.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novaplan/cli test`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add packages/cli/src/commands/task.ts
git commit -m "feat(cli): display matched acceptance criteria in novaplan task next"
```

---

### Task 3: Add `novaplan export rules` CLI Subcommand

**Files:**
- Create: `packages/cli/src/commands/export.ts`
- Modify: `packages/cli/src/index.ts`
- Test: `packages/cli/src/commands/export.test.ts`

**Interfaces:**
- Consumes: `/api/v1/projects/:id/prd` and `/api/v1/projects/:id/ac`
- Produces: `.claude/rules/project-spec.md` or `.cursorrules` file in current working directory.

- [ ] **Step 1: Write failing test for `novaplan export rules`**

Test that `exportRulesCommand(projectId, { format: 'claude' })` writes `.claude/rules/project-spec.md` containing PRD stack + AC checklist.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @novaplan/cli test`
Expected: FAIL due to command missing.

- [ ] **Step 3: Implement `exportRulesCommand`**

Create `packages/cli/src/commands/export.ts` to fetch PRD and AC content, format as rule document, and save file locally. Register subcommand in `packages/cli/src/index.ts`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @novaplan/cli test`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add packages/cli/src/commands/export.ts packages/cli/src/index.ts
git commit -m "feat(cli): add novaplan export rules command"
```

---

### Task 4: Update `AI_AGENT_PROMPT_TEMPLATE` with Verification Gate

**Files:**
- Modify: `src/components/task/implementation-options.tsx`

**Interfaces:**
- Consumes: Project ID, PRD, AC, tasks
- Produces: Prompt template string with explicit AC verification gate rules.

- [ ] **Step 1: Update prompt template string in `implementation-options.tsx`**

Add Rule #6 (Acceptance Criteria Verification Gate) and instruction to use `novaplan export rules` to `AI_AGENT_PROMPT_TEMPLATE`.

- [ ] **Step 2: Run Biome linter & build check**

Run: `pnpm check`
Expected: 0 errors/warnings.

- [ ] **Step 3: Commit changes**

```bash
git add src/components/task/implementation-options.tsx
git commit -m "feat(task): update AI agent prompt template with AC verification gate"
```
