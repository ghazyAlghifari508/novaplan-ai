import { requireAuth, getUserProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { cache } from "react";

const getDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();

  const [projectsResult, quotaResult] = await Promise.all([
    supabase
      .from("projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("quotas")
      .select("prd_used, prd_limit, plan, reset_at")
      .eq("user_id", userId)
      .single(),
  ]);

  return {
    projects: projectsResult.data || [],
    quota: quotaResult.data,
  };
});

export default async function DashboardPage() {
  const user = await requireAuth();
  const profile = await getUserProfile();
  const { projects, quota } = await getDashboardData(user.id);

  return (
    <DashboardClient
      userEmail={user.email!}
      userName={profile?.full_name}
      projects={projects}
      quota={quota}
    />
  );
}