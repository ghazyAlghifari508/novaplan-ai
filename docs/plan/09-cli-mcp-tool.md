# PRD-09: CLI & MCP Tool Integration

## Problem
Kanban auto-update (PRD-08) needs a bridge between AI coding agent and NovaPlan. Without CLI/MCP, agent has no way to report task status or fetch project data. This is the critical integration that makes the pipeline autonomous.

## Scope
**In:** MCP server package (`@novaplan/mcp-server`) with 5 tools (get project data, update task/subtask status, list tasks, get kanban state), REST API v1 endpoints for all MCP operations, API key management in settings, API key auth middleware, CLI tool (`novaplan-cli`) with equivalent commands.

**Out:** OAuth/SSO for CLI, WebSocket real-time push, MCP registry listing, monorepo (separate repos if simpler).

---

## User Flows

### Flow: Setup API Key
1. User navigates to Settings → API Keys
2. Sees existing keys table (name, scopes, last used, created)
3. Clicks "Buat API Key Baru"
4. Modal: name input + scope checkboxes
5. Creates key → shows full key ONCE: "novaplan_xxxxx...xxxxx"
6. Toast: "Salin API key sekarang. Tidak akan ditampilkan lagi."
7. User copies key → pastes into AI agent config

### Flow: AI Agent Use (MCP)
1. AI agent config includes `@novaplan/mcp-server` with API key
2. MCP server connects to NovaPlan API
3. Agent calls `get_project_data(projectId)` → receives PRD + AC + tasks/sitemap
4. Agent implements a task → calls `update_task_status(taskId, "completed")`
5. NovaPlan updates DB → kanban polls and reflects change

### Flow: AI Agent Use (CLI)
1. Agent runs: `novaplan task list --project <id>`
2. Returns formatted task list
3. Agent completes subtask: `novaplan task update <id> --status completed`
4. Same DB update as MCP

### Negative Flow A: Invalid API Key
1. MCP/CLI uses expired/invalid key
2. API returns 401
3. MCP tool returns error: "API key tidak valid. Buat API key baru di Settings."
4. CLI prints error to stderr with red text

### Negative Flow B: API Key Expired
1. Key has `expires_at` in the past
2. 401 response with `{ error: "API key expired" }`
3. User must create new key in settings

### Negative Flow C: Rate Limited
1. Agent calls API 31 times in a minute (limit 30/min)
2. 429 response with `Retry-After` header
3. MCP client should respect Retry-After and backoff

---

## API Spec (REST v1)

### Base URL: `/api/v1`

### GET /api/v1/projects/:projectId
```typescript
// HEADERS: Authorization: Bearer <api_key>
// RESPONSE 200
{
  id: string;
  name: string;
  prd: {
    content: string;         // Latest PRD markdown
    version: number;
  };
  ac?: {
    content: AcFeature[];    // Structured AC
    version: number;
  };
  features: Feature[];
  tasks: Task[];
  subtasks: Subtask[];
  sitemap?: SitemapPage[];
}
// RESPONSE 401: { error: "Unauthorized" }
// RESPONSE 404: { error: "Project not found" }
```

### POST /api/v1/tasks/:taskId/status
```typescript
// HEADERS: Authorization: Bearer <api_key>
// BODY: { status: "in_progress" | "completed" | "failed", message?: string }
// RESPONSE 200: { id: string, status: string, updatedAt: string }
// RESPONSE 400: { error: "Invalid status" }
// RESPONSE 401: { error: "Unauthorized" }
// RESPONSE 404: { error: "Task not found" }
```

### POST /api/v1/subtasks/:subtaskId/status
```typescript
// Same contract as tasks
```

### GET /api/v1/projects/:projectId/tasks
```typescript
// RESPONSE 200
{
  tasks: Array<{
    id: string;
    name: string;
    status: string;
    featureName: string;
    dependencies: string[];
    subtasks: Array<{
      id: string;
      name: string;
      status: string;
    }>;
  }>;
}
```

### GET /api/v1/projects/:projectId/kanban
```typescript
// Same response as GET /api/kanban/[projectId] (PRD-08)
```

### Rate Limiting
- 30 requests/minute per API key
- 100 requests/minute per project
- Headers: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## MCP Server Design

```typescript
// @novaplan/mcp-server — package.json
{
  name: "@novaplan/mcp-server",
  version: "1.0.0",
  bin: { "novaplan-mcp": "dist/index.js" }
}

// MCP Tools:
const MCP_TOOLS = [
  {
    name: "get_project_data",
    description: "Get full project data including PRD, AC, features, tasks, sitemap",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string", description: "Project UUID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "update_task_status",
    description: "Update task status (pending/in_progress/completed/failed)",
    inputSchema: {
      type: "object",
      properties: {
        taskId: { type: "string" },
        status: { type: "string", enum: ["in_progress", "completed", "failed"] },
        message: { type: "string" }
      },
      required: ["taskId", "status"]
    }
  },
  {
    name: "update_subtask_status",
    description: "Update subtask status",
    inputSchema: { /* same pattern */ }
  },
  {
    name: "list_tasks",
    description: "List all tasks for a project, optionally filtered by status",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "failed"] }
      },
      required: ["projectId"]
    }
  },
  {
    name: "get_kanban_state",
    description: "Get current kanban state for a project",
    inputSchema: {
      type: "object",
      properties: {
        projectId: { type: "string" }
      },
      required: ["projectId"]
    }
  }
];
```

### MCP Server Config for Claude Code
```json
{
  "mcpServers": {
    "novaplan": {
      "command": "npx",
      "args": ["@novaplan/mcp-server"],
      "env": {
        "NOVAPLAN_API_KEY": "<your-api-key>",
        "NOVAPLAN_API_URL": "https://novaplan.vercel.app"
      }
    }
  }
}
```

---

## CLI Design

```bash
# novaplan-cli — package.json: { "bin": { "novaplan": "dist/cli.js" } }

novaplan login [--api-key <key>]    # Save API key to ~/.novaplan/config
novaplan project get <id>            # Print project data as JSON/Markdown
novaplan task list <projectId>        # List tasks with status
novaplan task update <taskId> --status <status>  # Update task
novaplan subtask update <subtaskId> --status <status>
novaplan kanban <projectId>           # Show kanban table

# Global flags:
# --format json|table (default: table)
# --project <id> (for scoped commands)
```

---

## Settings UI (API Keys)

### Page: `/settings/api-keys`
```
┌──────────────────────────────────────┐
│  Settings → API Keys                 │
│                                      │
│  [Buat API Key Baru]                 │
│                                      │
│  Key Name      │ Scopes    │ Last Used │ Created    │ Actions │
│  ──────────────────────────────────────────────────────────── │
│  Claude Code   │ read,write │ 2m ago   │ 2026-07-20 │ [Revoke]│
│  Cursor Agent  │ read       │ Never    │ 2026-07-19 │ [Revoke]│
│                                      │
│  Note: API keys are only shown once  │
│  at creation. Store securely.        │
└──────────────────────────────────────┘
```

### Create Key Modal
```
┌──────────────────────────────┐
│  Buat API Key Baru           │
│                              │
│  Nama: [Claude Code        ] │
│                              │
│  Scope:                      │
│  [✓] Read project data      │
│  [✓] Update task status     │
│  [ ] Write (full access)    │
│                              │
│  Expiry: [Never ▼]          │
│                              │
│      [Batal] [Buat Key]     │
└──────────────────────────────┘
```

---

## DB Schema (api_keys)

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(10) NOT NULL,  -- First 10 chars of raw key for display
  scopes JSONB DEFAULT '["read:project", "write:task:status"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_api_keys_user ON api_keys(user_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
```

Key format: `novaplan_<random-64-char-hex>` (hash stored, raw key shown once)

---

## Auth Middleware for API v1

```typescript
// src/middleware.ts — add API key check for /api/v1/*
// Pattern: extract Bearer token → look up by hash → validate expiry → set user context

async function apiKeyAuth(request: Request): Promise<{ userId: string } | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  
  const rawKey = authHeader.slice(7);
  const keyHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawKey))
    .then(h => Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join(''));
  
  const { data: apiKey, error } = await insforge.from('api_keys')
    .select('*, user_id')
    .eq('key_hash', keyHash)
    .single();
  
  if (error || !apiKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
    return new Response(JSON.stringify({ error: 'API key expired' }), { status: 401 });
  }
  
  // Update last_used_at
  await insforge.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', apiKey.id);
  
  return { userId: apiKey.user_id };
}
```

---

## Files Affected

| File | Action | Reason |
|------|--------|--------|
| `src/app/api/v1/...` directory | **CREATE** | API v1 routes |
| `src/app/api/v1/projects/[id]/route.ts` | **CREATE** | GET project data |
| `src/app/api/v1/tasks/[id]/status/route.ts` | **CREATE** | UPDATE task status |
| `src/app/api/v1/subtasks/[id]/status/route.ts` | **CREATE** | UPDATE subtask status |
| `src/app/api/v1/kanban/[pid]/route.ts` | **CREATE** | GET kanban |
| `src/lib/api-key-auth.ts` | **CREATE** | API key middleware |
| `src/app/settings/api-keys/page.tsx` | **CREATE** | API key management page |
| `src/components/settings/api-keys-form.tsx` | **CREATE** | API key creation form |
| `src/middleware.ts` | Modify | Route /api/v1/* through apiKeyAuth |
| `migrations/..._add_api_keys.sql` | **CREATE** | DB migration |
| `packages/mcp-server/package.json` | **CREATE** | MCP server package |
| `packages/mcp-server/src/index.ts` | **CREATE** | MCP server implementation |
| `packages/cli/package.json` | **CREATE** | CLI package |
| `packages/cli/src/index.ts` | **CREATE** | CLI implementation |

---

## Edge Cases
- [ ] Multiple API keys for same user → all valid simultaneously, scoped independently
- [ ] Key revocation → delete from DB → subsequent requests 401
- [ ] User deletes account → CASCADE deletes all API keys
- [ ] Rate limit exceeded → 429 with Retry-After header
- [x] Project deleted but MCP still has reference → 404 error returned
- [x] MCP tool called with project user doesn't own → 401 (RLS blocks)

## Security (CRITICAL)
- Keys stored as SHA-256 hash (never plaintext)
- Rate limiting per key + per IP
- Scoped access (read-only keys can't update tasks)
- CORS restricted to API origins
- All API v1 responses include security headers (existing middleware)
- Key entropy: 64 hex chars = 256 bits

## Dependencies
- PRD-08 (kanban needs status updates)
- PRD-05 (task structure defined)
- PRD-10 (DB migration)
- PRD-03 (settings layout for API key page)

## Effort Estimate
- New files: 15+ (including package directories)
- Complexity: Medium-High (auth design, npm packaging, external testing)
