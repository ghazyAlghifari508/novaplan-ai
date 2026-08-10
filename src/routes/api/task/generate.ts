import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions } from "@/db/schema";
import { checkCredits, consumeCredit, hasFullWorkflow } from "@/lib/credits";
import { TASK_GENERATION_PROMPT } from "@/lib/prompts-task";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLatestAcMarkdown } from "@/lib/services/ac-service";
import {
	selectModels,
	tryStreamWithFallback,
} from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import { parseTaskJson, saveTaskTree } from "@/lib/services/task-service";
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

export const Route = createFileRoute("/api/task/generate")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(getRequestHeaders());
				const { projectId, model } = await request
					.json()
					.catch(() => ({ projectId: undefined, model: undefined }));
				if (!projectId)
					return Response.json(
						{ error: "Project ID required" },
						{ status: 400 },
					);

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

				// Plan gate: free tier is PRD-only. Credit gate follows below.
				if (!hasFullWorkflow(plan)) {
					return Response.json(
						{
							error: "Generate Task hanya tersedia di paket Pro dan Hengker.",
							code: "UPGRADE_REQUIRED",
							plan,
						},
						{ status: 403 },
					);
				}

				const creditCheck = await checkCredits(user.id);
				if (!creditCheck.allowed) {
					return Response.json(
						{
							error:
								"Kredit kamu sudah habis. Beli kredit untuk generate Task.",
							code: "NO_CREDITS",
							plan: creditCheck.plan,
							remaining: creditCheck.remaining,
						},
						{ status: 403 },
					);
				}

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

				const acMarkdown = await getLatestAcMarkdown(projectId);
				if (!acMarkdown)
					return Response.json(
						{ error: "AC not found. Generate AC first." },
						{ status: 404 },
					);

				await db
					.update(projects)
					.set({ taskStatus: "generating" })
					.where(eq(projects.id, projectId));

				const modelsToTry = selectModels(plan, model);
				const systemPrompt = `${TASK_GENERATION_PROMPT}\n\n--- ACCEPTANCE CRITERIA ---\n${acMarkdown}`;
				const messages: Array<{
					role: "system" | "user" | "assistant";
					content: string;
				}> = [
					{ role: "system", content: systemPrompt },
					{
						role: "user",
						content: "Generate the task tree JSON based on the AC above.",
					},
				];

				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						const encoder = new TextEncoder();
						let eventDone = false;
						let eventErrored = false;
						let fullResponse = "";

						const emit = (payload: Record<string, unknown>) => {
							try {
								controller.enqueue(
									encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
								);
							} catch {}
						};

						const safeDone = async () => {
							if (eventDone || eventErrored) return;
							eventDone = true;
							try {
								const taskTree = parseTaskJson(extractJson(fullResponse));
								if (!taskTree) {
									await db
										.update(projects)
										.set({ taskStatus: "pending" })
										.where(eq(projects.id, projectId))
										.catch((e) =>
											console.error("task_status reset failed:", e),
										);
									emit({
										type: "error",
										error: "AI menghasilkan JSON tidak valid. Coba lagi.",
									});
									try {
										controller.close();
									} catch {}
									return;
								}
								const saveResult = await saveTaskTree(projectId, taskTree);
								if (!saveResult.success) {
									emit({
										type: "error",
										error: saveResult.error || "Gagal menyimpan task tree",
									});
									try {
										controller.close();
									} catch {}
									return;
								}
								emit({ type: "done", taskTree });
								try {
									await consumeCredit(user.id);
								} catch (e) {
									console.error("Task credit burn failed:", e);
								}
							} catch (err) {
								console.error("saveTaskTree failed:", err);
								emit({ type: "error", error: "Failed to save task tree" });
							}
							try {
								controller.close();
							} catch {}
						};

						const safeError = (msg: string) => {
							if (eventDone || eventErrored) return;
							eventErrored = true;
							db.update(projects)
								.set({ taskStatus: "pending" })
								.where(eq(projects.id, projectId))
								.catch((e) => console.error("task_status reset failed:", e));
							emit({ type: "error", error: msg });
							try {
								controller.close();
							} catch {}
						};

						const enqueueThinking = (text: string) => {
							try {
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({ type: "thinking", content: text })}\n\n`,
									),
								);
							} catch {}
						};

						try {
							emit({ type: "started", model: modelsToTry[0] });
							const { generator, firstChunk } = await tryStreamWithFallback(
								modelsToTry,
								messages,
								request.signal,
								64000,
								enqueueThinking,
							);

							fullResponse += firstChunk;
							emit({ type: "delta", content: firstChunk });

							for await (const chunk of generator) {
								fullResponse += chunk;
								emit({ type: "delta", content: chunk });
							}

							await safeDone();
						} catch (err: unknown) {
							console.error("Task generate stream error:", err);
							safeError(sanitizeErrorForClient(err));
						}
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			},
		},
	},
});
