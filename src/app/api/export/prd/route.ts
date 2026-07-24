export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getLatestAcMarkdown } from "@/lib/services/ac-service";
import { getTaskTree } from "@/lib/services/task-service";
import { getSitemapTree } from "@/lib/services/sitemap-service";
import {
  formatPrdMarkdown,
  formatAcMarkdown,
  formatTasksJson,
  formatSitemapJson,
} from "@/lib/services/export-service";

/**
 * POST /api/export/prd
 * Return all project content (PRD, AC, tasks, sitemap) as formatted strings.
 * Used by client-side "Copy PRD" and "Prompt AI Agent" features.
 */
export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await req.json();
  if (!projectId) {
    return NextResponse.json({ error: "Project ID required" }, { status: 400 });
  }

  // Verify project ownership
  const { data: project } = await insforge.database
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Fetch all content in parallel
  const [prdContent, acMarkdown, taskTree, sitemapTree] = await Promise.all([
    getLatestPrdContent(insforge, projectId),
    getLatestAcMarkdown(insforge, projectId),
    getTaskTree(insforge, projectId),
    getSitemapTree(insforge, projectId),
  ]);

  return NextResponse.json({
    projectName: project.name,
    prd: prdContent ? formatPrdMarkdown(prdContent) : null,
    ac: acMarkdown ? formatAcMarkdown(acMarkdown) : null,
    tasks: formatTasksJson(taskTree),
    sitemap: formatSitemapJson(sitemapTree),
  });
}
