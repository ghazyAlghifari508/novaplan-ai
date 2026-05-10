-- RLS Policies for NovaPlan
-- File: migrations/002_rls_policies.sql

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE prd_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Subscriptions
CREATE POLICY "subscriptions_select_own" ON subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Quotas
CREATE POLICY "quotas_select_own" ON quotas FOR SELECT USING (auth.uid() = user_id);

-- Projects
CREATE POLICY "projects_select_own" ON projects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON projects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "projects_update_own" ON projects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "projects_delete_own" ON projects FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "projects_select_shared" ON projects FOR SELECT USING (is_shared = true);

-- PRD Versions
CREATE POLICY "prd_versions_select_own" ON prd_versions FOR SELECT USING (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);
CREATE POLICY "prd_versions_insert_own" ON prd_versions FOR INSERT WITH CHECK (
  project_id IN (SELECT id FROM projects WHERE user_id = auth.uid())
);

-- Conversations
CREATE POLICY "conversations_select_own" ON conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "conversations_insert_own" ON conversations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE POLICY "messages_select_own" ON messages FOR SELECT USING (
  conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);
CREATE POLICY "messages_insert_own" ON messages FOR INSERT WITH CHECK (
  conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
);

-- Payments
CREATE POLICY "payments_select_own" ON payments FOR SELECT USING (auth.uid() = user_id);

-- Rate Limits
CREATE POLICY "rate_limits_select_own" ON rate_limits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "rate_limits_insert_own" ON rate_limits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "rate_limits_update_own" ON rate_limits FOR UPDATE USING (auth.uid() = user_id);