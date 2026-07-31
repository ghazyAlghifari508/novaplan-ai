import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";

export const Route = createFileRoute("/api/v1/projects/$id/tasks")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "read:project")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });

        const { id: projectId } = params;
        if (!(await verifyProjectOwnership(auth.userId, projectId))) return Response.json({ error: "Project not found" }, { status: 404 });

        const url = new URL(request.url);
        const statusFilter = url.searchParams.get("status");
        const rows = await db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.order));
        const filtered = statusFilter ? rows.filter((t) => t.status === statusFilter) : rows;

        return Response.json({
          tasks: filtered.map((t) => ({
            id: t.id,
            name: t.title,
            status: t.status,
            featureName: "Umum",
            dependencies: Array.isArray(t.dependencies) ? (t.dependencies as string[]) : [],
            subtasks: Array.isArray(t.subtasks) ? (t.subtasks as Array<{ name: string; description: string }>) : [],
          })),
        });
      },
    },
  },
});
