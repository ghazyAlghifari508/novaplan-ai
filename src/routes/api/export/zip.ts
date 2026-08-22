import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { formatPrdMarkdown, formatTasksJson, generateZipBuffer } from "@/lib/services/export-service";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getTaskTree } from "@/lib/services/task-service";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/export/zip")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(getRequestHeaders());
				const { projectId } = await request.json();
				if (!projectId)
					return Response.json(
						{ error: "Project ID required" },
						{ status: 400 },
					);

				const [project] = await db
					.select({ id: projects.id, name: projects.name })
					.from(projects)
					.where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
					.limit(1);
				if (!project)
					return Response.json({ error: "Project not found" }, { status: 404 });

				const [prdContent, taskTree] = await Promise.all([
					getLatestPrdContent(projectId),
					getTaskTree(projectId),
				]);

				const zipBuffer = await generateZipBuffer({
					prd: prdContent ? formatPrdMarkdown(prdContent) : undefined,
					ac: undefined,
					tasks: formatTasksJson(taskTree),
				});

				const safeName = (project.name || "project")
					.replace(/[^a-zA-Z0-9_-]/g, "-")
					.replace(/-+/g, "-")
					.toLowerCase();

				return new Response(new Uint8Array(zipBuffer), {
					headers: {
						"Content-Type": "application/zip",
						"Content-Disposition": `attachment; filename="novaplan-${safeName}.zip"`,
						"Content-Length": String(zipBuffer.length),
					},
				});
			},
		},
	},
});
