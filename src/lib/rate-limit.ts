import { createServerInsforge } from "@/lib/insforge/server";
import { RATE_LIMITS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export type RateLimitAction = "ai_generate" | "ai_revise" | "api_call";

export async function checkRateLimit(
  userId: string,
  plan: string,
  action: RateLimitAction,
): Promise<{ allowed: boolean; remaining: number }> {
  const insforge = await createServerInsforge();

  const limit =
    action === "api_call"
      ? RATE_LIMITS.general
      : RATE_LIMITS[plan as keyof typeof RATE_LIMITS] || RATE_LIMITS.free;

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();

  const { count, error } = await insforge.database
    .from("rate_limits")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("window_start", windowStart);

  if (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true, remaining: limit };
  }

  const remaining = Math.max(0, limit - (count || 0));

  return {
    allowed: (count || 0) < limit,
    remaining,
  };
}

export async function recordRequest(
  userId: string,
  action: RateLimitAction,
): Promise<void> {
  const insforge = await createServerInsforge();

  await insforge.database.from("rate_limits").insert([{
    user_id: userId,
    action,
    request_count: 1,
    window_start: new Date().toISOString(),
  }]);
}