import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/openrouter";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import { generateShareToken } from "@/lib/utils";
import { AI_MODELS, AI_MODEL_CHAIN } from "@/lib/constants";

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
          error: "Limit pembuatan PRD kamu sudah tercapai. Silakan upgrade ke paket Hengker untuk akses tanpa batas, atau tunggu reset kuota bulan depan.",
          quota: { used: quotaCheck.used, limit: quotaCheck.limit },
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  await recordRequest(user.id, "ai_generate");

  let conversationIdToUse = conversationId;
  let projectIdToUse = projectId;

  if (!conversationIdToUse) {

    if (!projectIdToUse) {
      let projectName = "Untitled PRD";
      if (message) {
        let cleanMsg = message.replace(/Generate PRD lengkap berdasarkan informasi berikut:\s*/gi, "");
        cleanMsg = cleanMsg.replace(/\s*Gunakan section markers sesuai standar./gi, "");
        cleanMsg = cleanMsg.replace(/buatkan gw prd untuk membuat|tolong buatkan prd untuk|buatkan prd untuk|buatkan prd|bikin prd/gi, "");
        cleanMsg = cleanMsg.replace(/aplikasi|website|platform|sistem/gi, ""); // Optional: strip common words to make it tighter
        cleanMsg = cleanMsg.trim();
        
        projectName = cleanMsg.split(" ").slice(0, 6).join(" ");
        if (cleanMsg.split(" ").length > 6) projectName += "...";
        projectName = projectName.charAt(0).toUpperCase() + projectName.slice(1);
        if (!projectName || projectName.length < 2) projectName = "Untitled PRD";
      }

      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: projectName,
          status: "draft",
          mode: preferences ? "manual" : "ai_auto",
          preferences: preferences || null,
        })
        .select("id")
        .single();

      projectIdToUse = newProject?.id;
    }

    if (projectIdToUse) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          project_id: projectIdToUse,
          user_id: user.id,
        })
        .select("id")
        .single();

      conversationIdToUse = newConv?.id;
    }
  }

  let conversationHistory: Array<{ role: "system" | "user" | "assistant"; content: string }> = [];

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

  const fullMessages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: PRD_SYSTEM_PROMPT },
    ...conversationHistory,
    { role: "user" as const, content: message },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";
      const conversationId = conversationIdToUse;

      try {
        const modelsToTry = plan === "hengker"
          ? [AI_MODELS.premium, ...AI_MODEL_CHAIN]
          : [...AI_MODEL_CHAIN];
        
        // Try each model in sequence until one works
        let streamGenerator: AsyncGenerator<string, void, undefined> | null = null;
        let lastError = "";
        
        for (const model of modelsToTry) {
          try {
            const gen = streamChat(fullMessages, model);
            // Test the generator by getting the first chunk
            const first = await gen.next();
            
            // If the stream ends immediately without yielding anything, it's a silent failure
            // OpenRouter sometimes returns 200 OK but an empty stream or a JSON error
            if (first.done) {
              throw new Error(`Model ${model} mengembalikan respons kosong atau error tersembunyi.`);
            }

            if (typeof first.value === "string") {
              fullResponse += first.value;
              const event = JSON.stringify({ type: "delta", content: first.value });
              controller.enqueue(encoder.encode(`data: ${event}\n\n`));
            }
            
            streamGenerator = gen;
            break; // Success, use this model
          } catch (e) {
            lastError = e instanceof Error ? e.message : String(e);
            continue; // Try next model
          }
        }

        if (!streamGenerator) {
          throw new Error(`Semua model AI sedang tidak tersedia. Coba lagi dalam beberapa menit. (${lastError})`);
        }

        for await (const chunk of streamGenerator) {
          fullResponse += chunk;

          const event = JSON.stringify({
            type: "delta",
            content: chunk,
          });

          controller.enqueue(encoder.encode(`data: ${event}\n\n`));
        }

        if (conversationId) {
          await supabase.from("messages").insert([
            {
              conversation_id: conversationId,
              role: "user",
              content: message,
              metadata: {},
            },
            {
              conversation_id: conversationId,
              role: "assistant",
              content: mode === "generate" || mode === "revise" ? "Selesai menyusun PRD." : fullResponse,
              metadata: { model: plan === "hengker" ? "gemini-pro" : "gemini-flash" },
            },
          ]);
        }

        if (mode === "generate" && conversationId) {
          const { data: conv } = await supabase
            .from("conversations")
            .select("project_id")
            .eq("id", conversationId)
            .single();

          if (conv?.project_id) {
            const shareToken = generateShareToken();

            await supabase.from("prd_versions").insert({
              project_id: conv.project_id,
              version: 1,
              content: fullResponse,
              change_summary: "Initial PRD generation",
            });

            await supabase
              .from("projects")
              .update({
                status: "completed",
                share_token: shareToken,
                updated_at: new Date().toISOString(),
              })
              .eq("id", conv.project_id);

            await incrementPrdCount(user.id);
          }
        }

        // Resolve projectId from conversation if not directly available
        let resolvedProjectId = projectIdToUse;
        if (!resolvedProjectId && conversationId) {
          const { data: convRecord } = await supabase
            .from("conversations")
            .select("project_id")
            .eq("id", conversationId)
            .single();
          resolvedProjectId = convRecord?.project_id;
        }

        const doneEvent = JSON.stringify({
          type: "done",
          conversationId: conversationId,
          projectId: resolvedProjectId || undefined,
        });

        controller.enqueue(encoder.encode(`data: ${doneEvent}\n\n`));
      } catch (error) {
        const errorEvent = JSON.stringify({
          type: "error",
          error:
            error instanceof Error
              ? error.message
              : "Unknown error occurred",
        });

        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
        controller.close();
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