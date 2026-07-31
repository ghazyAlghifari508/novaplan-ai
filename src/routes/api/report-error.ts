import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@/db";
import { errorReports } from "@/db/schema";
import { getSessionFromHeaders } from "@/lib/session";

export const Route = createFileRoute("/api/report-error")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const session = await getSessionFromHeaders(getRequestHeaders());
        const body = await request.json().catch(() => null);
        const { error, context } = body ?? {};

        await db.insert(errorReports).values({
          id: crypto.randomUUID(),
          userId: session?.user.id ?? null,
          errorMessage: error || "Unknown error",
          context: context || null,
        });

        return Response.json({ received: true });
      },
    },
  },
});
