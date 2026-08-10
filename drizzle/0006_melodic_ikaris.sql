CREATE INDEX "ac_versions_project_id_version_idx" ON "ac_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_user_id_idx" ON "conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "conversations_project_id_created_at_idx" ON "conversations" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "error_reports_user_id_idx" ON "error_reports" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "feedback_user_id_idx" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "payments_user_id_idx" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prd_versions_project_id_version_idx" ON "prd_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "quotas_user_id_idx" ON "quotas" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "rate_limits_user_id_action_idx" ON "rate_limits" USING btree ("user_id","action");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_user_id_created_at_idx" ON "subscriptions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "tasks_project_id_order_idx" ON "tasks" USING btree ("project_id","order");