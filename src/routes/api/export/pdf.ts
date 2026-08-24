import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { generatePdfBuffer } from "@/lib/services/export-pdf";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/export/pdf")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireUser(getRequestHeaders());
        const { projectId } = (await request.json()) as { projectId: string };
        if (!projectId)
          return Response.json(
            { error: "Project ID required" },
            { status: 400 },
          );
        const [proj] = await db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
          .limit(1);
        if (!proj)
          return Response.json({ error: "Not found" }, { status: 404 });
        const content = await getLatestPrdContent(projectId);
        if (!content)
          return Response.json({ error: "No PRD" }, { status: 404 });
        const buf = await generatePdfBuffer({
          content,
          projectName: proj.name,
        });
        return new Response(buf as never, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${proj.name}-prd.pdf"`,
          },
        });
      },
    },
  },
});
