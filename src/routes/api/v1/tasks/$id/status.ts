import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";

const VALID_STATUSES = ["in_progress", "completed", "failed"];

export const Route = createFileRoute("/api/v1/tasks/$id/status")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "write:task:status")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });

        const { id: taskId } = params;
        const body = await request.json();
        const { status } = body;
        if (!status || !VALID_STATUSES.includes(status)) return Response.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });

        const [task] = await db.select({ id: tasks.id, projectId: tasks.projectId }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
        if (!task || !(await verifyProjectOwnership(auth.userId, task.projectId))) return Response.json({ error: "Task not found" }, { status: 404 });

        await db.update(tasks).set({ status, updatedAt: new Date() }).where(eq(tasks.id, taskId));
        return Response.json({ id: taskId, status, message: body.message, updatedAt: new Date().toISOString() });
      },
    },
  },
});
