import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/openrouter";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { checkQuota, incrementPrdCount } from "@/lib/quota";
import { generateShareToken } from "@/lib/utils";
import { AI_MODELS } from "@/lib/constants";

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
          error: "Quota habis",
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

  if (!conversationIdToUse) {
    let projectIdToUse = projectId;

    if (!projectIdToUse) {
      const { data: newProject } = await supabase
        .from("projects")
        .insert({
          user_id: user.id,
          name: "Untitled PRD",
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
        const modelName = plan === "hengker" ? AI_MODELS.premium : undefined;
        for await (const chunk of streamChat(fullMessages, modelName)) {
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
              content: fullResponse,
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

        const doneEvent = JSON.stringify({
          type: "done",
          conversationId: conversationId,
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