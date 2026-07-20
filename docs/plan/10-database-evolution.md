# PRD-10: Database Schema Evolution

## Problem
6 new features need 7 new DB tables + modifications to `projects` table. All must follow existing InsForge/PostgreSQL patterns (UUID PKs, gen_random_uuid(), TIMESTAMPTZ, RLS per owner, raw SQL migrations in `migrations/`).

## Scope
**In:** 7 new tables, `projects` table modifications, RLS policies on all new tables, migration files ordered by dependency.

**Out:** Table partitioning, full-text search indexes, audit logging.

---

## Entity Relationship Diagram

```
users 1──* projects
projects 1──* prd_versions (existing)
projects 1──* ac_versions
projects 1──* features
projects 1──* sitemap_pages
features 1──* tasks
tasks 1──* subtasks
projects 1──* node_positions (polymorphic)
users 1──* api_keys

projects.step: prd → ac → task (state machine, no backward)
```

## State Machine

### projects.step
```
prd ──(completed)──→ ac ──(completed)──→ task
  ↑                    ↑                    ↑
  └──── current step ──┘                    │
       (null default)                       │
                                            └──── terminal state
                                            (task = features, tasks, sitemap done)
```

### tasks.status / subtasks.status
```
pending ──→ in_progress ──→ completed
              │
              └──→ failed
```

## Table Definitions

### 1. ac_versions
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK, DEFAULT gen_random_uuid() | |
| project_id | UUID | NOT NULL, FK→projects ON DELETE CASCADE | |
| version | INTEGER | NOT NULL DEFAULT 1 | Auto-increment per project |
| content | JSONB | NOT NULL DEFAULT '[]' | AcFeature[] |
| change_summary | TEXT | NULLABLE | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Index: `(project_id, version)` UNIQUE

### 2. features
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK→projects CASCADE | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULLABLE | |
| order | INTEGER | NOT NULL DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL | |

Index: `(project_id, "order")`

### 3. tasks
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK→projects CASCADE | Denormalized for RLS |
| feature_id | UUID | FK→features ON DELETE SET NULL | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULLABLE | |
| order | INTEGER | DEFAULT 0 | |
| status | VARCHAR(20) | NOT NULL DEFAULT 'pending' | CHECK: pending/in_progress/completed/failed |
| dependencies | JSONB | DEFAULT '[]' | Array of task ID strings |
| started_at | TIMESTAMPTZ | NULLABLE | Set when status→in_progress |
| completed_at | TIMESTAMPTZ | NULLABLE | Set when status→completed/failed |
| created_at | TIMESTAMPTZ | NOT NULL | |

Indexes: `(project_id)`, `(status)`, `(feature_id)`

### 4. subtasks
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK→projects CASCADE | Denormalized for RLS |
| task_id | UUID | FK→tasks ON DELETE CASCADE | |
| name | VARCHAR(255) | NOT NULL | |
| description | TEXT | NULLABLE | |
| order | INTEGER | DEFAULT 0 | |
| status | VARCHAR(20) | DEFAULT 'pending' | CHECK same as tasks |
| started_at | TIMESTAMPTZ | NULLABLE | |
| completed_at | TIMESTAMPTZ | NULLABLE | |
| created_at | TIMESTAMPTZ | NOT NULL | |

Indexes: `(task_id)`, `(status)`

### 5. node_positions
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK→projects CASCADE | |
| node_type | VARCHAR(20) | NOT NULL | CHECK: feature/task/subtask/sitemap |
| node_id | UUID | NOT NULL | Polymorphic — no FK |
| pos_x | FLOAT | NOT NULL DEFAULT 0 | |
| pos_y | FLOAT | NOT NULL DEFAULT 0 | |
| zoom_level | FLOAT | NOT NULL DEFAULT 1 | |
| created_at | TIMESTAMPTZ | NOT NULL | |

UNIQUE: `(project_id, node_type, node_id)`

### 6. sitemap_pages
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| project_id | UUID | FK→projects CASCADE | |
| parent_id | UUID | FK→sitemap_pages ON DELETE SET NULL | Self-referential |
| path | VARCHAR(255) | NOT NULL | e.g. "/dashboard" |
| name | VARCHAR(255) | NOT NULL | e.g. "Dashboard" |
| is_auth_required | BOOLEAN | NOT NULL DEFAULT false | |
| order | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL | |

Index: `(project_id)`

### 7. api_keys
| Column | Type | Constraints | Notes |
|--------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK→users ON DELETE CASCADE | |
| name | VARCHAR(100) | NOT NULL | Human label |
| key_hash | VARCHAR(255) | NOT NULL UNIQUE | SHA-256 hex |
| key_prefix | VARCHAR(10) | NOT NULL | First 10 chars for display |
| scopes | JSONB | DEFAULT '["read:project","write:task:status"]' | |
| last_used_at | TIMESTAMPTZ | NULLABLE | |
| expires_at | TIMESTAMPTZ | NULLABLE | NULL = no expiry |
| created_at | TIMESTAMPTZ | NOT NULL | |

Indexes: `(user_id)`, `(key_hash)`

---

## projects Table Modifications

```sql
ALTER TABLE projects ADD COLUMN step VARCHAR(20) NOT NULL DEFAULT 'prd'
  CHECK (step IN ('prd', 'ac', 'task'));
ALTER TABLE projects ADD COLUMN ac_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (ac_status IN ('pending', 'generating', 'completed'));
ALTER TABLE projects ADD COLUMN task_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (task_status IN ('pending', 'generating', 'completed'));
ALTER TABLE projects ADD COLUMN sitemap_status VARCHAR(20) NOT NULL DEFAULT 'pending'
  CHECK (sitemap_status IN ('pending', 'generating', 'completed'));
```

---

## RLS Policies

All new tables follow existing pattern:

```sql
-- Example for tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_owner_select ON tasks
  FOR SELECT USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY task_owner_insert ON tasks
  FOR INSERT WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY task_owner_update ON tasks
  FOR UPDATE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );

CREATE POLICY task_owner_delete ON tasks
  FOR DELETE USING (
    project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
  );
```

For `api_keys` table (direct user_id, no project_id):
```sql
CREATE POLICY apikey_owner ON api_keys
  FOR ALL USING (user_id = auth.uid());
```

---

## Migration Files

| # | File Name | Content | Depends On |
|---|-----------|---------|-----------|
| 1 | `YYYYMMDDHHMMSS_add_features_tasks_subtasks.sql` | features, tasks, subtasks + RLS | — |
| 2 | `YYYYMMDDHHMMSS_add_ac_versions.sql` | ac_versions + RLS | — |
| 3 | `YYYYMMDDHHMMSS_add_node_positions.sql` | node_positions + RLS | — |
| 4 | `YYYYMMDDHHMMSS_add_sitemap_pages.sql` | sitemap_pages + RLS | — |
| 5 | `YYYYMMDDHHMMSS_add_api_keys.sql` | api_keys + RLS | — |
| 6 | `YYYYMMDDHHMMSS_add_project_step_columns.sql` | projects step/ac_status/task_status/sitemap_status | — |

All migrations are independent (no cross-references). Apply in any order.

---

## Edge Cases / Design Decisions
1. `tasks.project_id` is denormalized — needed for efficient RLS queries (avoid subquery through features + projects)
2. `node_positions` uses polymorphic `(node_type, node_id)` — loses FK constraint but avoids 4 nullable columns (feature_id/task_id/subtask_id/sitemap_id)
3. `api_keys.key_hash` is SHA-256 hex — PostgreSQL does not have built-in crypto for migrations, hash application-side
4. `projects.step` is a simple VARCHAR with CHECK, not ENUM — ENUMs are harder to alter later
5. No CASCADE between sitemap_pages.parent_id — SET NULL on parent delete (page becomes root)

---

## Files Affected

| File | Action |
|------|--------|
| `migrations/YYYYMMDDHHMMSS_add_features_tasks_subtasks.sql` | **CREATE** |
| `migrations/YYYYMMDDHHMMSS_add_ac_versions.sql` | **CREATE** |
| `migrations/YYYYMMDDHHMMSS_add_node_positions.sql` | **CREATE** |
| `migrations/YYYYMMDDHHMMSS_add_sitemap_pages.sql` | **CREATE** |
| `migrations/YYYYMMDDHHMMSS_add_api_keys.sql` | **CREATE** |
| `migrations/YYYYMMDDHHMMSS_add_project_step_columns.sql` | **CREATE** |
| `src/types/database.ts` | Modify — add new TypeScript types |

---

## New TypeScript Types (src/types/database.ts)

```typescript
export type StepStatus = 'pending' | 'generating' | 'completed';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface AcVersion {
  id: string;
  project_id: string;
  version: number;
  content: AcFeature[];
  change_summary: string | null;
  created_at: string;
}

export interface AcFeature {
  featureName: string;
  criteria: string[];
}

export interface Feature {
  id: string;
  project_id: string;
  name: string;
  description: string | null;
  order: number;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  feature_id: string | null;
  name: string;
  description: string | null;
  order: number;
  status: TaskStatus;
  dependencies: string[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Subtask {
  id: string;
  project_id: string;
  task_id: string;
  name: string;
  description: string | null;
  order: number;
  status: TaskStatus;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface NodePosition {
  id: string;
  project_id: string;
  node_type: 'feature' | 'task' | 'subtask' | 'sitemap';
  node_id: string;
  pos_x: number;
  pos_y: number;
  zoom_level: number;
}

export interface SitemapPage {
  id: string;
  project_id: string;
  parent_id: string | null;
  path: string;
  name: string;
  is_auth_required: boolean;
  order: number;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

// Update Project type
export interface Project {
  // ... existing fields ...
  step: 'prd' | 'ac' | 'task';
  ac_status: StepStatus;
  task_status: StepStatus;
  sitemap_status: StepStatus;
}
```

---

## Dependencies
- Blocks all other PRDs that need new tables (PRD-04 through PRD-09)

## Effort Estimate
- New files: 6 migrations + 1 types update
- Complexity: Low (standard SQL, well-understood pattern)
