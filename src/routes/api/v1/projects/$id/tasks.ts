import { createFileRoute } from "@tanstack/react-router";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import {
	apiKeyAuth,
	hasScope,
	verifyProjectOwnership,
} from "@/lib/api-key-auth";

export const Route = createFileRoute("/api/v1/projects/$id/tasks")({
	server: {
		handlers: {
			GET: async ({
				params,
				request,
			}: {
				params: { id: string };
				request: Request;
			}) => {
				const auth = await apiKeyAuth(request);
				if ("error" in auth)
					return Response.json({ error: auth.error }, { status: auth.status });
				if (!hasScope(auth, "read:project"))
					return Response.json(
						{ error: "Insufficient scopes" },
						{ status: 403 },
					);

				const { id: projectId } = params;
				if (!(await verifyProjectOwnership(auth.userId, projectId)))
					return Response.json({ error: "Project not found" }, { status: 404 });

				const url = new URL(request.url);
				const statusFilter = url.searchParams.get("status");
				const rows = await db
					.select()
					.from(tasks)
					.where(eq(tasks.projectId, projectId))
					.orderBy(asc(tasks.order));
				const filtered = statusFilter
					? rows.filter((t) => (t.status ?? "pending") === statusFilter)
					: rows;

				return Response.json({
					tasks: filtered.map((t) => ({
						id: t.id,
						name: t.title,
						description: t.description,
						status: t.status ?? "pending",
						featureName: t.featureName || "Umum",
						startedAt: t.startedAt ? (t.startedAt as Date).toISOString() : null,
						completedAt: t.completedAt
							? (t.completedAt as Date).toISOString()
							: null,
						dependencies: Array.isArray(t.dependencies)
							? (t.dependencies as string[])
							: [],
						subtasks: Array.isArray(t.subtasks)
							? (t.subtasks as Array<Record<string, unknown>>).map((s) => ({
									name: s.name,
									description: s.description,
									status: s.status ?? "pending",
									details: s.details ?? [],
								}))
							: [],
					})),
				});
			},
		},
	},
});
