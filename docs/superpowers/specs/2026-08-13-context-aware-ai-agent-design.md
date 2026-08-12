# Spec: Context-Aware AI Coding Agent Integration (3-Layer Context Lock)

## 1. Overview
Ensure AI coding agents (Claude Code, Cursor, Copilot, etc.) strictly adhere to PRD and Acceptance Criteria (AC) during task execution, eliminating hallucinated scope and unaligned implementations.

## 2. Architecture & Components

### Layer 1: Enhanced CLI Context (`novaplan task next` & REST API)
- **API Change**: `GET /api/v1/projects/:id/tasks?status=pending` or `GET /api/v1/projects/:id/tasks/next` enriched with associated AC section content matched by `featureName`.
- **CLI Output**: `novaplan task next <projectId>` prints:
  - Task & Subtasks (as currently done)
  - **Relevant Acceptance Criteria (AC)** for the task's `featureName`.

### Layer 2: Project Rules Generator (`novaplan export rules` / UI option)
- **CLI Subcommand**: `novaplan export rules <projectId>`
- **Output**: Generates `.claude/rules/project-spec.md` (or `.cursorrules`) containing:
  - Tech Stack & Folder Architecture (from PRD)
  - Full Acceptance Criteria checklist (from AC)
  - Strict scope boundary rules (No extra features, mandatory task tracking).

### Layer 3: Prompt Template & Verification Gate Update
- Update `AI_AGENT_PROMPT_TEMPLATE` in `src/components/task/implementation-options.tsx`:
  - Enforce explicit verification step: Check implementation against AC before marking task `completed`.
  - Include instructions for using `novaplan export rules` or reading project rules.

## 3. Data Flow
1. User clicks "Prompt AI Agent" or runs `novaplan export rules <projectId>`.
2. AI Agent initializes with project rules in context.
3. AI Agent runs `novaplan task next <projectId>` → gets Task + Subtasks + Matched AC.
4. AI Agent implements task.
5. AI Agent verifies against AC → updates task status via `novaplan task update <taskId> --status completed`.

## 4. Testing & Verification
- Unit test CLI output formatting in `packages/cli`.
- API endpoint integration tests for task-next returning AC context.
