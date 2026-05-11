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

  const latestVersion = versions?.[0];

  if (!latestVersion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="font-fustat text-2xl font-bold">{project.name}</h1>
          <p className="mt-4 text-text-gray">
            Belum ada konten PRD. Mulai chat di dashboard.
          </p>
          <a
            href="/dashboard/chat"
            className="mt-6 inline-flex rounded-lg bg-primary-black px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-text-gray"
          >
            Mulai Chat
          </a>
        </div>
      </div>
    );
  }

  return (
    <PrdDetail
      projectId={id}
      projectName={project.name}
      latestVersion={latestVersion}
      allVersions={versions}
      conversationId={conversation?.id}
      plan={plan}
      revisionLimit={quota?.revision_limit ?? undefined}
    />
  );
}