export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { TASK_GENERATION_PROMPT } from "@/lib/prompts-task";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLatestAcMarkdown } from "@/lib/services/ac-service";
import { parseTaskJson, saveTaskTree } from "@/lib/services/task-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

/**
 * POST /api/task/generate
 * Generate feature→task→subtask tree from latest AC content.
 * SSE stream: {type: "started"|"delta"|"done"|"error"}
 */
export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  // Rate limit
  const { data: subscription } = await insforge.database
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const rateCheck = await checkRateLimit(user.id, subscription?.plan || "free", "api_call");
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // Verify project ownership
  const { data: project } = await insforge.database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch latest AC content (markdown form)
  const acMarkdown = await getLatestAcMarkdown(insforge, projectId);
  if (!acMarkdown) {
    return NextResponse.json({ error: "AC not found. Generate AC first." }, { status: 404 });
  }

  // Update projects.task_status='generating'
  await insforge.database.from("projects").update({ task_status: "generating" }).eq("id", projectId);

  // Build messages
  const systemPrompt = `${TASK_GENERATION_PROMPT}\n\n--- ACCEPTANCE CRITERIA ---\n${acMarkdown}`;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Generate the task tree JSON based on the AC above." },
  ];

  const rawPlan = subscription?.plan || "free";
  const plan: Plan = ["free", "pro", "hengker"].includes(rawPlan) ? (rawPlan as Plan) : "free";
  const modelsToTry = selectModels(plan);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let eventDone = false;
      let eventErrored = false;
      let fullResponse = "";

      const emit = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // controller already closed
        }
      };

      const safeDone = async (extras: Record<string, unknown> = {}) => {
        if (eventDone || eventErrored) return;
        eventDone = true;
        try {
          const taskTree = parseTaskJson(extractJson(fullResponse));
          if (!taskTree) {
            emit({ type: "error", error: "AI menghasilkan JSON tidak valid. Coba lagi." });
            try { controller.close(); } catch {}
            return;
          }
          const saveResult = await saveTaskTree(insforge, projectId, taskTree);
          if (!saveResult.success) {
            emit({ type: "error", error: saveResult.error || "Gagal menyimpan task tree" });
            try { controller.close(); } catch {}
            return;
          }
          emit({ type: "done", taskTree, ...extras });
        } catch (err) {
          console.error("saveTaskTree failed:", err);
          emit({ type: "error", error: "Failed to save task tree" });
        }
        try { controller.close(); } catch {}
      };

      const safeError = (msg: string) => {
        if (eventDone || eventErrored) return;
        eventErrored = true;
        // Reset task_status so the UI isn't stuck on "generating" forever.
        // ponytail: non-fatal — fire-and-forget; error event still emits.
        insforge.database
          .from("projects")
          .update({ task_status: "pending" })
          .eq("id", projectId)
          .then(({ error }: { error: unknown }) => {
            if (error) console.error("task_status reset failed:", error);
          });
        emit({ type: "error", error: msg });
        try { controller.close(); } catch {}
      };

      try {
        emit({ type: "started", model: modelsToTry[0] });

        const { generator, firstChunk } = await tryStreamWithFallback(modelsToTry, messages);

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
}

/**
 * Extract a JSON object from a possibly-fenced AI response.
 * Handles ```json ... ``` fences and surrounding prose.
 */
function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }
  return raw.trim();
}
