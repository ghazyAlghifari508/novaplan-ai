DROP POLICY IF EXISTS "subscriptions_insert_own" ON public.subscriptions;
CREATE POLICY "subscriptions_insert_own"
ON public.subscriptions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND status = 'active'
);

DROP POLICY IF EXISTS "quotas_insert_own" ON public.quotas;
CREATE POLICY "quotas_insert_own"
ON public.quotas
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND plan = 'free'
  AND prd_used = 0
  AND prd_limit = 3
  AND revision_used = 0
  AND revision_limit = 3
);
