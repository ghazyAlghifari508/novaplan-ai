export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { getSitemapTree } from "@/lib/services/sitemap-service";

/**
 * GET /api/sitemap/[projectId]
 * Return the saved sitemap page tree for a project.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;

  const { data: project } = await insforge.database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const tree = await getSitemapTree(insforge, projectId);
    return NextResponse.json({ sitemapTree: tree ?? { pages: [] } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("GET sitemap error:", msg);
    return NextResponse.json({ error: "Failed to load sitemap" }, { status: 500 });
  }
}
