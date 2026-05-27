import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/openrouter";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import { generateShareToken } from "@/lib/utils";
import { AI_MODELS, AI_MODEL_CHAIN } from "@/lib/constants";

function deriveProjectName(message: string) {
  let cleanMsg = message.replace(
    /Generate PRD lengkap berdasarkan informasi berikut:\s*/gi,
    "",
  );
  cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");
  cleanMsg = cleanMsg.replace(
    /buatkan gw prd untuk membuat|tolong buatkan prd untuk|buatkan prd untuk|buatkan prd|bikin prd/gi,
    "",
  );
  cleanMsg = cleanMsg.replace(/\b(?:aplikasi|website|platform|sistem)\b/gi, "");
  cleanMsg = cleanMsg.replace(/\s+/g, " ").trim();

  if (cleanMsg.length < 3) return "Untitled PRD";

  const words = cleanMsg.split(" ");
  let projectName = words.slice(0, 6).join(" ");
  if (words.length > 6) projectName += "...";
  projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);

  return projectName.trim().length < 3 ? "Untitled PRD" : projectName;
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

  const plan = subscription?.plan || "free";

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

  const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> =
    [
      { role: "system", content: PRD_SYSTEM_PROMPT },
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
        const modelsToTry =
          plan === "hengker"
            ? [AI_MODELS.premium, ...AI_MODEL_CHAIN]
            : [...AI_MODEL_CHAIN];

        // Try each model in sequence until one works
        let streamGenerator: AsyncGenerator<string, void, undefined> | null = null;
        let lastError = "";
        let firstChunk = "";

        for (const model of modelsToTry) {
          const abortController = new AbortController();
          const gen = streamChat(fullMessages, model, abortController.signal);
          activeAbortController = abortController;
          activeStreamGenerator = gen;

          try {
            // Test the generator by getting the first chunk
            const first = await gen.next();

            // If the stream ends immediately without yielding anything, it's a silent failure
            // OpenRouter sometimes returns 200 OK but an empty stream or a JSON error
            if (first.done) {
              throw new Error(
                `Model ${model} mengembalikan respons kosong atau error tersembunyi.`,
              );
            }

            if (typeof first.value !== "string" || !first.value) {
              throw new Error(`Model ${model} tidak menghasilkan konten.`);
            }

            firstChunk = first.value;
            streamGenerator = gen;
            break; // Success, use this model
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            abortController.abort();
            await gen.return().catch(() => {});
            continue; // Try next model
          }
        }

        if (!streamGenerator) {
          throw new Error(
            `Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`,
          );
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

        if (mode === "generate" && conversationIdToUse) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("project_id")
            .eq("id", conversationIdToUse)
            .single();

          if (conv?.project_id) {
            const shareToken = generateShareToken();

            const { error: prdVersionError } = await supabase.from("prd_versions").insert({
              project_id: conv.project_id,
              version: 1,
              content: fullResponse,
              change_summary: "Initial PRD generation",
            });

            if (prdVersionError) throw prdVersionError;

            const { error: projectUpdateError } = await supabase
              .from("projects")
              .update({
                status: "completed",
                share_token: shareToken,
                updated_at: new Date().toISOString(),
              })
              .eq("id", conv.project_id);

            if (projectUpdateError) throw projectUpdateError;

            try {
              await incrementPrdCount(user.id);
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
