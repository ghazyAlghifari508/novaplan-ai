export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getLatestPrdContent } from "@/lib/services/prd-service";
import { getLatestAcMarkdown } from "@/lib/services/ac-service";
import { getTaskTree } from "@/lib/services/task-service";
import { getSitemapTree } from "@/lib/services/sitemap-service";
import {
  formatPrdMarkdown,
  formatAcMarkdown,
  formatTasksJson,
  formatSitemapJson,
  generateZipBuffer,
} from "@/lib/services/export-service";

/**
 * POST /api/export/zip
 * Generate and download ZIP with all project artifacts.
 * Rate limited: 5 downloads/minute per user.
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

  // Rate limit — reuse existing checkRateLimit
  const { data: subscription } = await insforge.database
    .from("subscriptions")
    .select("plan")
    .eq("user_id", user.id)
    .maybeSingle();

  const rateCheck = await checkRateLimit(
    user.id,
    subscription?.plan || "free",
    "api_call",
  );
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests", retryAfter: 60 },
      { status: 429, headers: { "Retry-After": "60" } },
    );
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

  try {
    // Fetch all content in parallel
    const [prdContent, acMarkdown, taskTree, sitemapTree] = await Promise.all([
      getLatestPrdContent(insforge, projectId),
      getLatestAcMarkdown(insforge, projectId),
      getTaskTree(insforge, projectId),
      getSitemapTree(insforge, projectId),
    ]);

    const zipBuffer = await generateZipBuffer({
      prd: prdContent ? formatPrdMarkdown(prdContent) : undefined,
      ac: acMarkdown ? formatAcMarkdown(acMarkdown) : undefined,
      tasks: formatTasksJson(taskTree),
      sitemap: formatSitemapJson(sitemapTree),
    });

    // Sanitize project name for filename
    const safeName = (project.name || "project")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .toLowerCase();

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="novaplan-${safeName}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("ZIP generation error:", error);
    return NextResponse.json(
      { error: "Gagal membuat ZIP. Coba lagi." },
      { status: 500 },
    );
  }
}
