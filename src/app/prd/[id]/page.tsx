import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const insforge = await createServerInsforge();
  const { id } = await params;
  const { data: { user } } = await insforge.auth.getCurrentUser();

  if (!user) {
    return { title: "PRD" };
  }

  const { data: project } = await insforge.database
    .from("projects")
    .select("name")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    title: project?.name || "PRD",
  };
}

export default async function PrdPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const plan = await getUserPlan();
  const quota = await getUserQuota();
  const insforge = await createServerInsforge();
  const { id } = await params;

  const { data: project } = await insforge.database
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!project) notFound();

  const { data: versions } = await insforge.database
    .from("prd_versions")
    .select("*")
    .eq("project_id", id)
    .order("version", { ascending: false });

  const { data: conversation } = await insforge.database
    .from("conversations")
    .select("id")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let initialMessages: Array<any> = [];
  if (conversation?.id) {
    const { data: msgs } = await insforge.database
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(50);
      
    if (msgs) initialMessages = msgs;
  }

  const { data: projects } = await insforge.database
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
      initialMessages={initialMessages}
      user={user}
    />
  );
}
