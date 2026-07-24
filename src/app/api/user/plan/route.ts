import { NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import type { Plan } from "@/types/database";

export async function GET() {
  let user: { id: string; email?: string } | null = null;
  try {
    const insforge = await createServerInsforge();
    const { data } = await insforge.auth.getCurrentUser();
    user = data?.user || null;
  } catch {
    // Auth check failed — server or network issue, not user's fault.
  }

  if (!user) {
    return NextResponse.json({ authenticated: false, plan: "free" });
  }

  try {
    const insforge = await createServerInsforge();
    const [subscriptionsResult, quotasResult] = await Promise.all([
      insforge.database
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
      insforge.database
        .from("quotas")
        .select("prd_used, prd_limit, revision_used, revision_limit")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1),
    ]);

    const subscription = subscriptionsResult.data?.[0];
    const plan = (subscription?.status === "active" ? subscription.plan : "free") as Plan;

    const quota = quotasResult.data?.[0] || null;
    const remaining =
      quota?.prd_limit === -1
        ? "unlimited"
        : typeof quota?.prd_limit === "number" && typeof quota?.prd_used === "number"
          ? Math.max(0, quota.prd_limit - quota.prd_used)
          : null;

    return NextResponse.json({ authenticated: true, plan, quota, remaining });
  } catch {
    // DB query failed but user IS authenticated — return default plan
    // instead of lying about auth status.
    return NextResponse.json({
      authenticated: true,
      plan: "free" as Plan,
      quota: null,
      remaining: null,
    });
  }
}
