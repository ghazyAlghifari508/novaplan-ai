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

export const getUserQuota = cache(async () => {
  const user = await getUser();
  if (!user) return null;

  const insforge = await createServerInsforge();
  const { data: quotas } = await insforge.database
    .from("quotas")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  return quotas?.[0] || null;
});

export const getUserPlan = cache(async (): Promise<Plan> => {
  const user = await getUser();
  if (!user) return "free";

  const insforge = await createServerInsforge();
  const { data: subscriptions } = await insforge.database
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);

  return (subscriptions?.[0]?.plan as Plan) || "free";
});
