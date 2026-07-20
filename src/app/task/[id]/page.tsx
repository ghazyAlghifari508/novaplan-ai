import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";
import { getTaskTree } from "@/lib/services/task-service";
import { getLatestAcContent } from "@/lib/services/ac-service";
import { getSitemapTree } from "@/lib/services/sitemap-service";
import { TaskDetail } from "@/components/task/task-detail";
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

  return { title: project ? `${project.name} - Task Board` : "Task Board" };
}

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const insforge = await createServerInsforge();
  const { id } = await params;

  const user = await requireAuth();

  const [project, acContent, taskTree, sitemapTree] = await Promise.all([
    insforge.database
      .from("projects")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => data),
    getLatestAcContent(insforge, id).catch(() => null),
    getTaskTree(insforge, id).catch(() => null),
    getSitemapTree(insforge, id).catch(() => null),
  ]);

  if (!project) notFound();

  return (
    <TaskDetail
      projectId={id}
      projectName={project.name}
      taskTree={taskTree}
      hasAc={Boolean(acContent)}
      initialSitemapTree={sitemapTree}
    />
  );
}
