import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth, getUserPlan, getUserQuota } from "@/lib/auth";
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
  const [plan, quota, project, prdContent, acVersions, conversation] = await Promise.all([
    getUserPlan(),
    getUserQuota(),
    insforge.database
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data),
    getLatestPrdContent(insforge, id),
    getAcVersions(insforge, id),
    insforge.database
      .from("conversations")
      .select("id")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => data),
  ]);

  if (!project) notFound();

  // Fetch messages if conversation exists
  let initialMessages: Array<{ id: string; role: string; content: string; created_at: string }> = [];
  if (conversation?.id) {
    const { data: msgs } = await insforge.database
      .from("messages")
      .select("id, role, content, created_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (msgs) initialMessages = msgs;
  }

  const latestAcVersion = acVersions[0];

  return (
    <AcDetail
      projectId={id}
      projectName={project.name}
      latestAcVersion={latestAcVersion}
      allAcVersions={acVersions}
      latestPrdContent={prdContent ?? undefined}
      conversationId={conversation?.id}
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
      initialMessages={initialMessages}
    />
  );
}
