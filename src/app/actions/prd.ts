"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";

export async function renamePrd(projectId: string, formData: FormData) {
  const user = await requireAuth();
  const name = formData.get("name") as string;

  if (!name.trim()) return;

  const insforge = await createServerInsforge();
  await insforge.database
    .from("projects")
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq("id", projectId)
    .eq("user_id", user.id);

  revalidatePath(`/prd/${projectId}`);
}

export async function duplicatePrd(projectId: string) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();

  const { data: project } = await insforge.database
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) return;

  const { data: newProject } = await insforge.database
    .from("projects")
    .insert([{
      user_id: user.id,
      name: `${project.name} (Copy)`,
      status: "draft",
      mode: project.mode,
      preferences: project.preferences,
    }])
    .select("id")
    .single();

  if (!newProject) return;

  const { data: latestVersion } = await insforge.database
    .from("prd_versions")
    .select("content")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (latestVersion) {
    await insforge.database.from("prd_versions").insert([{
      project_id: newProject.id,
      version: 1,
      content: latestVersion.content,
      change_summary: "Duplicated PRD",
    }]);
  }

  revalidatePath("/");
  redirect(`/prd/${newProject.id}`);
}