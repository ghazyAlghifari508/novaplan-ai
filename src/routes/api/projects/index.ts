import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@/db";
import { projects } from "@/db/schema";
import { normalizeLanguage } from "@/lib/language";
import { deriveProjectNameSync } from "@/lib/services/prd-service";
import { requireUser } from "@/lib/session";

export const Route = createFileRoute("/api/projects/")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(request.headers);
				const body = await request.json().catch(() => null);
				const message = body?.message;
				const language = normalizeLanguage(body?.language);

				if (!message || typeof message !== "string" || message.length < 3) {
					return Response.json(
						{ error: "Prompt harus diisi minimal 3 karakter" },
						{ status: 400 },
					);
				}

				const id = crypto.randomUUID();
				// ponytail: sync regex-only name, skip AI call. chat.ts calls
				// deriveProjectName (with AI) again inside the SSE stream, so the
				// final name is AI-quality — user never sees the rough one.
				const projectName = deriveProjectNameSync(message);
				const [project] = await db
					.insert(projects)
					.values({
						id,
						userId: user.id,
						name: projectName,
						status: "draft",
						mode: "ai_auto",
						language,
					})
					.returning({ id: projects.id, name: projects.name });

				if (!project)
					return Response.json(
						{ error: "Gagal membuat project" },
						{ status: 500 },
					);
				return Response.json({ id: project.id, name: project.name });
			},
		},
	},
});
