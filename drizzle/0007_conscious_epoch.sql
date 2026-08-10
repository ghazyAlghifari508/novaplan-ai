DROP INDEX "ac_versions_project_id_version_idx";--> statement-breakpoint
DROP INDEX "prd_versions_project_id_version_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "ac_versions_project_id_version_idx" ON "ac_versions" USING btree ("project_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "prd_versions_project_id_version_idx" ON "prd_versions" USING btree ("project_id","version");