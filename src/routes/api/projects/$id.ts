import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { conversations, messages, prdVersions, projects } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }: { params: { id: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { id: projectId } = params;
        if (!projectId) return Response.json({ error: "Project ID is required" }, { status: 400 });

        const convRows = await db.select({ id: conversations.id }).from(conversations).where(eq(conversations.projectId, projectId));
        const convIds = convRows.map((c) => c.id);
        if (convIds.length > 0) {
          await db.delete(messages).where(inArray(messages.conversationId, convIds));
        }
        await db.delete(conversations).where(eq(conversations.projectId, projectId));
        await db.delete(prdVersions).where(eq(prdVersions.projectId, projectId));

        const deleted = await db.delete(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).returning({ id: projects.id });
        if (!deleted.length) return Response.json({ error: "Project not found" }, { status: 404 });
        return Response.json({ success: true });
      },
    },
  },
});
