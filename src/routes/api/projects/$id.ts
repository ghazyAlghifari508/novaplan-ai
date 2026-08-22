import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, prdVersions, projects, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/$id")({
	server: {
		handlers: {
			DELETE: async ({ request, params }: { request: Request; params: { id: string } }) => {
				const user = await requireUser(request.headers);
				const { id: projectId } = params;
				if (!projectId)
					return Response.json(
						{ error: "Project ID is required" },
						{ status: 400 },
					);

				// Ownership check MUST run before any child-row deletes. Deleting
				// children first (old code) let an authenticated user wipe another
				// user's data by sending their projectId - the owner check only
				// fired on the parent delete, by which point the damage was done.
				const [ownProject] = await db
					.select({ id: projects.id })
					.from(projects)
					.where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
					.limit(1);
				if (!ownProject) {
					return Response.json({ error: "Project not found" }, { status: 404 });
				}

				// ponytail: delete children before parent. FKs lack ON DELETE CASCADE
				// (schema.ts), so skipping any leaves orphaned rows. Order matters:
				// messages→conversations first (messages FK conversations), then the
				// project-scoped tables, then projects last. All in one transaction so
				// a mid-sequence failure leaves no partial orphans.
				await db.transaction(async (tx) => {
					const convRows = await tx
						.select({ id: conversations.id })
						.from(conversations)
						.where(eq(conversations.projectId, projectId));
					const convIds = convRows.map((c) => c.id);
					if (convIds.length > 0) {
						await tx
							.delete(messages)
							.where(inArray(messages.conversationId, convIds));
					}
					await tx
						.delete(conversations)
						.where(eq(conversations.projectId, projectId));
					await tx
						.delete(prdVersions)
						.where(eq(prdVersions.projectId, projectId));
					await tx.delete(tasks).where(eq(tasks.projectId, projectId));
					await tx.delete(projects).where(eq(projects.id, projectId));
				});
				return Response.json({ success: true });
			},
		},
	},
});
