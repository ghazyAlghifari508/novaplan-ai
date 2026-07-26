import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth, getUserPlan } from "@/lib/auth";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getAcVersions } from "@/lib/services/ac-service";
import { AcDetail } from "@/components/ac/ac-detail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const insforge = await createServerInsforge();
  const { id } = await params;

  const user = await requireAuth();

  const { data: project } = await insforge.database
    .from("projects")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    title: project ? `${project.name} - Acceptance Criteria` : "Acceptance Criteria",
  };
}

export default async function AcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const insforge = await createServerInsforge();
  const { id } = await params;

  const user = await requireAuth();
  const [plan, project, prdContent, acVersions] = await Promise.all([
    getUserPlan(),
    insforge.database
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data),
    getLatestPrdContent(insforge, id),
    getAcVersions(insforge, id),
  ]);

  if (!project) notFound();

  const latestAcVersion = acVersions[0];

  return (
    <AcDetail
      projectId={id}
      projectName={project.name}
      latestAcVersion={latestAcVersion}
      latestPrdContent={prdContent ?? undefined}
      plan={plan}
    />
  );
}