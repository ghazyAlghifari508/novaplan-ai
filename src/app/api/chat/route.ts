export const runtime = "edge";
export const maxDuration = 60; // Allow long generations

import { NextRequest } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { PRD_SYSTEM_PROMPT, PRD_REVISION_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import type { Plan } from "@/types/database";

// ── Service Imports ──
import {
  getConversationHistory,
  ensureConversation,
  saveMessages,
  rollbackStreamInserts,
} from "@/lib/services/chat-service";
import {
  deriveProjectName,
  savePrdVersion,
  getLatestPrdContent,
  resolveProjectId,
} from "@/lib/services/prd-service";
import { selectModels, tryStreamWithFallback, generateSummaryReply } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";

// ─────────────────────────────────────────────
// POST /api/chat
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Auth ──
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: userRecord } = await insforge.database.from("users").select("id").eq("id", user.id).single();
  if (!userRecord) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 2. Parse request ──
  const { data: subscription } = await insforge.database.from("subscriptions").select("plan").eq("user_id", user.id).single();
  const plan = (subscription?.plan || "free") as Plan;

  const body = await req.json();
  const {
    message,
    displayMessage,
    conversationId,
    projectId,
    mode = "chat",
    partialContent,
    preferences,
  } = body as {
    message: string;
    displayMessage?: string;
    conversationId?: string;
    projectId?: string;
    mode?: "chat" | "generate" | "revise" | "resume";
    partialContent?: string;
    preferences?: Record<string, unknown>;
  };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── 3. Rate limit & quota ──
  const rateCheck = await checkRateLimit(user.id, plan, "ai_generate");
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a moment.", retryAfter: 60 }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } },
    );
  }

  if (mode === "generate") {
    const quotaCheck = await checkQuota(user.id);
    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "Limit pembuatan PRD kamu sudah tercapai. Silakan upgrade ke paket Hengker untuk akses tanpa batas, atau tunggu reset kuota bulan depan.",
          quota: { used: quotaCheck.used, limit: quotaCheck.limit },
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }
  }

  // ── 4. Conversation history ──
  let conversationIdToUse = conversationId;
  let projectIdToUse = projectId;
  let conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (conversationIdToUse) {
    const result = await getConversationHistory(insforge, conversationIdToUse, user.id);
    if (!result.valid) {
      return new Response(JSON.stringify({ error: "Conversation not found or unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }
    conversationHistory = result.messages;
  }

  // ── 5. System prompt ──
  let systemPrompt = PRD_SYSTEM_PROMPT;

  if (mode === "revise" && projectIdToUse) {
    const { data: projCheck } = await insforge.database.from("projects").select("id").eq("id", projectIdToUse).eq("user_id", user.id).single();
    if (!projCheck) {
      return new Response(JSON.stringify({ error: "Project not found or unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const latestContent = await getLatestPrdContent(insforge, projectIdToUse);
    if (latestContent) {
      systemPrompt = `${PRD_REVISION_PROMPT}\n\nCURRENT PRD CONTENT:\n\n${latestContent}`;
    }
  }

  // ── 6. Build messages & select models ──
  let fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

  if (mode === "resume" && partialContent) {
    fullMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user", content: message },
      { role: "assistant", content: partialContent },
      { role: "user", content: "Koneksi terputus. Lanjutkan penulisan dokumen tepat dari bagian terakhir teks di atas tanpa mengulang kalimat sebelumnya." }
    ];
  } else {
    fullMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];
  }

  const modelsToTry = selectModels(plan, preferences?.model as string | undefined);

  // ── 7. Stream response ──
  let activeStreamGenerator: AsyncGenerator<string, void, undefined> | null = null;
  let activeAbortController: AbortController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      let createdProjectId: string | undefined;
      let createdConversationId: string | undefined;

      try {
        const { generator, firstChunk, abortController } = await tryStreamWithFallback(modelsToTry, fullMessages);
        activeAbortController = abortController;
        activeStreamGenerator = generator;

        await recordRequest(user.id, "ai_generate");

        // Create project/conversation if needed
        if (!conversationIdToUse) {
          const result = await ensureConversation(
            insforge,
            user.id,
            projectIdToUse,
            deriveProjectName(message),
            preferences || null,
          );
          conversationIdToUse = result.conversationId;
          projectIdToUse = result.projectId;
          createdConversationId = result.createdConversationId;
          createdProjectId = result.createdProjectId;
        }

        // Stream first chunk
        fullResponse += firstChunk;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: firstChunk })}\n\n`));

        // Stream remaining chunks
        for await (const chunk of generator) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`));
        }

        // ── Post-stream: generate assistant reply ──
        // Only "chat" mode stores the model output verbatim as a chat message.
        // PRD-producing modes (generate/revise/resume) must NOT persist their
        // PRD text as a chat bubble — the PRD belongs in the center PRD panel
        // (saved via savePrdVersion below), while the right-hand chat panel is
        // reserved for revision conversation. "resume" previously fell through
        // to the chat branch and leaked the full PRD into the chat panel.
        let assistantReply: string;
        if (mode === "revise") {
          assistantReply = await generateSummaryReply(message);
        } else if (mode === "generate" || mode === "resume") {
          assistantReply = "Selesai menyusun PRD awal.";
        } else {
          assistantReply = fullResponse;
        }

        // ── Post-stream: save to database ──
        // For PRD-producing modes the `message` sent to the AI contains an
        // internal template wrapper ("Generate PRD lengkap berdasarkan …
        // Gunakan section markers …") that must never be persisted as a
        // user-visible chat bubble. The client sends a clean `displayMessage`
        // when available, but some entry-points (manual-setup, edge cases
        // where sessionStorage is lost) omit it. As a defensive measure we
        // strip the wrapper here so the DB always stores the user's original
        // prompt regardless of the client path.
        let userMessageToSave = displayMessage || message;
        if ((mode === "generate" || mode === "resume") && !displayMessage) {
          userMessageToSave = userMessageToSave
            .replace(/^Generate PRD lengkap berdasarkan informasi berikut:\s*\n*/i, "")
            .replace(/\n*Gunakan section markers sesuai standar\.\s*$/i, "")
            .trim();
        }

        if (conversationIdToUse) {
          await saveMessages(insforge, conversationIdToUse, userMessageToSave, assistantReply, plan);
        }

        if ((mode === "generate" || mode === "revise" || mode === "resume") && conversationIdToUse) {
          let finalPrdToSave = mode === "resume" && partialContent 
            ? partialContent + fullResponse 
            : fullResponse;
            
          // Merge logic for "revise" mode (Block-Patching)
          if (mode === "revise" && projectIdToUse) {
            const currentPrd = await getLatestPrdContent(insforge, projectIdToUse);
            if (currentPrd) {
              const updateRegex = /:::UPDATE_SECTION\[(.*?)\]:::\s*([\s\S]*?)\s*:::END_UPDATE:::/g;
              let match;
              let mergedPrd = currentPrd;
              let isMerged = false;
              
              while ((match = updateRegex.exec(fullResponse)) !== null) {
                const sectionName = match[1].trim();
                const newSectionContent = match[2].trim();
                
                // Escape special characters in sectionName for regex safety
                const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const sectionRegex = new RegExp(`<!-- SECTION: ${escapedSectionName} -->[\\s\\S]*?<!-- \\/SECTION -->`, 'g');
                
                if (sectionRegex.test(mergedPrd)) {
                  const replacement = `<!-- SECTION: ${sectionName} -->\n${newSectionContent}\n<!-- /SECTION -->`;
                  mergedPrd = mergedPrd.replace(sectionRegex, replacement);
                  isMerged = true;
                }
              }
              
              // If AI successfully used the patching format, save the merged PRD
              if (isMerged) {
                finalPrdToSave = mergedPrd;
              }
            }
          }

          await savePrdVersion(insforge, conversationIdToUse, finalPrdToSave, message, mode === "resume" ? "generate" : mode);

          try {
            if (mode === "generate") {
              await incrementPrdCount(user.id);
            }
          } catch (err) {
            console.error("Failed to increment PRD count for user", user.id, err);
          }
        }

        // ── Send done event ──
        const resolvedProject = await resolveProjectId(insforge, projectIdToUse, conversationIdToUse);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              conversationId: conversationIdToUse,
              projectId: resolvedProject || undefined,
              summaryMessage: assistantReply,
            })}\n\n`,
          ),
        );
      } catch (error) {
        // Rollback any created records
        try {
          await rollbackStreamInserts(insforge, user.id, createdConversationId, createdProjectId);
        } catch (rollbackError) {
          console.error("Failed to roll back chat stream inserts:", rollbackError);
        }

        const cleanError = sanitizeErrorForClient(error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "error", error: cleanError })}\n\n`));
      } finally {
        activeAbortController = null;
        activeStreamGenerator = null;
        controller.close();
      }
    },
    cancel() {
      activeAbortController?.abort();
      void activeStreamGenerator?.return().catch(() => {});
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
