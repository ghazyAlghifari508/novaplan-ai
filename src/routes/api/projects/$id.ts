import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { acVersions, conversations, messages, prdVersions, projects, tasks } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }: { params: { id: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { id: projectId } = params;
        if (!projectId) return Response.json({ error: "Project ID is required" }, { status: 400 });

        // ponytail: delete children before parent. FKs lack ON DELETE CASCADE
        // (schema.ts), so skipping any leaves orphaned rows. Order matters:
        // messages→conversations first (messages FK conversations), then the
        // project-scoped tables, then projects last.
        const convRows = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.projectId, projectId));
        const convIds = convRows.map((c) => c.id);
        if (convIds.length > 0) {
          await db.delete(messages).where(inArray(messages.conversationId, convIds));
        }
        await db.delete(conversations).where(eq(conversations.projectId, projectId));
        await db.delete(prdVersions).where(eq(prdVersions.projectId, projectId));
        await db.delete(acVersions).where(eq(acVersions.projectId, projectId));
        await db.delete(tasks).where(eq(tasks.projectId, projectId));

        const deleted = await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).returning({ id: projects.id });
        if (deleted.length) return Response.json({ success: true });
        // ponytail: DELETE is idempotent - if the row is already gone (e.g. stale
        // History card re-clicking delete), return 200 success rather than 404.
        // Only 403 if the project exists but belongs to another user.
        const [existing] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).limit(1);
        if (!existing) return Response.json({ success: true });
        return Response.json({ error: "You do not own this project" }, { status: 403 });
      },
    },
  },
});
