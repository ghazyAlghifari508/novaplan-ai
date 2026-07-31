import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimits } from "@/db/schema";
import { RATE_LIMITS, RATE_LIMIT_WINDOW_MS } from "@/lib/constants";

export type RateLimitAction = "ai_generate" | "ai_revise" | "api_call";

export async function checkRateLimit(
  userId: string,
  plan: string,
  action: RateLimitAction,
): Promise<{ allowed: boolean; remaining: number }> {
  const limit =
    action === "api_call"
      ? RATE_LIMITS.general
      : RATE_LIMITS[plan as keyof typeof RATE_LIMITS] || RATE_LIMITS.free;

  const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

  try {
    const rows = await db
      .select({ count: rateLimits.count })
      .from(rateLimits)
      .where(and(eq(rateLimits.userId, userId), eq(rateLimits.action, action), gte(rateLimits.windowStart, windowStart)));

    const used = rows.reduce((sum, r) => sum + (r.count ?? 0), 0);
    const remaining = Math.max(0, limit - used);
    return { allowed: used < limit, remaining };
  } catch (error) {
    // Fail closed: DB down → don't let users bypass rate limits.
    console.error("Rate limit check error:", error);
    return { allowed: false, remaining: 0 };
  }
}

export async function recordRequest(userId: string, action: RateLimitAction): Promise<void> {
  await db.insert(rateLimits).values({
    id: crypto.randomUUID(),
    userId,
    action,
    windowStart: new Date(),
    count: 1,
  });
}
