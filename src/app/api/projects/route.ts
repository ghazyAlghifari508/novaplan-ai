export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import { requireAuth } from "@/lib/auth";
import { deriveProjectName } from "@/lib/services/prd-service";

/**
 * POST /api/projects
 * Quick-create a project (used by the "Biarkan AI Memilih" flow).
 * Returns the new project ID so the client can redirect immediately.
 */
export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const insforge = await createServerInsforge();
  const body = await req.json();
  const { message } = body;

  if (!message || typeof message !== "string" || message.length < 3) {
    return NextResponse.json({ error: "Prompt harus diisi minimal 3 karakter" }, { status: 400 });
  }

  const projectName = deriveProjectName(message);

  const { data: project, error } = await insforge.database
    .from("projects")
    .insert([{
      user_id: user.id,
      name: projectName,
      status: "draft",
      mode: "ai_auto",
    }])
    .select("id, name")
    .maybeSingle();

  if (error || !project) {
    console.error("Create project error:", error);
    return NextResponse.json({ error: "Gagal membuat project" }, { status: 500 });
  }

  return NextResponse.json({ id: project.id, name: project.name });
}
