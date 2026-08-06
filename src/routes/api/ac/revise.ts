import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { messages, projects, subscriptions } from "@/db/schema";
import { isTruncatedGeneration } from "@/lib/flow-progress";
import { AC_REVISION_PROMPT } from "@/lib/prompts-ac";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLatestAcMarkdown, saveAcVersion } from "@/lib/services/ac-service";
import {
	selectModels,
	tryStreamWithFallback,
} from "@/lib/services/ai-orchestrator";
import {
	ensureConversation,
	getConversationHistory,
} from "@/lib/services/chat-service";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import { requireUser } from "@/lib/session";
import type { Plan } from "@/types/database";

export const Route = createFileRoute("/api/ac/revise")({
	server: {
		handlers: {
			POST: async ({ request }: { request: Request }) => {
				const user = await requireUser(getRequestHeaders());
				const {
					projectId,
					conversationId,
					message,
					currentAcContent,
					preferences,
				} = await request.json();
				if (!projectId || !message)
					return Response.json(
						{ error: "Project ID and message required" },
						{ status: 400 },
					);

				const [sub] = await db
					.select({ plan: subscriptions.plan })
					.from(subscriptions)
					.where(eq(subscriptions.userId, user.id))
					.orderBy(desc(subscriptions.createdAt))
					.limit(1);
				const plan = (sub?.plan || "free") as Plan;

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
					return Response.json(
						{ error: "Project not found or unauthorized" },
						{ status: 403 },
					);

				// ponytail: no revision gate - revisi is unlimited on every tier.
				let convId = conversationId;
				if (!convId) {
					const { conversationId: newConvId } = await ensureConversation(
						user.id,
						projectId,
						"AC Revision",
						null,
					);
					convId = newConvId;
				}

				const historyResult = await getConversationHistory(convId, user.id);
				const history = historyResult.valid ? historyResult.messages : [];

				const latestAcMarkdown =
					currentAcContent || (await getLatestAcMarkdown(projectId));
				if (!latestAcMarkdown)
					return Response.json(
						{ error: "AC not found. Generate AC first." },
						{ status: 404 },
					);

				const systemPrompt = `${AC_REVISION_PROMPT}\n\n--- CURRENT AC ---\n${latestAcMarkdown}`;
				const messagesArr: Array<{
					role: "system" | "user" | "assistant";
					content: string;
				}> = [
					{ role: "system", content: systemPrompt },
					...history,
					{ role: "user", content: message },
				];

				const modelsToTry = selectModels(
					plan,
					preferences?.model as string | undefined,
				);

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

						// A half-streamed revision writes a half-written section into the
						// AC as a new version. Reject it - the previous version stays
						// latest and the user can retry.
						const safeDone = async (finishReason: string | undefined) => {
							if (eventDone || eventErrored) return;
							if (isTruncatedGeneration(fullResponse, finishReason)) {
								safeError(
									"Revisi AC terputus di tengah jalan dan tidak disimpan. Coba lagi.",
								);
								return;
							}
							eventDone = true;
							try {
								let patchedMarkdown = latestAcMarkdown;
								const sectionRegex =
									/:::UPDATE_SECTION\[(.+?)\]:::\n([\s\S]*?)(?=\n:::UPDATE_SECTION\[|$)/g;
								let match;
								while ((match = sectionRegex.exec(fullResponse)) !== null) {
									const featureName = match[1];
									const newCriteria = match[2].trim();
									const featureRegex = new RegExp(
										`### Feature: ${featureName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?(?=\\n### Feature:|$)`,
										"g",
									);
									patchedMarkdown = patchedMarkdown.replace(
										featureRegex,
										`### Feature: ${featureName}\n${newCriteria}`,
									);
								}

								const { acVersionId, version } = await saveAcVersion(
									projectId,
									patchedMarkdown,
									message,
									"revise",
								);

								await db.insert(messages).values([
									{
										id: crypto.randomUUID(),
										conversationId: convId,
										role: "user",
										content: message,
									},
									{
										id: crypto.randomUUID(),
										conversationId: convId,
										role: "assistant",
										content: fullResponse,
									},
								]);

								emit({ type: "done", acVersionId, version });
							} catch (err) {
								console.error("saveAcVersion failed:", err);
								emit({ type: "error", error: "Failed to save AC revision" });
							}
							try {
								controller.close();
							} catch {}
						};

						const safeError = (msg: string) => {
							if (eventDone || eventErrored) return;
							eventErrored = true;
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
							const { generator, firstChunk, outcome } =
								await tryStreamWithFallback(
									modelsToTry,
									messagesArr,
									undefined,
									64000,
									enqueueThinking,
								);

							fullResponse += firstChunk;
							emit({ type: "delta", content: firstChunk });

							for await (const chunk of generator) {
								fullResponse += chunk;
								emit({ type: "delta", content: chunk });
							}

							await safeDone(outcome.finishReason);
						} catch (err: unknown) {
							console.error("AC revise stream error:", err);
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
