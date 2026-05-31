export const dynamic = "force-dynamic";
export const maxDuration = 60; // Allow long generations

import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/ai-client";
import { PRD_SYSTEM_PROMPT, PRD_REVISION_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import { generateShareToken } from "@/lib/utils";
import { AI_MODELS_BY_PLAN } from "@/lib/constants";
import type { Plan } from "@/types/database";

function deriveProjectName(message: string) {
  let cleanMsg = message;

  // Strip meta tags like `[: Web App]` or `[E-commerce: Mobile App]`
  cleanMsg = cleanMsg.replace(/^\[.*?\]\s*/i, "");

  // Strip standard template boilerplate
  cleanMsg = cleanMsg.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");

  // Strip conversational fillers
  cleanMsg = cleanMsg.replace(/(tolong|coba|bantu)?\s*(buatkan|bikin|generate|tuliskan)\s*(gw|saya|kami)?\s*(sebuah|satu)?\s*(prd|dokumen prd|dokumen)\s*(untuk|buat|tentang)?\s*(membuat|membangun|bikin)?/gi, "");
  cleanMsg = cleanMsg.replace(/\b(?:aplikasi|website|platform|sistem|web)\b/gi, "");

  cleanMsg = cleanMsg.replace(/\s+/g, " ").trim();

  if (cleanMsg.length < 3) return "Project Baru";

  const words = cleanMsg.split(" ");
  // Take max 4 words for a cleaner title
  let projectName = words.slice(0, 4).join(" ");
  if (words.length > 4) projectName += "...";
  
  // Capitalize first letter of each word
  projectName = projectName.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  return projectName.trim().length < 3 ? "Project Baru" : projectName;
}

async function rollbackStreamInserts({
  supabase,
  userId,
  createdConversationId,
  createdProjectId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  createdConversationId?: string;
  createdProjectId?: string;
}) {
  if (createdConversationId) {
    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", createdConversationId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  if (createdProjectId) {
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", createdProjectId)
      .eq("user_id", userId);

    if (error) throw error;
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: userRecord } = await supabase
    .from("users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!userRecord) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .single();

  const plan = (subscription?.plan || "free") as Plan;

  const body = await req.json();
  const {
    message,
    conversationId,
    projectId,
    mode = "chat",
    preferences,
  } = body as {
    message: string;
    conversationId?: string;
    projectId?: string;
    mode?: "chat" | "generate" | "revise";
    preferences?: Record<string, unknown>;
  };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rateCheck = await checkRateLimit(user.id, plan, "ai_generate");
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please wait a moment.",
        retryAfter: 60,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
        },
      },
    );
  }

  if (mode === "generate") {
    const quotaCheck = await checkQuota(user.id);
    if (!quotaCheck.allowed) {
      return new Response(
        JSON.stringify({
          error:
            "Limit pembuatan PRD kamu sudah tercapai. Silakan upgrade ke paket Hengker untuk akses tanpa batas, atau tunggu reset kuota bulan depan.",
          quota: { used: quotaCheck.used, limit: quotaCheck.limit },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  let conversationIdToUse = conversationId;
  let projectIdToUse = projectId;

  let conversationHistory: Array<{
    role: "system" | "user" | "assistant";
    content: string;
  }> = [];

  if (conversationIdToUse) {
    const { data: convCheck } = await supabase
      .from("conversations")
      .select("id")
      .eq("id", conversationIdToUse)
      .eq("user_id", user.id)
      .single();

    if (!convCheck) {
      return new Response(JSON.stringify({ error: "Conversation not found or unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: messages } = await supabase
      .from("messages")
      .select("role, content")
      .eq("conversation_id", conversationIdToUse)
      .order("created_at", { ascending: true })
      .limit(20);

    conversationHistory =
      messages?.map((m) => ({
        role: m.role as "system" | "user" | "assistant",
        content: m.content,
      })) || [];
  }

  let systemPrompt = PRD_SYSTEM_PROMPT;

  if (mode === "revise" && projectIdToUse) {
    const { data: projCheck } = await supabase
      .from("projects")
      .select("id")
      .eq("id", projectIdToUse)
      .eq("user_id", user.id)
      .single();

    if (!projCheck) {
      return new Response(JSON.stringify({ error: "Project not found or unauthorized" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { data: latestVersion } = await supabase
      .from("prd_versions")
      .select("content")
      .eq("project_id", projectIdToUse)
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (latestVersion?.content) {
      systemPrompt = `${PRD_REVISION_PROMPT}\n\nCURRENT PRD CONTENT:\n\n${latestVersion.content}`;
    }
  }

  const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      { role: "user" as const, content: message },
    ];

  let activeStreamGenerator: AsyncGenerator<string, void, undefined> | null = null;
  let activeAbortController: AbortController | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      let createdProjectId: string | undefined;
      let createdConversationId: string | undefined;

      try {
        // Pick the model pool based on user's plan
        let modelsToTry = [...(AI_MODELS_BY_PLAN[plan as Plan] as readonly string[])];

        // If user selected a specific model and they are allowed to use it (it's in their pool),
        // prioritize it by putting it at the front of the array.
        const requestedModel = preferences?.model as string | undefined;
        if (requestedModel) {
          // Check if the requested model is actually available to them in any tier up to their plan
          // Since modelsToTry only contains the highest tier, we need to allow any model from their tier or lower.
          const tierOrder: Plan[] = ["free", "pro", "hengker"];
          const userTierIdx = tierOrder.indexOf(plan as Plan);
          
          let isAllowed = false;
          for (let i = 0; i <= userTierIdx; i++) {
            if ((AI_MODELS_BY_PLAN[tierOrder[i]] as readonly string[]).includes(requestedModel)) {
              isAllowed = true;
              break;
            }
          }

          if (isAllowed) {
            // Remove from current position if it exists, and prepend
            modelsToTry = [requestedModel, ...modelsToTry.filter(m => m !== requestedModel)];
          }
        }

        // Try each model sequentially for fallback
        let streamGenerator: AsyncGenerator<string, void, undefined> | null = null;
        let firstChunk = "";
        let lastError = "";

        for (let i = 0; i < modelsToTry.length; i++) {
          const modelToTry = modelsToTry[i];
          const abortController = new AbortController();
          const gen = streamChat(fullMessages, modelToTry, abortController.signal);
          
          try {
            const first = await gen.next();

            if (first.done || typeof first.value !== "string" || !first.value) {
              throw new Error(`Respons kosong dari chunk model.`);
            }

            firstChunk = first.value;
            streamGenerator = gen;
            activeAbortController = abortController;
            activeStreamGenerator = gen;
            break; // Success, use this generator
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            abortController.abort();
            await gen.return().catch(() => {});
            continue; // Try next chunk
          }
        }

        if (!streamGenerator) {
          throw new Error(`Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`);
        }

        await recordRequest(user.id, "ai_generate");

        if (!conversationIdToUse) {
          if (!projectIdToUse) {
            const { data: newProject, error: projectError } = await supabase
              .from("projects")
              .insert({
                user_id: user.id,
                name: deriveProjectName(message),
                status: "draft",
                mode: preferences ? "manual" : "ai_auto",
                preferences: preferences || null,
              })
              .select("id")
              .single();

            if (projectError || !newProject?.id) {
              throw projectError || new Error("Failed to create project");
            }

            projectIdToUse = newProject.id;
            createdProjectId = newProject.id;
          }

          const { data: newConv, error: conversationError } = await supabase
            .from("conversations")
            .insert({
              project_id: projectIdToUse,
              user_id: user.id,
            })
            .select("id")
            .single();

          if (conversationError || !newConv?.id) {
            throw conversationError || new Error("Failed to create conversation");
          }

          conversationIdToUse = newConv.id;
          createdConversationId = newConv.id;
        }

        fullResponse += firstChunk;
        const firstEvent = JSON.stringify({ type: "delta", content: firstChunk });
        controller.enqueue(encoder.encode(`data: ${firstEvent}\n\n`));

        for await (const chunk of streamGenerator) {
          fullResponse += chunk;

          const event = JSON.stringify({
            type: "delta",
            content: chunk,
          });

          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        }

        if (conversationIdToUse) {
          const { error: messagesError } = await supabase.from("messages").insert([
            {
              conversation_id: conversationIdToUse,
              role: "user",
              content: message,
              metadata: {},
            },
            {
              conversation_id: conversationIdToUse,
              role: "assistant",
              content:
                mode === "generate" || mode === "revise"
                  ? "Selesai menyusun PRD."
                  : fullResponse,
              metadata: { model: plan === "hengker" ? "gemini-pro" : "gemini-flash" },
            },
          ]);

          if (messagesError) throw messagesError;
        }

        if ((mode === "generate" || mode === "revise") && conversationIdToUse) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("project_id")
            .eq("id", conversationIdToUse)
            .single();

          if (conv?.project_id) {
            let nextVersion = 1;
            
            if (mode === "revise") {
              const { data: latestVersion } = await supabase
                .from("prd_versions")
                .select("version")
                .eq("project_id", conv.project_id)
                .order("version", { ascending: false })
                .limit(1)
                .single();
                
              if (latestVersion) {
                nextVersion = latestVersion.version + 1;
              }
            } else {
              // For new generation, we want a share token
              const shareToken = generateShareToken();
              await supabase
                .from("projects")
                .update({ share_token: shareToken })
                .eq("id", conv.project_id);
            }

            const { error: prdVersionError } = await supabase.from("prd_versions").insert({
              project_id: conv.project_id,
              version: nextVersion,
              content: fullResponse,
              change_summary: mode === "generate" ? "Initial PRD generation" : message.substring(0, 50) + "...",
            });

            if (prdVersionError) throw prdVersionError;

            const { error: projectUpdateError } = await supabase
              .from("projects")
              .update({
                status: "completed",
                updated_at: new Date().toISOString(),
              })
              .eq("id", conv.project_id);

            if (projectUpdateError) throw projectUpdateError;

            try {
              if (mode === "generate") {
                await incrementPrdCount(user.id);
              }
            } catch (err) {
              console.error("Failed to increment PRD count for user", user.id, err);
            }
          }
        }

        // Resolve projectId from conversation if not directly available
        let resolvedProjectId = projectIdToUse;
        if (!resolvedProjectId && conversationIdToUse) {
          const { data: convRecord } = await supabase
            .from("conversations")
            .select("project_id")
            .eq("id", conversationIdToUse)
            .single();
          resolvedProjectId = convRecord?.project_id;
        }

        const doneEvent = JSON.stringify({
          type: "done",
          conversationId: conversationIdToUse,
          projectId: resolvedProjectId || undefined,
        });

        controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
      } catch (error) {
        try {
          await rollbackStreamInserts({
            supabase,
            userId: user.id,
            createdConversationId,
            createdProjectId,
          });
        } catch (rollbackError) {
          console.error("Failed to roll back chat stream inserts:", rollbackError);
        }

        const errorEvent = JSON.stringify({
          type: "error",
          error: error instanceof Error ? error.message : "Unknown error occurred",
        });

        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
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
