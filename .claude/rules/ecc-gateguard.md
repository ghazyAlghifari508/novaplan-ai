# ECC GateGuard Compliance Rules

## What GateGuard Is

GateGuard is an automated pre-action safety gate in the ECC harness. It forces the AI agent to present verified facts before performing any potentially destructive or modifying action, including file edits, file writes, and certain bash commands.

Purpose: eliminate hallucination-driven changes, ensure every modification is grounded in actual codebase evidence, and improve accuracy of all agent outputs.

## Core Principle

GateGuard is NOT an obstacle. It is an analysis-forcing mechanism. Every prompt it requires you to answer is a question you should have asked yourself anyway. If GateGuard blocks you, it means your analysis is incomplete. Skipping the gate skips the analysis step — which is the primary source of hallucinations and broken edits.

## Rules

### 1. NEVER Bypass GateGuard

The following actions are strictly prohibited:

- Setting `ECC_GATEGUARD=off` to disable the gate globally.
- Adding `pre:edit-write:gateguard-fact-force` or `pre:bash:gateguard-fact-force` to `ECC_DISABLED_HOOKS` to selectively disable the gate.
- Using shell scripts, Python one-liners, `sed`, `awk`, `PowerShell`, or any alternative tool to perform the same blocked operation without completing the GateGuard analysis first.
- Retrying the exact same blocked action without providing new, verified facts.
- Calling the Write or Edit tool on a different file to work around a GateGuard block on the target file, when the intent is to achieve the same blocked change indirectly.
- Using environment variables, shell flags, or runtime toggles to suppress GateGuard checks.

If GateGuard blocks you, it is a signal that you have not verified enough context to safely proceed. Complete the analysis.

### 2. Always Provide Complete Facts

When GateGuard presents a fact-forcing prompt, you MUST provide ALL requested information before retrying the action. Incomplete answers will result in repeated blocks.

#### For File Edits (Edit/Write tools)

When GateGuard blocks a file edit or write, provide:

1. **Importers and callers.** Use `Grep` to find every file that imports or requires the target file. Do NOT guess from memory. Do NOT assume only one importer. Search for:
   - `import ... from 'path/to/file'`
   - `require('path/to/file')`
   - Re-exports from barrel files (`index.ts` that re-exports from the target)
   - Dynamic imports if applicable

2. **Public functions and classes affected.** List every exported function, class, type, or constant that the change modifies or touches. State the current signature and what the change does to it.

3. **Data schemas and structures.** If the file reads from or writes to a database, API, or data file:
   - Show the field names and their types
   - Show the structure (object shape, table schema, etc.)
   - Use redacted or synthetic values — never paste raw production data
   - State the date format if any date fields exist

4. **User verbatim instruction.** Quote the user's exact words that triggered this change. Do NOT paraphrase. Do NOT summarize. Copy the user's message exactly as they wrote it.

5. **Change summary.** In one sentence, describe what the edit does and why it is safe.

#### For Bash Commands

When GateGuard blocks a bash command, provide:

1. **User request.** State what the user asked for in one sentence.
2. **Command purpose.** State what this specific command verifies, produces, or modifies.
3. **Side effects.** If the command creates, deletes, or modifies files, list them.
4. **Reversibility.** State whether the command is reversible and how.

### 3. Verify Before Answering

Do NOT guess or hallucinate answers to GateGuard prompts. Use tools to verify every claim:

| Claim Type | Verification Tool | Example |
|---|---|---|
| "File X imports file Y" | `Grep` for import statements | `Grep pattern="from.*file-y" path="src/"` |
| "Function Z is exported" | `Read` the target file | `Read file_path="src/lib/file.ts"` |
| "File exists at path P" | `Glob` for the file | `Glob pattern="src/lib/file.ts"` |
| "No other file depends on this" | `Grep` for references | `Grep pattern="from.*this-file" path="src/"` |
| "This change is UI-only" | `Read` the file, check for data logic | Verify no DB queries, API calls, or state mutations beyond UI |

If you are genuinely uncertain about a fact after attempting verification, state the uncertainty explicitly. GateGuard will allow you to proceed with acknowledged uncertainty — it will NOT allow you to proceed with unverified claims.

### 4. Treat GateGuard Blocks as Signals

When GateGuard blocks an action, interpret it as one of the following:

- "You have not verified enough context to safely make this change."
- "Your understanding of the impact area may be incomplete."
- "You are about to modify something — are you sure you know what depends on it?"
- "Your facts may be hallucinated — verify them with tools."

Use the block as an opportunity to do more exploration. Read the file. Grep for callers. Check the imports. Then retry with verified facts.

### 5. Never Modify GateGuard Configuration

Do NOT modify the following unless the user explicitly asks you to:

- `.claude/rules/ecc-gateguard.md` (this file)
- Any ECC hook configuration in `settings.json` related to GateGuard
- Any environment variable that controls GateGuard behavior

These rules exist to protect the user's codebase from hallucination-driven changes. Modifying them without explicit user instruction is a violation of trust.

### 6. GateGuard Applies to All Tools Equally

GateGuard is not limited to the Edit tool. It applies to any action that modifies the codebase:

- `Edit` — file edits
- `Write` — file creation/overwrite
- `Bash` — commands that modify files (`rm`, `mv`, `sed`, `git commit`, etc.)
- `NotebookEdit` — Jupyter notebook cell modifications

Do NOT assume that switching to a different tool bypasses the gate. If the same logical action is blocked by GateGuard on one tool, it is blocked on all tools for the same reason.

### 7. Speed Is Not an Excuse

GateGuard adds a small verification step before destructive actions. This step:

- Takes 10-30 seconds of tool calls (Grep, Read, Glob)
- Prevents minutes or hours of debugging broken edits
- Prevents hallucinated changes from reaching the codebase
- Ensures the user's codebase remains stable

Never sacrifice verification for speed. The user values correctness over velocity.

## Common Anti-Patterns

| Anti-Pattern | Why It Is Wrong | Correct Behavior |
|---|---|---|
| `ECC_GATEGUARD=off` | Disables safety net entirely | Complete the GateGuard prompt |
| Retrying blocked edit with same facts | Facts were incomplete — re-verify | Use Grep/Read to get new facts |
| Using `sed` to bypass Edit gate | Same risk, different tool | Complete GateGuard analysis first |
| Saying "I already know this file" | Memory is unreliable | Verify with Grep/Read |
| Rushing through GateGuard prompts | Incomplete answers cause re-blocks | Take time to verify each fact |
| Editing a different file to work around the block | Same logical change, different target | Complete analysis for original target |
| Claiming "no importers" without searching | May be wrong — files can import indirectly | Use `Grep` to search for all import patterns |
| Claiming "UI-only change" without reading the file | File may contain data logic | Read the file first, then claim |

## GateGuard Prompt Templates

When GateGuard blocks an action, it presents one of these templates. Use them as checklists for your response.

### Template: File Edit/Write

```
Before editing [FILE], present these facts:

1. List ALL files that import/require this file (use Grep)
2. List the public functions/classes affected by this change
3. If this file reads/writes data files, show field names, structure, and date format
4. Quote the user's current instruction verbatim

Present the facts, then retry the same operation.
```

### Template: Bash Command

```
Before the first Bash command this session, present these facts:

1. The current user request in one sentence
2. What this specific command verifies or produces

Present the facts, then retry the same operation.
```

## Summary

GateGuard = forced analysis step before destructive actions. Respect it. Verify facts with tools. Do not hallucinate. Do not bypass. The 30 seconds you spend verifying saves the user from broken code.
