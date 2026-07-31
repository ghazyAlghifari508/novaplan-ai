import { createFileRoute } from "@tanstack/react-router";
import { apiKeyAuth, hasScope } from "@/lib/api-key-auth";

export const Route = createFileRoute("/api/v1/subtasks/$id/status")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const auth = await apiKeyAuth(request);
        if ("error" in auth) return Response.json({ error: auth.error }, { status: auth.status });
        if (!hasScope(auth, "write:subtask:status")) return Response.json({ error: "Insufficient scopes" }, { status: 403 });
        return Response.json({ error: "Subtask status updates unsupported in flat schema" }, { status: 501 });
      },
    },
  },
});
