export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getLatestAcContent } from "@/lib/services/ac-service";
import { getSitemapTree } from "@/lib/services/sitemap-service";

/**
 * GET /api/v1/projects/:id
 * Return full project data including PRD, AC, features, tasks, sitemap.
 * Auth: Bearer token (api_keys table)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await apiKeyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasScope(auth, "read:project")) {
    return NextResponse.json({ error: "Insufficient scopes" }, { status: 403 });
  }

  // Rate limit: 30 req/min per API key
  const rateCheck = await checkRateLimit(auth.userId, "free", "api_call");
  const headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 60),
  };
  if (!rateCheck.allowed) {
    headers["Retry-After"] = "60";
    return NextResponse.json({ error: "Terlalu banyak permintaan" }, { status: 429, headers });
  }

  const { id: projectId } = await params;

  if (!await verifyProjectOwnership(auth.userId, projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    const insforge = await createServerInsforge();

    const { data: project } = await insforge.database
      .from("projects")
      .select("id, name, step, ac_status, task_status, sitemap_status")
      .eq("id", projectId)
      .maybeSingle();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Fetch all content in parallel
    const [prdContent, acContent, sitemapTree, featuresRes, tasksRes, subtasksRes] = await Promise.all([
      getLatestPrdContent(insforge, projectId),
      getLatestAcContent(insforge, projectId),
      getSitemapTree(insforge, projectId),
      insforge.database
        .from("features")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true }),
      insforge.database
        .from("tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true }),
      insforge.database
        .from("subtasks")
        .select("*")
        .eq("project_id", projectId)
        .order("order", { ascending: true }),
    ]);

    // Get PRD version info
    const { data: prdVersion } = await insforge.database
      .from("prd_versions")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Get AC version info
    const { data: acVersion } = await insforge.database
      .from("ac_versions")
      .select("version")
      .eq("project_id", projectId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Record rate limit request (non-blocking)
    recordRequest(auth.userId, "api_call").catch(() => {});

    return NextResponse.json({
      id: project.id,
      name: project.name,
      step: project.step,
      prd: prdContent ? {
        content: prdContent,
        version: prdVersion?.version || 1,
      } : null,
      ac: acContent ? {
        content: acContent,
        version: acVersion?.version || 1,
      } : null,
      features: featuresRes.data || [],
      tasks: tasksRes.data || [],
      subtasks: subtasksRes.data || [],
      sitemap: sitemapTree?.pages || [],
    }, { headers: { ...headers } });

  } catch (error) {
    console.error("GET /api/v1/projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
