import { createClient } from "@/lib/supabase/server";

const API_KEY_RATE_LIMIT = 60;
const API_KEY_WINDOW_MS = 60_000;

export async function checkApiKeyRateLimit(
  apiKeyId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createClient();
  const windowStart = new Date(Date.now() - API_KEY_WINDOW_MS).toISOString();

  const { count } = await supabase
    .from("api_key_rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("api_key_id", apiKeyId)
    .gte("window_start", windowStart);

  const remaining = Math.max(0, API_KEY_RATE_LIMIT - (count || 0));

  return {
    allowed: (count || 0) < API_KEY_RATE_LIMIT,
    remaining,
  };
}

export async function recordApiKeyRequest(apiKeyId: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("api_key_rate_limits").insert({
    api_key_id: apiKeyId,
    request_count: 1,
    window_start: new Date().toISOString(),
  });
}