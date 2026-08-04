import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { requireUser } from "@/lib/session";

// ponytail: no DB CHECK constraint on projects.step (migration 0000), so valid
// values live here. "question" added so ask-options success can mark a project
// mid-question-stage server-side - drives History visibility without migration.
const ALLOWED_STEPS = new Set(["question", "prd", "ac", "task"]);

export const Route = createFileRoute("/api/projects/$id/step")({
  server: {
    handlers: {
      POST: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { id: projectId } = params;
        if (!projectId) return Response.json({ error: "Project ID is required" }, { status: 400 });

        const body = await request.json().catch(() => null);
        const step = body?.step;
        if (!step || !ALLOWED_STEPS.has(step)) return Response.json({ error: "Invalid step" }, { status: 400 });

        const updated = await db.update(projects).set({ step }).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).returning({ id: projects.id });
        if (!updated.length) return Response.json({ error: "Project not found" }, { status: 404 });
        return Response.json({ success: true, step });
      },
    },
  },
});
