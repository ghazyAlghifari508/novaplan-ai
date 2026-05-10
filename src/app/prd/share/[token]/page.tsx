import { createClient } from "@/lib/supabase/server";
import { PrdViewer } from "@/components/prd/prd-viewer";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function SharedPrdPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const supabase = await createClient();
  const { token } = await params;

  const { data: project } = await supabase
    .from("projects")
    .select("id, name, is_shared, share_token")
    .eq("share_token", token)
    .eq("is_shared", true)
    .single();

  if (!project) notFound();

  const { data: latestVersion } = await supabase
    .from("prd_versions")
    .select("content")
    .eq("project_id", project.id)
    .order("version", { ascending: false })
    .limit(1)
    .single();

  if (!latestVersion) notFound();

  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-border-subtle px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link href="/" className="font-schibsted text-xl font-semibold tracking-tight">
            NovaPlan
          </Link>
          <span className="rounded-full bg-light-gray-bg px-3 py-1 text-xs text-text-gray">
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