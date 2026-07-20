export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { AC_REVISION_PROMPT } from "@/lib/prompts-ac";
import { checkRateLimit } from "@/lib/rate-limit";
import { checkRevisionQuota } from "@/lib/quota";
import { getLatestAcMarkdown, saveAcVersion } from "@/lib/services/ac-service";
import { getConversationHistory, ensureConversation } from "@/lib/services/chat-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

/**
 * POST /api/ac/revise
 * Revise existing AC via chat conversation.
 * SSE stream: {type: "started"|"delta"|"done"|"error"}
 * Uses :::UPDATE_SECTION[Feature]::: markers for patching.
 */
export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, conversationId, message, currentAcContent } = await req.json();
  if (!projectId || !message) {
    return NextResponse.json({ error: "Project ID and message required" }, { status: 400 });
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

  // Revision quota
  const revisionCheck = await checkRevisionQuota(user.id);
  if (!revisionCheck.allowed) {
    return NextResponse.json({ error: "Revision quota exceeded" }, { status: 403 });
  }

  // Ensure conversation exists (reuse or create)
  let convId = conversationId;
  if (!convId) {
    const { conversationId: newConvId } = await ensureConversation(
      insforge,
      user.id,
      projectId,
      "AC Revision",
      null,
    );
    convId = newConvId;
  }

  // Fetch conversation history (returns { messages, valid })
  const historyResult = await getConversationHistory(insforge, convId, user.id);
  const history = historyResult.valid ? historyResult.messages : [];

  // Fetch latest AC markdown for context
  const latestAcMarkdown = currentAcContent || (await getLatestAcMarkdown(insforge, projectId));
  if (!latestAcMarkdown) {
    return NextResponse.json({ error: "AC not found. Generate AC first." }, { status: 404 });
  }

  // Build messages
  const systemPrompt = `${AC_REVISION_PROMPT}\n\n--- CURRENT AC ---\n${latestAcMarkdown}`;
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: message },
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
          // Apply patch (if :::UPDATE_SECTION markers present)
          let patchedMarkdown = latestAcMarkdown;
          const sectionRegex = /:::UPDATE_SECTION\[(.+?)\]:::\n([\s\S]*?)(?=\n:::UPDATE_SECTION\[|$)/g;
          let match;
          while ((match = sectionRegex.exec(fullResponse)) !== null) {
            const featureName = match[1];
            const newCriteria = match[2].trim();
            const featureRegex = new RegExp(
              `### Feature: ${featureName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\n[\\s\\S]*?(?=\\n### Feature:|$)`,
              "g",
            );
            patchedMarkdown = patchedMarkdown.replace(featureRegex, `### Feature: ${featureName}\n${newCriteria}`);
          }

          const { acVersionId, version } = await saveAcVersion(
            insforge,
            projectId,
            patchedMarkdown,
            message,
            "revise",
          );

          // Save messages (user + assistant)
          await insforge.database.from("messages").insert([
            { conversation_id: convId, role: "user", content: message },
            { conversation_id: convId, role: "assistant", content: fullResponse },
          ]);

          // Increment revision count (ponytail: if RPC doesn't exist, silently skip)
          try {
            await insforge.database.rpc("increment_revision_used", { p_user_id: user.id });
          } catch (e) {
            console.error("increment_revision_used RPC failed (non-fatal):", e);
          }

          emit({ type: "done", acVersionId, version, ...extras });
        } catch (err) {
          console.error("saveAcVersion failed:", err);
          emit({ type: "error", error: "Failed to save AC revision" });
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
}
