import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";

export const Route = createFileRoute("/api/export/pdf")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const { db } = await import("@/db");
        const { projects } = await import("@/db/schema");
        const { getLatestPrdContent } = await import("@/lib/services/prd-service");
        const { generatePdfBuffer } = await import("@/lib/services/export-pdf");
        const { requireUser } = await import("@/lib/session");
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
        const safeName = (proj.name || "project")
          .replace(/[^a-zA-Z0-9_-]/g, "-")
          .replace(/-+/g, "-")
          .toLowerCase();
        return new Response(buf as never, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeName}-prd.pdf"`,
          },
        });
      },
    },
  },
});
