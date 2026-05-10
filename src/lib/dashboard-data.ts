import { createClient } from "@/lib/supabase/server";
import { cache } from "react";

export const getDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();

  const [profileResult, quotasResult, projectsResult, subscriptionsResult] =
    await Promise.all([
      supabase.from("users").select("full_name, avatar_url, role, email").eq("id", userId).single(),
      supabase.from("quotas").select("prd_used, prd_limit, plan, reset_at").eq("user_id", userId).single(),
      supabase.from("projects").select("id, name, status, mode, updated_at, created_at").eq("user_id", userId).order("updated_at", { ascending: false }),
      supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", userId).single(),
    ]);

  return {
    profile: profileResult.data,
    quotas: quotasResult.data,
    projects: projectsResult.data || [],
    subscription: subscriptionsResult.data,
  };
});