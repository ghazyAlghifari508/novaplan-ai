export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { AC_GENERATION_PROMPT } from "@/lib/prompts-ac";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { saveAcVersion } from "@/lib/services/ac-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

/**
 * POST /api/ac/generate
 * Generate Acceptance Criteria from latest PRD content.
 * SSE stream: {type: "started"|"delta"|"done"|"error"}
 * No conversation — stateless PRD→AC generation.
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

  // Fetch latest PRD content
  const prdContent = await getLatestPrdContent(insforge, projectId);
  if (!prdContent) {
    return NextResponse.json({ error: "PRD not found. Generate PRD first." }, { status: 404 });
  }

  // Update projects.ac_status='generating'
  await insforge.database.from("projects").update({ ac_status: "generating" }).eq("id", projectId);

  // Build messages (typed roles)
  const systemPrompt = `${AC_GENERATION_PROMPT}\n\n--- PRD CONTENT ---\n${prdContent}`;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    { role: "user", content: "Generate acceptance criteria based on the PRD above." },
  ];

  // Select models
  const plan = (subscription?.plan || "free") as Plan;
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
          const { acVersionId, version } = await saveAcVersion(
            insforge,
            projectId,
            fullResponse,
            "Initial AC generation",
            "generate",
          );
          emit({ type: "done", acVersionId, version, ...extras });
        } catch (err) {
          console.error("saveAcVersion failed:", err);
          emit({ type: "error", error: "Failed to save AC version" });
        }
        try { controller.close(); } catch {}
      };

      const safeError = (msg: string) => {
        if (eventDone || eventErrored) return;
        eventErrored = true;
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
        console.error("AC generate stream error:", err);
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
