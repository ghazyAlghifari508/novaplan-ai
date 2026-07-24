-- NovaPlan VibeCoding Platform — new tables for AC, Tasks, Sitemap, Kanban, CLI/MCP
-- File: migrations/20260720120000_add_vibecoding_tables.sql
-- Follows the denormalized-owner RLS pattern from 20260612004000 (user_id on child
-- tables + trigger auto-populate + policy `(SELECT auth.uid()) = user_id`).

-- ============================================================
-- 0. Generic trigger: denormalize user_id from parent project
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_project_child_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT p.user_id INTO owner_id
  FROM public.projects AS p
  WHERE p.id = NEW.project_id
  FOR UPDATE;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'project not found or has no owner' USING ERRCODE = '23503';
  END IF;

  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_project_child_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_project_child_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_project_child_user_id() FROM authenticated;

-- ============================================================
-- 1. projects — add flow-step tracking columns
-- ============================================================
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS step VARCHAR(20) NOT NULL DEFAULT 'prd'
    CHECK (step IN ('prd', 'ac', 'task'))
    -- ponytail: sitemap is a sub-phase of 'prd', not a separate step.
    -- sitemap_status tracks its generation independently.
  ADD COLUMN IF NOT EXISTS ac_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (ac_status IN ('pending', 'generating', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS task_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (task_status IN ('pending', 'generating', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS sitemap_status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (sitemap_status IN ('pending', 'generating', 'completed', 'failed'));

-- ============================================================
-- 2. ac_versions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ac_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '[]',
  change_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, version)
);
CREATE INDEX IF NOT EXISTS idx_ac_versions_project ON public.ac_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_ac_versions_user ON public.ac_versions(user_id);

-- ============================================================
-- 3. features
-- ============================================================
CREATE TABLE IF NOT EXISTS public.features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_features_project ON public.features(project_id);
CREATE INDEX IF NOT EXISTS idx_features_user ON public.features(user_id);

-- ============================================================
-- 4. tasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature_id UUID REFERENCES public.features(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  dependencies JSONB NOT NULL DEFAULT '[]',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user ON public.tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_feature ON public.tasks(feature_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

-- ============================================================
-- 5. subtasks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subtasks_project ON public.subtasks(project_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_user ON public.subtasks(user_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_task ON public.subtasks(task_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_status ON public.subtasks(status);

-- ============================================================
-- 6. sitemap_pages
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sitemap_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.sitemap_pages(id) ON DELETE SET NULL,
  path VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  is_auth_required BOOLEAN NOT NULL DEFAULT FALSE,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sitemap_project ON public.sitemap_pages(project_id);
CREATE INDEX IF NOT EXISTS idx_sitemap_user ON public.sitemap_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_sitemap_parent_id ON public.sitemap_pages(parent_id);

-- ============================================================
-- 7. node_positions (whiteboard visual state, polymorphic node ref)
-- ============================================================
-- ponytail: node_id polymorphic — no FK; integrity tracked app-side.
-- Add per-node_type FK if orphan drift observed.
CREATE TABLE IF NOT EXISTS public.node_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  node_type VARCHAR(20) NOT NULL CHECK (node_type IN ('feature', 'task', 'subtask', 'sitemap')),
  node_id UUID NOT NULL,
  pos_x FLOAT NOT NULL DEFAULT 0,
  pos_y FLOAT NOT NULL DEFAULT 0,
  zoom_level FLOAT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, node_type, node_id)
);
-- ponytail: idx_node_positions_project dropped — UNIQUE(project_id, node_type, node_id)
-- leftmost prefix already covers WHERE project_id = ?.

-- ============================================================
-- 8. api_keys (direct child of users — no project denormalization)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(40) NOT NULL,
  scopes JSONB NOT NULL DEFAULT '["read:project", "write:task:status"]',
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON public.api_keys(user_id);
-- ponytail: idx_api_keys_hash removed — UNIQUE(key_hash) creates its own index.

-- ============================================================
-- 9. Triggers: auto-populate user_id on project-child tables
-- ============================================================
DROP TRIGGER IF EXISTS set_ac_versions_user_id ON public.ac_versions;
CREATE TRIGGER set_ac_versions_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.ac_versions
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

DROP TRIGGER IF EXISTS set_features_user_id ON public.features;
CREATE TRIGGER set_features_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.features
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

DROP TRIGGER IF EXISTS set_tasks_user_id ON public.tasks;
CREATE TRIGGER set_tasks_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

DROP TRIGGER IF EXISTS set_subtasks_user_id ON public.subtasks;
CREATE TRIGGER set_subtasks_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.subtasks
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

DROP TRIGGER IF EXISTS set_sitemap_pages_user_id ON public.sitemap_pages;
CREATE TRIGGER set_sitemap_pages_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.sitemap_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

DROP TRIGGER IF EXISTS set_node_positions_user_id ON public.node_positions;
CREATE TRIGGER set_node_positions_user_id
  BEFORE INSERT OR UPDATE OF user_id ON public.node_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_project_child_user_id();

-- ============================================================
-- 10. Enable RLS
-- ============================================================
ALTER TABLE public.ac_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sitemap_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. RLS Policies — direct owner check `(SELECT auth.uid()) = user_id`
-- ============================================================
-- ac_versions
DROP POLICY IF EXISTS "ac_versions_select_own" ON public.ac_versions;
CREATE POLICY "ac_versions_select_own" ON public.ac_versions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "ac_versions_insert_own" ON public.ac_versions;
CREATE POLICY "ac_versions_insert_own" ON public.ac_versions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "ac_versions_update_own" ON public.ac_versions;
CREATE POLICY "ac_versions_update_own" ON public.ac_versions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "ac_versions_delete_own" ON public.ac_versions;
CREATE POLICY "ac_versions_delete_own" ON public.ac_versions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- features
DROP POLICY IF EXISTS "features_select_own" ON public.features;
CREATE POLICY "features_select_own" ON public.features FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "features_insert_own" ON public.features;
CREATE POLICY "features_insert_own" ON public.features FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "features_update_own" ON public.features;
CREATE POLICY "features_update_own" ON public.features FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "features_delete_own" ON public.features;
CREATE POLICY "features_delete_own" ON public.features FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- tasks
DROP POLICY IF EXISTS "tasks_select_own" ON public.tasks;
CREATE POLICY "tasks_select_own" ON public.tasks FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_insert_own" ON public.tasks;
CREATE POLICY "tasks_insert_own" ON public.tasks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_update_own" ON public.tasks;
CREATE POLICY "tasks_update_own" ON public.tasks FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- subtasks
DROP POLICY IF EXISTS "subtasks_select_own" ON public.subtasks;
CREATE POLICY "subtasks_select_own" ON public.subtasks FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "subtasks_insert_own" ON public.subtasks;
CREATE POLICY "subtasks_insert_own" ON public.subtasks FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "subtasks_update_own" ON public.subtasks;
CREATE POLICY "subtasks_update_own" ON public.subtasks FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "subtasks_delete_own" ON public.subtasks;
CREATE POLICY "subtasks_delete_own" ON public.subtasks FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- sitemap_pages
DROP POLICY IF EXISTS "sitemap_pages_select_own" ON public.sitemap_pages;
CREATE POLICY "sitemap_pages_select_own" ON public.sitemap_pages FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "sitemap_pages_insert_own" ON public.sitemap_pages;
CREATE POLICY "sitemap_pages_insert_own" ON public.sitemap_pages FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "sitemap_pages_update_own" ON public.sitemap_pages;
CREATE POLICY "sitemap_pages_update_own" ON public.sitemap_pages FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "sitemap_pages_delete_own" ON public.sitemap_pages;
CREATE POLICY "sitemap_pages_delete_own" ON public.sitemap_pages FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- node_positions
DROP POLICY IF EXISTS "node_positions_select_own" ON public.node_positions;
CREATE POLICY "node_positions_select_own" ON public.node_positions FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "node_positions_insert_own" ON public.node_positions;
CREATE POLICY "node_positions_insert_own" ON public.node_positions FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "node_positions_update_own" ON public.node_positions;
CREATE POLICY "node_positions_update_own" ON public.node_positions FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "node_positions_delete_own" ON public.node_positions;
CREATE POLICY "node_positions_delete_own" ON public.node_positions FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- api_keys (direct user_id, no trigger)
DROP POLICY IF EXISTS "api_keys_select_own" ON public.api_keys;
CREATE POLICY "api_keys_select_own" ON public.api_keys FOR SELECT USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "api_keys_insert_own" ON public.api_keys;
CREATE POLICY "api_keys_insert_own" ON public.api_keys FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "api_keys_update_own" ON public.api_keys;
CREATE POLICY "api_keys_update_own" ON public.api_keys FOR UPDATE USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "api_keys_delete_own" ON public.api_keys;
CREATE POLICY "api_keys_delete_own" ON public.api_keys FOR DELETE USING ((SELECT auth.uid()) = user_id);
