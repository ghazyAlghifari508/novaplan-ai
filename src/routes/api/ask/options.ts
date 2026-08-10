import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions } from "@/db/schema";
import { ASK_OPTIONS_GENERATION_PROMPT } from "@/lib/prompts-ask";
import { checkRateLimit } from "@/lib/rate-limit";
import {
	selectModels,
	tryStreamWithFallback,
} from "@/lib/services/ai-orchestrator";
import { parseAskOptionsJson } from "@/lib/services/ask-service";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import { requireUser } from "@/lib/session";
import type { Plan } from "@/types/database";

function extractJson(raw: string): string {
	const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenced) return fenced[1].trim();
	const firstBrace = raw.indexOf("{");
	const lastBrace = raw.lastIndexOf("}");
	if (firstBrace !== -1 && lastBrace > firstBrace)
		return raw.slice(firstBrace, lastBrace + 1);
	return raw.trim();
}

export const Route = createFileRoute("/api/ask/options")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				let user: { id: string };
				try {
					user = await requireUser(getRequestHeaders());
				} catch {
					return Response.json({ error: "Unauthorized" }, { status: 401 });
				}

				const body = (await request.json().catch(() => ({}))) as {
					projectId?: string;
					prompt?: string;
					platform?: string;
					model?: string;
				};
				const { projectId, prompt, platform, model } = body;
				if (!projectId)
					return Response.json(
						{ error: "Project ID required" },
						{ status: 400 },
					);
				if (!prompt || typeof prompt !== "string" || prompt.trim().length < 3) {
					return Response.json({ error: "Prompt required" }, { status: 400 });
				}

				const [sub] = await db
					.select({ plan: subscriptions.plan })
					.from(subscriptions)
					.where(eq(subscriptions.userId, user.id))
					.orderBy(desc(subscriptions.createdAt))
					.limit(1);
				const rawPlan = sub?.plan || "free";
				const plan: Plan = ["free", "pro", "hengker"].includes(rawPlan)
					? (rawPlan as Plan)
					: "free";

				const rateCheck = await checkRateLimit(user.id, plan, "api_call");
				if (!rateCheck.allowed)
					return Response.json(
						{ error: "Too many requests", retryAfter: 60 },
						{ status: 429 },
					);

				const [project] = await db
					.select({ id: projects.id })
					.from(projects)
					.where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
					.limit(1);
				if (!project)
					return Response.json({ error: "Project not found" }, { status: 404 });

				const platformLabel = platform === "mobile" ? "Mobile App" : "Web App";
				const messages: Array<{
					role: "system" | "user" | "assistant";
					content: string;
				}> = [
					{ role: "system", content: ASK_OPTIONS_GENERATION_PROMPT },
					{
						role: "user",
						content: `Platform: ${platformLabel}\n\nPrompt awal:\n${prompt}`,
					},
				];

				const modelsToTry = selectModels(plan, model);

				try {
					// ponytail: non-stream: payload is 5-7 short questions, progressive
					// reveal buys no UX here. Collect fully, then parse once.
					const { generator, firstChunk } = await tryStreamWithFallback(
						modelsToTry,
						messages,
						request.signal,
						4000,
					);
					let fullResponse = firstChunk;
					for await (const chunk of generator) fullResponse += chunk;

					const questions = parseAskOptionsJson(extractJson(fullResponse));
					if (!questions) {
						return Response.json(
							{ error: "AI menghasilkan JSON tidak valid. Coba lagi." },
							{ status: 500 },
						);
					}

					// Mark project at question-stage server-side so it appears in
					// History immediately on generation, not only once a PRD exists.
					// Mirrors ac-service saveAcVersion's step-on-generate write.
					// ponytail: non-fatal - a failed marker write must not block the
					// questions the user just paid an AI call to generate.
					await db
						.update(projects)
						.set({ step: "question", updatedAt: new Date() })
						.where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
						.catch((e) => console.error("ask step marker failed:", e));

					return Response.json({ questions });
				} catch (err: unknown) {
					console.error("Ask options generate error:", err);
					return Response.json(
						{ error: sanitizeErrorForClient(err) },
						{ status: 500 },
					);
				}
			},
		},
	},
});
