import { redirect } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import type { Plan } from "@/types/database";
import { cache } from "react";

export const getUser = cache(async () => {
  const insforge = await createServerInsforge();
  const { data } = await insforge.auth.getCurrentUser();
  return data.user || null;
});

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export const getUserProfile = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const insforge = await createServerInsforge();
  const { data: profile } = await insforge.database
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
});

// Optimized: Fetch quota and plan together in single auth call
export const getUserPlanAndQuota = cache(async () => {
  const user = await getUser();
  if (!user) return { plan: "free" as Plan, quota: null };

  const insforge = await createServerInsforge();

  // Parallel fetch plan and quota
  const [subscriptionResult, quotaResult] = await Promise.all([
    insforge.database
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
    insforge.database
      .from("quotas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const subscription = subscriptionResult.data?.[0];
  const plan = (subscription?.status === "active" ? subscription.plan : "free") as Plan;
  const quota = quotaResult.data?.[0] || null;

  return { plan, quota };
});

// Keep these for backward compatibility but use optimized version internally
export const getUserQuota = cache(async () => {
  const { quota } = await getUserPlanAndQuota();
  return quota;
});

export const getUserPlan = cache(async (): Promise<Plan> => {
  const { plan } = await getUserPlanAndQuota();
  return plan;
});
