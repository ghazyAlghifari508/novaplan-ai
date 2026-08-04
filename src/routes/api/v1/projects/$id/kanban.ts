import { createFileRoute } from "@tanstack/react-router";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, tasks } from "@/db/schema";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";

interface TaskCard {
  id: string;
  type: "task";
  featureName: string;
  name: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed" | "failed";
  subtaskCount: number;
  subtaskCompleted: number;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
  subtasks: Array<{ name: string; status: string }>;
}

export const Route = createFileRoute("/api/v1/projects/$id/kanban")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "read:project")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });

        const { id: projectId } = params;
        if (!(await verifyProjectOwnership(auth.userId, projectId))) return Response.json({ error: "Project not found" }, { status: 404 });

        const [taskRows, acRows] = await Promise.all([
          db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.order)),
          db.select({ createdAt: acVersions.createdAt }).from(acVersions).where(eq(acVersions.projectId, projectId)).orderBy(desc(acVersions.version)).limit(1),
        ]);

        const columns: Record<string, TaskCard[]> = { pending: [], in_progress: [], completed: [], failed: [] };
        for (const t of taskRows) {
          const sub = Array.isArray(t.subtasks) ? t.subtasks as Array<Record<string, unknown>> : [];
          const card: TaskCard = {
            id: t.id,
            type: "task",
            featureName: t.featureName || "Umum",
            name: t.title,
            description: t.description,
            status: (t.status ?? "pending") as TaskCard["status"],
            subtaskCount: sub.length,
            subtaskCompleted: sub.filter((s) => s.status === "completed").length,
            dependencies: Array.isArray(t.dependencies) ? (t.dependencies as string[]) : [],
            startedAt: t.startedAt ? (t.startedAt as Date).toISOString() : null,
            completedAt: t.completedAt ? (t.completedAt as Date).toISOString() : null,
            subtasks: sub.map((s) => ({ name: s.name as string, status: (s.status as string) ?? "pending" })),
          };
          (columns[card.status] ?? columns.pending).push(card);
        }

        const latestAcAt = acRows[0]?.createdAt ?? null;
        const tasksGeneratedAt = taskRows[0]?.createdAt ?? null;
        const acChanged = Boolean(latestAcAt && tasksGeneratedAt && new Date(latestAcAt) > new Date(tasksGeneratedAt));

        return Response.json({ columns, staleness: "live", lastUpdateAt: new Date().toISOString(), acChanged });
      },
    },
  },
});
