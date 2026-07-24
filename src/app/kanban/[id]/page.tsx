import { notFound } from "next/navigation";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";
import { KanbanBoard } from "@/components/kanban/kanban-board";
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

  return { title: project ? `${project.name} - Kanban Board` : "Kanban Board" };
}

export default async function KanbanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const insforge = await createServerInsforge();
  const { id } = await params;
  const user = await requireAuth();

  const { data: project } = await insforge.database
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    notFound();
  }

  return <KanbanBoard projectId={id} projectName={project.name} />;
}
