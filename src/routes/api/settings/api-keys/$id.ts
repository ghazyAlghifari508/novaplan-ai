import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/settings/api-keys/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }: { params: { id: string } }) => {
        const user = await requireUser(getRequestHeaders());
        const { id } = params;

        const deleted = await db.delete(apiKeys).where(and(eq(apiKeys.id, id), eq(apiKeys.userId, user.id))).returning({ id: apiKeys.id });
        if (!deleted.length) return Response.json({ error: "API key not found" }, { status: 404 });
        return Response.json({ success: true });
      },
    },
  },
});
