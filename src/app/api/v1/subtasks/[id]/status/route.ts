export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

const VALID_STATUSES = ["in_progress", "completed", "failed"];

/**
 * POST /api/v1/subtasks/:id/status
 * Update subtask status. Used by MCP/CLI agents.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await apiKeyAuth(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!hasScope(auth, "write:subtask:status")) {
    return NextResponse.json({ error: "Insufficient scopes" }, { status: 403 });
  }

  // Rate limit: 30 req/min per API key
  const _rateCheck = await checkRateLimit(auth.userId, "free", "api_call");
  const _headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(_rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 60),
  };
  if (!_rateCheck.allowed) {
    _headers["Retry-After"] = "60";
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: _headers });
  }

  const { id: subtaskId } = await params;
  const body = await req.json();
  const { status, message } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const insforge = await createServerInsforge();

    const { data: subtask } = await insforge.database
      .from("subtasks")
      .select("id, project_id")
      .eq("id", subtaskId)
      .maybeSingle();

    if (!subtask || !await verifyProjectOwnership(auth.userId, subtask.project_id)) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { status };
    if (status === "in_progress") {
      updateData.started_at = new Date().toISOString();
    } else if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    const { error: updateError } = await insforge.database
      .from("subtasks")
      .update(updateData)
      .eq("id", subtaskId);

    if (updateError) throw updateError;

    // Record rate limit request (non-blocking)
    recordRequest(auth.userId, "api_call").catch(() => {});

    return NextResponse.json({
      id: subtaskId,
      status,
      message,
      updatedAt: new Date().toISOString(),
    }, { headers: _headers });
  } catch (error) {
    console.error("POST /api/v1/subtasks/status error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
