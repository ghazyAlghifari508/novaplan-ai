import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { db } from "@/db";
import { feedback } from "@/db/schema";
import { getSessionFromHeaders } from "@/lib/session";

export const Route = createFileRoute("/api/feedback")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const session = await getSessionFromHeaders(getRequestHeaders());
				const body = await request.json().catch(() => null);
				const { message, type } = body ?? {};

				if (!message?.trim())
					return Response.json({ error: "Message required" }, { status: 400 });

				await db.insert(feedback).values({
					id: crypto.randomUUID(),
					userId: session?.user.id ?? null,
					message: message.trim(),
					type: type || "general",
				});

				return Response.json({ success: true });
			},
		},
	},
});
