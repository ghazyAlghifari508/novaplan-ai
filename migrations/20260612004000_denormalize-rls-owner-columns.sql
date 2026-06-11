-- Denormalize owner IDs for child-table RLS so Advisor can validate direct owner indexes.

ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.prd_versions
ADD COLUMN IF NOT EXISTS user_id uuid;

UPDATE public.messages AS m
SET user_id = c.user_id
FROM public.conversations AS c
WHERE m.conversation_id = c.id
  AND m.user_id IS NULL;

UPDATE public.prd_versions AS v
SET user_id = p.user_id
FROM public.projects AS p
WHERE v.project_id = p.id
  AND v.user_id IS NULL;

CREATE OR REPLACE FUNCTION public.set_message_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT c.user_id
  INTO owner_id
  FROM public.conversations AS c
  WHERE c.id = NEW.conversation_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'conversation owner not found' USING ERRCODE = '23503';
  END IF;

  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_prd_version_user_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, pg_temp
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT p.user_id
  INTO owner_id
  FROM public.projects AS p
  WHERE p.id = NEW.project_id;

  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'project owner not found' USING ERRCODE = '23503';
  END IF;

  NEW.user_id := owner_id;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_message_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_message_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_message_user_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_prd_version_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_prd_version_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_prd_version_user_id() FROM authenticated;

DROP TRIGGER IF EXISTS set_message_user_id ON public.messages;
CREATE TRIGGER set_message_user_id
BEFORE INSERT OR UPDATE OF conversation_id, user_id
ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_message_user_id();

DROP TRIGGER IF EXISTS set_prd_version_user_id ON public.prd_versions;
CREATE TRIGGER set_prd_version_user_id
BEFORE INSERT OR UPDATE OF project_id, user_id
ON public.prd_versions
FOR EACH ROW
EXECUTE FUNCTION public.set_prd_version_user_id();

ALTER TABLE public.messages
ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE public.prd_versions
ALTER COLUMN user_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'messages_user_id_fkey'
      AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
    ADD CONSTRAINT messages_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'prd_versions_user_id_fkey'
      AND conrelid = 'public.prd_versions'::regclass
  ) THEN
    ALTER TABLE public.prd_versions
    ADD CONSTRAINT prd_versions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_user_id
ON public.messages(user_id);

CREATE INDEX IF NOT EXISTS idx_prd_versions_user_id
ON public.prd_versions(user_id);

DROP POLICY IF EXISTS "messages_select_own" ON public.messages;
CREATE POLICY "messages_select_own"
ON public.messages
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "messages_insert_own" ON public.messages;
CREATE POLICY "messages_insert_own"
ON public.messages
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "messages_delete_own" ON public.messages;
CREATE POLICY "messages_delete_own"
ON public.messages
FOR DELETE
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "prd_versions_select_own" ON public.prd_versions;
CREATE POLICY "prd_versions_select_own"
ON public.prd_versions
FOR SELECT
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "prd_versions_insert_own" ON public.prd_versions;
CREATE POLICY "prd_versions_insert_own"
ON public.prd_versions
FOR INSERT
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "payments_insert_denied" ON public.payments;
CREATE POLICY "payments_insert_denied"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "payments_update_denied" ON public.payments;
CREATE POLICY "payments_update_denied"
ON public.payments
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "payments_delete_denied" ON public.payments;
CREATE POLICY "payments_delete_denied"
ON public.payments
FOR DELETE
TO authenticated
USING (false);
