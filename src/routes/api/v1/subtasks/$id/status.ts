import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";

const VALID_STATUSES = ["pending", "in_progress", "completed", "failed"];

export const Route = createFileRoute("/api/v1/subtasks/$id/status")({
  server: {
    handlers: {
      POST: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "write:subtask:status")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });

        const taskId = params.id;
        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const { subtaskIndex, status } = body as { subtaskIndex?: number; status?: string };

        if (typeof subtaskIndex !== "number" || subtaskIndex < 0)
          return Response.json({ error: "subtaskIndex must be a non-negative integer" }, { status: 400 });
        if (!status || !VALID_STATUSES.includes(status))
          return Response.json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });

        const [task] = await db
          .select({ id: tasks.id, projectId: tasks.projectId, subtasks: tasks.subtasks })
          .from(tasks)
          .where(eq(tasks.id, taskId))
          .limit(1);
        if (!task || !(await verifyProjectOwnership(auth.userId, task.projectId)))
          return Response.json({ error: "Task not found" }, { status: 404 });

        const subs = Array.isArray(task.subtasks) ? [...(task.subtasks as Record<string, unknown>[])] : [];
        if (subtaskIndex >= subs.length)
          return Response.json({ error: `subtaskIndex ${subtaskIndex} out of range (0-${subs.length - 1})` }, { status: 400 });

        subs[subtaskIndex] = { ...subs[subtaskIndex], status };
        await db.update(tasks).set({ subtasks: subs, updatedAt: new Date() }).where(eq(tasks.id, taskId));

        return Response.json({ taskId, subtaskIndex, status });
      },
    },
  },
});
