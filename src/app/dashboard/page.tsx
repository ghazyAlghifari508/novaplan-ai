import { requireAuth, getUserProfile, getUserPlan } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { cache } from "react";

const getDashboardData = cache(async (userId: string) => {
  const supabase = await createClient();

  const [projectsResult, quotaResult, versionsResult] = await Promise.all([
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
    supabase
      .from("prd_versions")
      .select("project_id, projects!inner(name)")
      .order("version", { ascending: false }),
  ]);

  const projects = projectsResult.data || [];
  const versions = versionsResult.data || [];

  const versionCounts = new Map<string, { name: string; count: number; id: string }>();
  let totalVersions = 0;

  for (const v of versions) {
    const proj = (v as unknown as { project_id: string; projects: { name: string } }).projects;
    const projectId = v.project_id;
    totalVersions++;

    const existing = versionCounts.get(projectId);
    if (existing) {
      existing.count++;
    } else {
      versionCounts.set(projectId, { name: proj?.name || "Unknown", count: 1, id: projectId });
    }
  }

  let mostRevised: { name: string; versions: number; id: string } | null = null;
  for (const [, info] of versionCounts) {
    if (!mostRevised || info.count > mostRevised.versions) {
      mostRevised = { name: info.name, versions: info.count, id: info.id };
    }
  }

  return {
    projects,
    quota: quotaResult.data,
    analytics: projects.length > 0 ? {
      totalPrds: projects.length,
      totalVersions,
      avgVersionsPerPrd: projects.length > 0 ? totalVersions / projects.length : 0,
      mostRevisedPrd: mostRevised,
      completedCount: projects.filter((p) => p.status === "completed").length,
      draftCount: projects.filter((p) => p.status === "draft").length,
    } : undefined,
  };
});

export default async function DashboardPage() {
  const user = await requireAuth();
  const profile = await getUserProfile();
  const plan = await getUserPlan();
  const { projects, quota, analytics } = await getDashboardData(user.id);

  return (
    <DashboardClient
      userEmail={user.email!}
      userName={profile?.full_name}
      projects={projects}
      quota={quota}
      plan={plan}
      analytics={analytics}
    />
  );
}