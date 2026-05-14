import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const supabase = await createClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("name")
    .eq("id", id)
    .single();

  return {
    title: project?.name || "PRD",
  };
}

export default async function PrdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const plan = await getUserPlan();
  const quota = await getUserQuota();
  const supabase = await createClient();
  const { id } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: versions } = await supabase
    .from("prd_versions")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false });

  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const latestVersion = versions?.[0];

  return (
    <PrdDetail
      projectId={id}
      projectName={project.name}
      latestVersion={latestVersion}
      allVersions={versions || []}
      conversationId={conversation?.id}
      projects={projects || []}
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
    />
  );
}