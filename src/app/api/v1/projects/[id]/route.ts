import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/app/actions/api-keys";
import { checkApiKeyRateLimit, recordApiKeyRequest } from "@/lib/api-rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "API key required" }), {
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

  const supabase = await createClient();
  const { id } = await params;

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (projectError || !project) {
    return new Response(JSON.stringify({ error: "Project not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data: versions } = await supabase
    .from("prd_versions")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false });

  return new Response(JSON.stringify({
    data: { ...project, versions: versions || [] },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}