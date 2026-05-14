import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - NovaPlan",
};

export default async function PrdIndexPage() {
  const user = await requireAuth();
  const plan = await getUserPlan();
  const quota = await getUserQuota();
  const supabase = await createClient();

  // Fetch all user projects for the history sidebar
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <PrdDetail
      projects={projects || []}
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
    />
  );
}
