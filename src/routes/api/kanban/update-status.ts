import { createFileRoute } from "@tanstack/react-router";
import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys, projects, tasks } from "@/db/schema";

const VALID_STATUSES = new Set(["pending", "in_progress", "completed", "failed"]);

export const Route = createFileRoute("/api/kanban/update-status")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const authHeader = request.headers.get("Authorization");
        let apiKey = authHeader?.startsWith("Bearer ") ? authHeader.substring(7).trim() : "";

        const body = await request.json().catch(() => null);
        if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        if (!apiKey && body.apiKey) apiKey = body.apiKey;
        if (!apiKey) return Response.json({ error: "API Key required" }, { status: 401 });

        const hashedKey = createHash("sha256").update(apiKey).digest("hex");
        const [keyRecord] = await db.select({ id: apiKeys.id, userId: apiKeys.userId, scopes: apiKeys.scopes, expiresAt: apiKeys.expiresAt }).from(apiKeys).where(eq(apiKeys.key, hashedKey)).limit(1);
        if (!keyRecord) return Response.json({ error: "Invalid API Key" }, { status: 401 });
        if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) return Response.json({ error: "API Key expired" }, { status: 401 });

        const scopes = keyRecord.scopes ?? [];
        if (!scopes.includes("write:task:status") && !scopes.includes("admin") && !scopes.includes("*")) {
          return Response.json({ error: "Insufficient scopes for this action" }, { status: 403 });
        }

        const { projectId, taskId, status } = body;
        if (!projectId || !taskId || !status) return Response.json({ error: "Missing required fields (projectId, taskId, status)" }, { status: 400 });
        if (!VALID_STATUSES.has(status)) return Response.json({ error: "Invalid status value" }, { status: 400 });

        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, keyRecord.userId))).limit(1);
        if (!project) return Response.json({ error: "Project not found or access denied" }, { status: 404 });

        const updated = await db.update(tasks).set({ status, updatedAt: new Date() }).where(and(eq(tasks.id, taskId), eq(tasks.projectId, projectId))).returning({ id: tasks.id });
        if (!updated.length) return Response.json({ error: "task not found in this project" }, { status: 404 });

        db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, keyRecord.id)).catch(() => {});
        return Response.json({ success: true, taskId, status });
      },
    },
  },
});
