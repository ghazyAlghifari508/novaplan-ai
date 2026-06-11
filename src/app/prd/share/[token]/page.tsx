import { createServerInsforge } from "@/lib/insforge/server";
import { PrdViewer } from "@/components/prd/prd-viewer";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SharedPrdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const insforge = await createServerInsforge();
  const { token } = await params;

  const { data: project } = await insforge.database
    .from("projects")
    .select("id, name, is_shared, share_token")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (!project) notFound();

  const { data: latestVersion } = await insforge.database
    .from("prd_versions")
    .select("content")
    .eq("project_id", project.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!latestVersion) notFound();

  return (
    <div className="min-h-screen bg-white dark:bg-[#1E1E1E]">
      <div className="border-b border-border-subtle dark:border-white/10 px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-schibsted text-xl font-semibold tracking-tight">
            NovaPlan
          </Link>
          <span className="rounded-full bg-light-gray-bg dark:bg-[#161616] px-3 py-1 text-xs text-text-gray dark:text-[#A0A0A0]">
            Shared View
          </span>
        </div>
      </div>

      <PrdViewer
        content={latestVersion.content}
        projectName={project.name}
      />
    </div>
  );
}