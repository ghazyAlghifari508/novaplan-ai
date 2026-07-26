export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { saveAcVersion } from "@/lib/services/ac-service";
import { sanitizeErrorForClient } from "@/lib/services/error-sanitizer";

/**
 * POST /api/ac/save
 * Client recovery endpoint (PRD US-2): saves AC content already rendered on the
 * client when the SSE generate route's automatic save failed after all retries.
 * No AI call — plain insert via the same saveAcVersion (with its own retry).
 */
export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();
  const { data: { user } } = await insforge.auth.getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let projectId: string;
  let content: string;
  try {
    const body = await req.json();
    projectId = body?.projectId;
    content = body?.content;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!projectId || !content) {
    return NextResponse.json({ error: "projectId and content required" }, { status: 400 });
  }

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
    const { acVersionId, version } = await saveAcVersion(
      insforge,
      projectId,
      content,
      "Retry Simpan (recovery)",
      "generate",
    );
    return NextResponse.json({ acVersionId, version });
  } catch (err) {
    console.error("ac/save recovery failed:", err);
    return NextResponse.json({ error: sanitizeErrorForClient(err, "ac") }, { status: 500 });
  }
}
