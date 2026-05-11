import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/app/actions/api-keys";
import { checkApiKeyRateLimit, recordApiKeyRequest } from "@/lib/api-rate-limit";

export async function GET(req: NextRequest) {
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
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20", 10), 50);
  const offset = (page - 1) * limit;

  const { data: projects, count, error } = await supabase
    .from("projects")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    data: projects,
    pagination: { page, limit, total: count, totalPages: Math.ceil((count || 0) / limit) },
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}