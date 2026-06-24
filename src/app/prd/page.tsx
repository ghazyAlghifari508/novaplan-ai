import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - NovaPlan",
};

export default async function PrdIndexPage() {
  const insforge = await createServerInsforge();

  // Resolve auth first so we can scope the sidebar query to the owner.
  // Without the explicit user_id filter, RLS policy "projects_select_shared"
  // (is_shared = true) would leak other users' shared projects into the list.
  const user = await requireAuth();

  // Parallelize the remaining queries (auth is cached, no extra round-trip).
  const [plan, quota, projects] = await Promise.all([
    getUserPlan(),
    getUserQuota(),
    insforge.database
      .from("projects")
      .select("id, name, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => data),
  ]);

  return (
    <PrdDetail
      projects={projects || []}
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
      user={user}
    />
  );
}
