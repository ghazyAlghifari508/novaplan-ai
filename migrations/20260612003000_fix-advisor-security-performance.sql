-- Resolve InsForge Advisor security/performance findings for public app tables.

CREATE INDEX IF NOT EXISTS idx_conversations_project_id
ON public.conversations(project_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id
ON public.conversations(user_id);

CREATE INDEX IF NOT EXISTS idx_payments_subscription_id
ON public.payments(subscription_id);

CREATE INDEX IF NOT EXISTS idx_payments_user_id
ON public.payments(user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id
ON public.feedback(user_id);

CREATE INDEX IF NOT EXISTS idx_error_reports_user_id
ON public.error_reports(user_id);

CREATE OR REPLACE FUNCTION public.increment_prd_used(user_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF user_id_param IS NULL OR user_id_param <> (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  UPDATE public.quotas
  SET prd_used = COALESCE(prd_used, 0) + 1,
      updated_at = pg_catalog.now()
  WHERE user_id = user_id_param;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_prd_used(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_prd_used(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.increment_prd_used(uuid) TO authenticated;

DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
ON public.users
FOR SELECT
USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "users_insert_own" ON public.users;
CREATE POLICY "users_insert_own"
ON public.users
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
ON public.users
FOR UPDATE
USING ((SELECT auth.uid()) = id)
WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;
CREATE POLICY "subscriptions_select_own"
ON public.subscriptions
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own"
ON public.subscriptions
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND plan = 'free'
  AND status = 'active'
);

DROP POLICY IF EXISTS "quotas_select_own" ON public.quotas;
CREATE POLICY "quotas_select_own"
ON public.quotas
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "quotas_insert_own" ON public.quotas;
CREATE POLICY "quotas_insert_own"
ON public.quotas
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = user_id
  AND plan = 'free'
  AND prd_used = 0
  AND prd_limit = 3
  AND revision_used = 0
  AND revision_limit = 3
);

DROP POLICY IF EXISTS "quotas_update_own" ON public.quotas;
CREATE POLICY "quotas_update_own"
ON public.quotas
FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "projects_select_own" ON public.projects;
CREATE POLICY "projects_select_own"
ON public.projects
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "projects_insert_own" ON public.projects;
CREATE POLICY "projects_insert_own"
ON public.projects
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "projects_update_own" ON public.projects;
CREATE POLICY "projects_update_own"
ON public.projects
FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "projects_delete_own" ON public.projects;
CREATE POLICY "projects_delete_own"
ON public.projects
FOR DELETE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "projects_select_shared" ON public.projects;
CREATE POLICY "projects_select_shared"
ON public.projects
FOR SELECT
USING (is_shared = true);

DROP POLICY IF EXISTS "prd_versions_select_own" ON public.prd_versions;
CREATE POLICY "prd_versions_select_own"
ON public.prd_versions
FOR SELECT
USING (
  project_id IN (
    SELECT id
    FROM public.projects
    WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "prd_versions_insert_own" ON public.prd_versions;
CREATE POLICY "prd_versions_insert_own"
ON public.prd_versions
FOR INSERT
WITH CHECK (
  project_id IN (
    SELECT id
    FROM public.projects
    WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "conversations_select_own" ON public.conversations;
CREATE POLICY "conversations_select_own"
ON public.conversations
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_insert_own" ON public.conversations;
CREATE POLICY "conversations_insert_own"
ON public.conversations
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "conversations_delete_own" ON public.conversations;
CREATE POLICY "conversations_delete_own"
ON public.conversations
FOR DELETE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own"
ON public.messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
ON public.messages
FOR INSERT
WITH CHECK (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own"
ON public.messages
FOR DELETE
USING (
  conversation_id IN (
    SELECT id
    FROM public.conversations
    WHERE user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "payments_select_own" ON public.payments;
CREATE POLICY "payments_select_own"
ON public.payments
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rate_limits_select_own" ON public.rate_limits;
CREATE POLICY "rate_limits_select_own"
ON public.rate_limits
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rate_limits_insert_own" ON public.rate_limits;
CREATE POLICY "rate_limits_insert_own"
ON public.rate_limits
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "rate_limits_update_own" ON public.rate_limits;
CREATE POLICY "rate_limits_update_own"
ON public.rate_limits
FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_select_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_select_own"
ON public.notification_preferences
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_insert_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_insert_own"
ON public.notification_preferences
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "notification_preferences_update_own" ON public.notification_preferences;
CREATE POLICY "notification_preferences_update_own"
ON public.notification_preferences
FOR UPDATE
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "feedback_insert_authenticated" ON public.feedback;
CREATE POLICY "feedback_insert_authenticated"
ON public.feedback
FOR INSERT
WITH CHECK (((SELECT auth.uid()) = user_id) OR user_id IS NULL);

DROP POLICY IF EXISTS "error_reports_insert_authenticated" ON public.error_reports;
CREATE POLICY "error_reports_insert_authenticated"
ON public.error_reports
FOR INSERT
WITH CHECK (((SELECT auth.uid()) = user_id) OR user_id IS NULL);
