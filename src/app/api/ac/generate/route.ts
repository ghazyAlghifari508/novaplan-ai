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

  let projectId: string;
  try {
    const body = await req.json();
    projectId = body?.projectId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
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
      let abortController: AbortController | null = null;

      // Abort AI generation when client disconnects (tab close, navigation)
      // so we don't waste tokens on an abandoned stream.
      let clientAborted = false;
      const onAbort = () => { clientAborted = true; try { controller.close(); } catch {} };
      req.signal.addEventListener("abort", onAbort);

      const emit = (payload: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        } catch {
          // controller already closed
        }
      };

      // Phase 2 (DB save) intentionally ignores clientAborted/req.signal — once AI
      // streaming finishes, the save must run to completion even if the client tab
      // closed, so a finished generation is never silently discarded (PRD US-4).
      // emit()/controller.close() are already try/catch-guarded above, so a closed
      // controller here just no-ops instead of throwing ECONNRESET.
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
          emit({ type: "error", error: sanitizeErrorForClient(err, "ac") });
        }
        try { controller.close(); } catch {}
      };

      const safeError = (msg: string) => {
        if (eventDone || eventErrored) return;
        eventErrored = true;
        // Reset ac_status so the UI isn't stuck on "generating" forever.
        // ponytail: non-fatal — fire-and-forget; error event still emits.
        insforge.database
          .from("projects")
          .update({ ac_status: "pending" })
          .eq("id", projectId)
          .then(({ error }: { error: unknown }) => {
            if (error) console.error("ac_status reset failed:", error);
          });
        emit({ type: "error", error: msg });
        try { controller.close(); } catch {}
      };

      // Heartbeat to keep connection alive and detect client disconnect
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeatInterval);
        }
      }, 15000);

      try {
        emit({ type: "started", model: modelsToTry[0] });

        const { generator, firstChunk, abortController: genAbortController } = await tryStreamWithFallback(modelsToTry, messages, req.signal, 64000);
        abortController = genAbortController;
        if (clientAborted || req.signal.aborted) return;

        fullResponse += firstChunk;
        emit({ type: "delta", content: firstChunk });

        for await (const chunk of generator) {
          if (clientAborted || req.signal.aborted) return;
          fullResponse += chunk;
          emit({ type: "delta", content: chunk });
        }

        // AI streaming (Phase 1) finished fully here — don't gate the save (Phase 2)
        // on clientAborted/req.signal anymore. A tab close that races with the very
        // last chunk must not discard a completed generation (PRD US-4, AC-4.2/4.3).
        await safeDone();
      } catch (err: unknown) {
        if (clientAborted || req.signal.aborted) return;
        console.error("AC generate stream error:", err);
        safeError(sanitizeErrorForClient(err, "ac"));
      } finally {
        clearInterval(heartbeatInterval);
        req.signal.removeEventListener("abort", onAbort);
        if (abortController && !abortController.signal.aborted) {
          abortController.abort();
        }
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
