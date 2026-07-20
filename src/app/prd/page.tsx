import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace - NovaPlan",
};

export default async function PrdIndexPage() {
  // Resolve auth so the route is protected; PRD-03 unmounted the project
  // sidebar so no projects fetch is needed here. Restore it when a
  // project-history UI lands.
  await requireAuth();

  const [plan, quota] = await Promise.all([getUserPlan(), getUserQuota()]);

  return (
    <PrdDetail
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
    />
  );
}
