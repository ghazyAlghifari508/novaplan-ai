import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, projects, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";

interface TaskCard {
  id: string;
  type: "task";
  featureName: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  subtaskCount: number;
  subtaskCompleted: number;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
  subtasks: Array<{ id: string; name: string; status: string }>;
}

export const Route = createFileRoute("/api/kanban/$pid")({
  server: {
    handlers: {
      GET: async ({ params }: { params: { pid: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { pid: projectId } = params;

        const [project] = await db.select({ id: projects.id, name: projects.name, step: projects.step, taskStatus: projects.taskStatus }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
        if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

        const [taskRows, acRows] = await Promise.all([
          db.select({ id: tasks.id, title: tasks.title, description: tasks.description, status: tasks.status, featureName: tasks.featureName, dependencies: tasks.dependencies, subtasks: tasks.subtasks, startedAt: tasks.startedAt, completedAt: tasks.completedAt, createdAt: tasks.createdAt }).from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.order)),
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
            description: t.description ?? "",
            status: (t.status ?? "pending") as TaskCard["status"],
            subtaskCount: sub.length,
            subtaskCompleted: sub.filter((s) => s.status === "completed").length,
            dependencies: Array.isArray(t.dependencies) ? (t.dependencies as string[]) : [],
            startedAt: t.startedAt ? (t.startedAt as Date).toISOString() : null,
            completedAt: t.completedAt ? (t.completedAt as Date).toISOString() : null,
            subtasks: sub.map((s) => ({ id: "", name: s.name as string, status: (s.status as string) ?? "pending" })),
          };
          (columns[card.status] ?? columns.pending).push(card);
        }

        const latestAcAt = acRows[0]?.createdAt ?? null;
        const tasksGeneratedAt = taskRows[0]?.createdAt ?? null;
        const acChanged = Boolean(latestAcAt && tasksGeneratedAt && new Date(latestAcAt) > new Date(tasksGeneratedAt));

        return Response.json({ columns, staleness: "live", lastUpdateAt: new Date().toISOString(), acChanged, taskStatus: project.taskStatus });
      },
    },
  },
});
