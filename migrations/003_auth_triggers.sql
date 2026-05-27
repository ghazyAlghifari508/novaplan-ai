-- Auth Trigger for NovaPlan
-- File: migrations/003_auth_triggers.sql

-- Function to handle new user signup
-- Conflict targets are safe here because this trigger only provisions first-time
-- signup rows; an existing row means the user was already provisioned.
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key
  ON public.subscriptions (user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  default_plan text := 'free';
  monthly_reset timestamptz;
BEGIN
  monthly_reset := date_trunc('month', now()) + interval '1 month';

  INSERT INTO public.users (id, email, full_name, avatar_url, provider, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    COALESCE(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture', ''),
    COALESCE(new.raw_app_meta_data ->> 'provider', 'email'),
    'user'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
  VALUES (new.id, default_plan, 'active', now(), monthly_reset)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.quotas (user_id, plan, prd_used, prd_limit, revision_used, revision_limit, reset_at)
  VALUES (new.id, default_plan, 0, 3, 0, 3, monthly_reset)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
