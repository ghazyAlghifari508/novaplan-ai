import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { deriveProjectName } from "@/lib/services/prd-service";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireUser(getRequestHeaders());
        const body = await request.json().catch(() => null);
        const message = body?.message;

        if (!message || typeof message !== "string" || message.length < 3) {
          return Response.json({ error: "Prompt harus diisi minimal 3 karakter" }, { status: 400 });
        }

        const id = crypto.randomUUID();
        const projectName = await deriveProjectName(message);
        const [project] = await db.insert(projects).values({ id, userId: user.id, name: projectName, status: "draft", mode: "ai_auto" }).returning({ id: projects.id, name: projects.name });

        if (!project) return Response.json({ error: "Gagal membuat project" }, { status: 500 });
        return Response.json({ id: project.id, name: project.name });
      },
    },
  },
});
