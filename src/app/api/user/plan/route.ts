import { NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import type { Plan } from "@/types/database";

export async function GET() {
  try {
    const insforge = await createServerInsforge();
    const { data: { user } } = await insforge.auth.getCurrentUser();

    if (!user) {
      return NextResponse.json({ authenticated: false, plan: "free" });
    }

    const { data: subscriptions } = await insforge.database
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const subscription = subscriptions?.[0];
    const plan = (subscription?.status === "active" ? subscription.plan : "free") as Plan;

    const { data: quotas } = await insforge.database
      .from("quotas")
      .select("prd_used, prd_limit, revision_used, revision_limit")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const quota = quotas?.[0] || null;
    const remaining =
      quota?.prd_limit === -1
        ? "unlimited"
        : typeof quota?.prd_limit === "number" && typeof quota?.prd_used === "number"
          ? Math.max(0, quota.prd_limit - quota.prd_used)
          : null;

    return NextResponse.json({
      authenticated: true,
      plan,
      quota,
      remaining,
    });
  } catch {
    return NextResponse.json({ authenticated: false, plan: "free" });
  }
}
