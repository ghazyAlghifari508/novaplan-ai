import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamChat } from "@/lib/ai-client";
import { validateApiKey } from "@/app/actions/api-keys";
import { checkApiKeyRateLimit, recordApiKeyRequest } from "@/lib/api-rate-limit";
import { PRD_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateShareToken } from "@/lib/utils";
import { AI_MODELS_BY_PLAN } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required. Use Bearer token." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { userId, keyId, error: authError } = await validateApiKey(apiKey);
  if (authError || !userId) {
    return new Response(JSON.stringify({ error: authError || "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rateCheck = await checkApiKeyRateLimit(keyId);
  if (!rateCheck.allowed) {
    return new Response(JSON.stringify({
      error: "Rate limit exceeded. Try again later.",
      retryAfter: 60,
    }), {
      status: 429,
      headers: { "Content-Type": "application/json", "Retry-After": "60" },
    });
  }

  await recordApiKeyRequest(keyId);

  const body = await req.json();
  const { description, name, preferences } = body as {
    description: string;
    name?: string;
    preferences?: Record<string, unknown>;
  };

  if (!description?.trim()) {
    return new Response(JSON.stringify({ error: "description is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (description.length > 3000) {
    return new Response(JSON.stringify({ error: "description is too long (maximum 3000 characters)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (name && name.length > 100) {
    return new Response(JSON.stringify({ error: "name is too long (maximum 100 characters)" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .single();

  const plan = subscription?.plan || "free";

  const { data: project } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name: name?.trim() || "Untitled PRD (API)",
      status: "draft",
      mode: preferences ? "manual" : "ai_auto",
      preferences: preferences || null,
    })
    .select("id")
    .single();

  if (!project) {
    return new Response(JSON.stringify({ error: "Failed to create project" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: conversation } = await supabase
    .from("conversations")
    .insert({
      project_id: project.id,
      user_id: userId,
    })
    .select("id")
    .single();

  const messages = [
    { role: "system" as const, content: PRD_SYSTEM_PROMPT },
    { role: "user" as const, content: description },
  ];

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      let fullResponse = "";

      try {
        // Use best model available for user's plan (first in the list)
        const planModels = AI_MODELS_BY_PLAN[plan as keyof typeof AI_MODELS_BY_PLAN] ?? AI_MODELS_BY_PLAN.free;
        const model = planModels[0];

        for await (const chunk of streamChat(messages, model)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "delta", content: chunk })}\n\n`));
        }

        if (conversation) {
          await supabase.from("messages").insert([
            { conversation_id: conversation.id, role: "user", content: description, metadata: {} },
            { conversation_id: conversation.id, role: "assistant", content: fullResponse, metadata: { model } },
          ]);
        }

        const shareToken = generateShareToken();

        await supabase.from("prd_versions").insert({
          project_id: project.id,
          version: 1,
          content: fullResponse,
          change_summary: "API generation",
        });

        await supabase
          .from("projects")
          .update({
            status: "completed",
            share_token: shareToken,
            updated_at: new Date().toISOString(),
          })
          .eq("id", project.id);

        await supabase.rpc("increment_prd_used", { user_id_param: userId });

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "done",
          projectId: project.id,
          conversationId: conversation?.id,
        })}\n\n`));
      } catch (error) {
        console.error("[API v1/generate] Streaming Error:", error);

        // Attempt rollback if we created a project and conversation but failed mid-stream
        if (project?.id) {
          try {
            console.warn(`[API v1/generate] Rolling back project ${project.id} due to failure`);
            await supabase.from("projects").delete().eq("id", project.id);
          } catch (rollbackErr) {
            console.error("[API v1/generate] Rollback failed:", rollbackErr);
          }
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: "error",
          error: "Internal Server Error",
        })}\n\n`));
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