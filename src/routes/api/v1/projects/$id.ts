import { createFileRoute } from "@tanstack/react-router";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, prdVersions, projects, tasks } from "@/db/schema";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getLatestAcContent } from "@/lib/services/ac-service";

export const Route = createFileRoute("/api/v1/projects/$id")({
  server: {
    handlers: {
      GET: async ({ params, request }: { params: { id: string }; request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "read:project")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });

        const { id: projectId } = params;
        if (!(await verifyProjectOwnership(auth.userId, projectId))) return Response.json({ error: "Project not found" }, { status: 404 });

        const [project, prdContent, acContent, taskRows, prdVer, acVer] = await Promise.all([
          db.select({ id: projects.id, name: projects.name, step: projects.step }).from(projects).where(eq(projects.id, projectId)).limit(1),
          getLatestPrdContent(projectId),
          getLatestAcContent(projectId),
          db.select().from(tasks).where(eq(tasks.projectId, projectId)).orderBy(asc(tasks.order)),
          db.select({ version: prdVersions.version }).from(prdVersions).where(eq(prdVersions.projectId, projectId)).orderBy(desc(prdVersions.version)).limit(1),
          db.select({ version: acVersions.version }).from(acVersions).where(eq(acVersions.projectId, projectId)).orderBy(desc(acVersions.version)).limit(1),
        ]);

        return Response.json({
          id: project[0]?.id,
          name: project[0]?.name,
          step: project[0]?.step,
          prd: prdContent ? { content: prdContent, version: prdVer[0]?.version ?? 1 } : null,
          ac: acContent ? { content: acContent, version: acVer[0]?.version ?? 1 } : null,
          tasks: taskRows,
          subtasks: [],
        });
      },
    },
  },
});
