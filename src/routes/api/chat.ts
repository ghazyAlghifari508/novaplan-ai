import { createFileRoute } from "@tanstack/react-router";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, subscriptions } from "@/db/schema";
import { PRD_SYSTEM_PROMPT, PRD_REVISION_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import { requireUser } from "@/lib/session";
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
  getPrdVersionContent,
  resolveProjectId,
} from "@/lib/services/prd-service";
import { selectModels, tryStreamWithFallback } from "@/lib/services/ai-orchestrator";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";
import type { Plan } from "@/types/database";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const user = await requireUser(getRequestHeaders());

        const [sub] = await db.select({ plan: subscriptions.plan }).from(subscriptions).where(eq(subscriptions.userId, user.id)).orderBy(desc(subscriptions.createdAt)).limit(1);
        const plan = (sub?.plan || "free") as Plan;

        const body = await request.json();
        const { message, displayMessage, conversationId, projectId, mode = "chat", partialContent, preferences, selectedVersionNum } = body as {
          message: string;
          displayMessage?: string;
          conversationId?: string;
          projectId?: string;
          mode?: "chat" | "generate" | "revise" | "resume";
          partialContent?: string;
          preferences?: Record<string, unknown>;
          selectedVersionNum?: number;
        };

        if (!message?.trim()) return Response.json({ error: "Message is required" }, { status: 400 });

        const rateCheck = await checkRateLimit(user.id, plan, "ai_generate");
        if (!rateCheck.allowed) return Response.json({ error: "Too many requests. Please wait a moment.", retryAfter: 60 }, { status: 429 });

        if (mode === "generate") {
          const quotaCheck = await checkQuota(user.id);
          if (!quotaCheck.allowed) {
            return Response.json({ error: "Limit pembuatan PRD kamu sudah tercapai. Silakan upgrade ke paket Hengker untuk akses tanpa batas, atau tunggu reset kuota bulan depan.", quota: { used: quotaCheck.used, limit: quotaCheck.limit } }, { status: 403 });
          }
        }

        let conversationIdToUse = conversationId;
        let projectIdToUse = projectId;
        let conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

        if (conversationIdToUse) {
          const result = await getConversationHistory(conversationIdToUse, user.id);
          if (!result.valid) return Response.json({ error: "Conversation not found or unauthorized" }, { status: 403 });
          conversationHistory = result.messages;
        }

        let systemPrompt = PRD_SYSTEM_PROMPT;

        if (mode === "revise" && projectIdToUse) {
          const [projCheck] = await db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectIdToUse)).limit(1);
          if (!projCheck) return Response.json({ error: "Project not found or unauthorized" }, { status: 403 });

          const revisionBaseContent = selectedVersionNum
            ? await getPrdVersionContent(projectIdToUse, selectedVersionNum)
            : await getLatestPrdContent(projectIdToUse);
          if (revisionBaseContent) {
            systemPrompt = `${PRD_REVISION_PROMPT}\n\nCURRENT PRD CONTENT:\n\n${revisionBaseContent}`;
          }
        }

        let fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];
        if (mode === "resume" && partialContent) {
          fullMessages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user", content: message },
            { role: "assistant", content: partialContent },
            { role: "user", content: "Koneksi terputus. Lanjutkan penulisan dokumen tepat dari bagian terakhir teks di atas tanpa mengulang kalimat sebelumnya." },
          ];
        } else {
          fullMessages = [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
            { role: "user" as const, content: message },
          ];
        }

        const modelsToTry = selectModels(plan, preferences?.model as string | undefined);

        const stream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let fullResponse = "";
            let eventStarted = false;
            let eventDone = false;
            let eventErrored = false;
            const emit = (payload: Record<string, unknown>) => {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)); } catch {}
            };
            // ponytail: bare controller.enqueue at the two delta points threw when
            // the client disconnected (refresh), which fell into the catch and
            // deleted the project. Guard like emit() does; abort handling below.
            const enqueueDelta = (chunk: string) => {
              try { controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`)); } catch {}
            };
            const safeDone = (extras: Record<string, unknown>) => {
              if (eventDone) return;
              eventDone = true;
              emit({ type: "done", summaryMessage: "Selesai menyusun PRD.", ...extras });
              try { controller.close(); } catch {}
            };
            const safeError = (msg: string) => {
              if (eventDone || eventErrored) return;
              eventErrored = true;
              emit({ type: "error", error: msg });
              try { controller.close(); } catch {}
            };

            if (!eventStarted) {
              eventStarted = true;
              emit({ type: "started", model: modelsToTry[0] });
            }

            let createdProjectId: string | undefined;
            let createdConversationId: string | undefined;

            try {
              const { generator, firstChunk } = await tryStreamWithFallback(modelsToTry, fullMessages);
              await recordRequest(user.id, "ai_generate");

              if (!conversationIdToUse) {
                const result = await ensureConversation(user.id, projectIdToUse, deriveProjectName(message), preferences || null);
                conversationIdToUse = result.conversationId;
                projectIdToUse = result.projectId;
                createdConversationId = result.createdConversationId;
                createdProjectId = result.createdProjectId;
              }

              fullResponse += firstChunk;
              enqueueDelta(firstChunk);

              for await (const chunk of generator) {
                fullResponse += chunk;
                enqueueDelta(chunk);
              }

              let assistantReply: string;
              if (mode === "revise") {
                const preamble = fullResponse.split(":::UPDATE_SECTION")[0].trim();
                assistantReply = preamble || "Revisi berhasil diterapkan.";
              } else if (mode === "generate" || mode === "resume") {
                assistantReply = "Selesai menyusun PRD awal.";
              } else {
                assistantReply = fullResponse;
              }

              let userMessageToSave = displayMessage || message;
              if ((mode === "generate" || mode === "resume") && !displayMessage) {
                userMessageToSave = userMessageToSave
                  .replace(/^Generate PRD lengkap berdasarkan informasi berikut:\s*\n*/i, "")
                  .replace(/\n*Gunakan section markers sesuai standar\.\s*$/i, "")
                  .trim();
              }

              if (conversationIdToUse && (mode === "chat" || mode === "revise")) {
                await saveMessages(conversationIdToUse, userMessageToSave, assistantReply, plan);
              }

              let finalPrdToSave: string | undefined;
              if ((mode === "generate" || mode === "revise" || mode === "resume") && conversationIdToUse) {
                finalPrdToSave = mode === "resume" && partialContent ? partialContent + fullResponse : fullResponse;

                if (mode === "revise" && projectIdToUse) {
                  const currentPrd = selectedVersionNum
                    ? await getPrdVersionContent(projectIdToUse, selectedVersionNum)
                    : await getLatestPrdContent(projectIdToUse);
                  if (currentPrd) {
                    finalPrdToSave = currentPrd;
                    const updateRegex = /:::UPDATE_SECTION\[(.*?)\]:::\s*([\s\S]*?)(?:\s*:::END_UPDATE:::|$)/g;
                    let match;
                    let mergedPrd = currentPrd;
                    let isMerged = false;

                    while ((match = updateRegex.exec(fullResponse)) !== null) {
                      const sectionName = match[1].trim();
                      const newSectionContent = match[2].trim();
                      const escapedSectionName = sectionName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                      const openingTag = `<!-- SECTION: ${escapedSectionName} -->`;

                      let sectionRegex = new RegExp(`${openingTag}[\\s\\S]*?<!-- \\/SECTION -->`, "g");
                      if (sectionRegex.test(mergedPrd)) {
                        mergedPrd = mergedPrd.replace(sectionRegex, `${openingTag}\n${newSectionContent}\n<!-- /SECTION -->`);
                        isMerged = true;
                        continue;
                      }

                      const ALL_SECTION_NAMES = ["Overview", "Goals & Success Metrics", "Requirements", "Core Features", "User Flow", "Architecture & Tech Stack", "Database Schema", "Design & Technical Constraints"];
                      const sectionIdx = ALL_SECTION_NAMES.indexOf(sectionName);
                      const nextSection = sectionIdx >= 0 && sectionIdx < ALL_SECTION_NAMES.length - 1 ? ALL_SECTION_NAMES[sectionIdx + 1] : null;
                      const endBoundary = nextSection ? `(?:[\\s\\S]*?<!-- SECTION: ${nextSection.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} -->)` : "(?:[\\s\\S]*|$)";
                      sectionRegex = new RegExp(`${openingTag}[\\s\\S]*?${endBoundary}`, "g");
                      if (sectionRegex.test(mergedPrd)) {
                        const endMarker = nextSection ? `\n\n<!-- SECTION: ${nextSection} -->` : "";
                        mergedPrd = mergedPrd.replace(sectionRegex, `${openingTag}\n${newSectionContent}${endMarker}`);
                        isMerged = true;
                      }
                    }

                    if (isMerged) finalPrdToSave = mergedPrd;
                  }
                }

                await savePrdVersion(conversationIdToUse, finalPrdToSave, message, mode === "resume" ? "generate" : mode);

                try {
                  if (mode === "generate") await incrementPrdCount(user.id);
                } catch (err) {
                  console.error("Failed to increment PRD count for user", user.id, err);
                }
              }

              const resolvedProject = await resolveProjectId(projectIdToUse, conversationIdToUse);
              const donePayload: Record<string, unknown> = {
                conversationId: conversationIdToUse,
                projectId: resolvedProject || undefined,
                summaryMessage: assistantReply,
              };
              if (mode === "revise" && finalPrdToSave) donePayload.content = finalPrdToSave;
              safeDone(donePayload);
            } catch (error) {
              const errMsg = (error as Error)?.message ?? String(error);
              const errName = (error as Error)?.name ?? "";
              const isClientAbort =
                errName === "AbortError" ||
                /aborted|Invalid state: The stream closed|Controller is already closed|ReadableStream/i.test(errMsg);

              // ponytail: a client disconnect mid-stream (refresh, tab close,
              // network blip) is normal, NOT a reason to delete the just-created
              // project + conversation. Roll back only on a real generation error
              // that produced no content yet. A project with a partial/no PRD is
              // recoverable; a deleted project loses the user's entry entirely.
              if (isClientAbort && fullResponse.length > 0) {
                console.warn("Chat stream: client disconnected mid-generation; kept project + conversation.");
              } else if (isClientAbort) {
                console.warn("Chat stream: client disconnected before content; kept project for retry.");
              } else if (fullResponse.length === 0) {
                try {
                  await rollbackStreamInserts(user.id, createdConversationId, createdProjectId);
                } catch (rollbackError) {
                  console.error("Failed to roll back chat stream inserts:", rollbackError);
                }
                safeError(sanitizeErrorForClient(error));
              } else {
                console.error("Chat stream errored after content; kept partial state:", errMsg);
                safeError(sanitizeErrorForClient(error));
              }
            } finally {
              try { if (!eventDone && !eventErrored) controller.close(); } catch {}
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
