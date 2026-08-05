import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions } from "@/db/schema";
import { isTruncatedGeneration } from "@/lib/flow-progress";
import { depthDirective } from "@/lib/prompt-depth";
import { AC_GENERATION_PROMPT } from "@/lib/prompts-ac";
import { checkRateLimit } from "@/lib/rate-limit";
import { requireUser } from "@/lib/session";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { saveAcVersion } from "@/lib/services/ac-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

export const Route = createFileRoute("/api/ac/generate")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireUser(getRequestHeaders());

        const { projectId, model } = await request.json().catch(() => ({ projectId: undefined, model: undefined }));
        if (!projectId) return Response.json({ error: "Project ID required" }, { status: 400 });

        const [sub] = await db.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1);
        const plan = (sub?.plan || "free") as Plan;

        const rateCheck = await checkRateLimit(user.id, plan, "api_call");
        if (!rateCheck.allowed) return Response.json({ error: "Too many requests", retryAfter: 60 }, { status: 429 });

        const [project] = await db.select({ id: projects.id }).from(projects).where(and(eq(projects.id, projectId), eq(projects.userId, user.id))).limit(1);
        if (!project) return Response.json({ error: "Project not found" }, { status: 404 });

        const prdContent = await getLatestPrdContent(projectId);
        if (!prdContent) return Response.json({ error: "PRD not found. Generate PRD first." }, { status: 404 });

        await db.update(projects).set({ acStatus: "generating" }).where(eq(projects.id, projectId));

        const modelsToTry = selectModels(plan, model);
        // ponytail: depth keyed off the primary model, not the plan.
        const systemPrompt = `${AC_GENERATION_PROMPT}\n${depthDirective("ac", modelsToTry[0])}\n\n--- PRD CONTENT ---\n${prdContent}`;
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate acceptance criteria based on the PRD above." },
        ];

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            let eventDone = false;
            let eventErrored = false;
            let fullResponse = "";

            const emit = (payload: Record<string, unknown>) => {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)); } catch {}
            };

            // Never persist a generation the model didn't finish. A dropped
            // stream used to be saved anyway, producing AC v2 (1440 chars,
            // cut mid-table) that outranked the complete v1 (19818) in the
            // viewer. Reject instead - ac-detail's saveFailed banner lets the
            // user retry, and the good version stays the latest.
            const safeDone = async (finishReason: string | undefined) => {
              if (eventDone || eventErrored) return;
              if (isTruncatedGeneration(fullResponse, finishReason)) {
                safeError(
                  "Generasi AC terputus di tengah jalan dan tidak disimpan. Coba generate ulang.",
                );
                return;
              }
              eventDone = true;
              try {
                const { acVersionId, version } = await saveAcVersion(projectId, fullResponse, "Initial AC generation", "generate");
                emit({ type: "done", acVersionId, version });
              } catch (err) {
                console.error("saveAcVersion failed:", err);
                emit({ type: "error", error: sanitizeErrorForClient(err, "ac") });
              }
              try { controller.close(); } catch {}
            };

            const safeError = (msg: string) => {
              if (eventDone || eventErrored) return;
              eventErrored = true;
              db.update(projects).set({ acStatus: "pending" }).where(eq(projects.id, projectId)).catch((e) => console.error("ac_status reset failed:", e));
              emit({ type: "error", error: msg });
              try { controller.close(); } catch {}
            };

            const enqueueThinking = (text: string) => {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "thinking", content: text })}\n\n`)); } catch {}
            };

            try {
              emit({ type: "started", model: modelsToTry[0] });
              const { generator, firstChunk, outcome } = await tryStreamWithFallback(modelsToTry, messages, request.signal, 64000, enqueueThinking);

              fullResponse += firstChunk;
              emit({ type: "delta", content: firstChunk });

              for await (const chunk of generator) {
                fullResponse += chunk;
                emit({ type: "delta", content: chunk });
              }

              await safeDone(outcome.finishReason);
            } catch (err: unknown) {
              console.error("AC generate stream error:", err);
              safeError(sanitizeErrorForClient(err, "ac"));
            }
          },
        });

        return new Response(stream, {
          headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" },
        });
      },
    },
  },
});
