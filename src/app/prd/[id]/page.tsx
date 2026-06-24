import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth, getUser, getUserPlan, getUserQuota } from "@/lib/auth";
import { PrdDetail } from "@/components/prd/prd-detail";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const insforge = await createServerInsforge();
  const { id } = await params;
  // Use cached getUser() so this auth lookup is deduped with the page render's
  // requireAuth() (both run per navigation) instead of a separate round-trip.
  const user = await getUser();

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
  const { id } = await params;
  const insforge = await createServerInsforge();

  // Resolve auth first (cached — getUserPlan/getUserQuota reuse the same
  // getUser() promise, so this adds no extra round-trip). We need user.id
  // before the queries so we can scope `projects` to the owner. Without the
  // explicit user_id filter, RLS policy "projects_select_shared" (is_shared =
  // true) would leak other users' shared projects into the sidebar and allow
  // loading another user's shared project via /prd/[id].
  const user = await requireAuth();

  // Parallelize the remaining independent data fetches.
  const [plan, quota, project, versions, conversation, projects] = await Promise.all([
    getUserPlan(),
    getUserQuota(),
    insforge.database
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => data),
    insforge.database
      .from("prd_versions")
      .select("*")
      .eq("project_id", id)
      .order("version", { ascending: false })
      .then(({ data }) => data),
    insforge.database
      .from("conversations")
      .select("id")
      .eq("project_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => data),
    insforge.database
      .from("projects")
      .select("id, name, status, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .then(({ data }) => data),
  ]);

  if (!project) notFound();

  // Fetch messages if conversation exists (dependent query)
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
