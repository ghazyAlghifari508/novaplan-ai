export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";
import crypto from "crypto";

/**
 * POST /api/kanban/update-status
 * Updates status of a task or subtask.
 * Authenticates via Bearer Token matched against public.api_keys key_hash.
 */
export async function POST(req: NextRequest) {
  const insforge = await createServerInsforge();

  // 1. Authenticate via Bearer Token or body
  let apiKey = "";
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    apiKey = authHeader.substring(7).trim();
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!apiKey && body.apiKey) {
    apiKey = body.apiKey;
  }

  if (!apiKey) {
    return NextResponse.json({ error: "API Key required" }, { status: 401 });
  }

  // Hash the incoming key to match key_hash in DB
  const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");

  // Query api_keys to find matching user and validate key expiry
  const { data: keyRecord, error: keyError } = await insforge.database
    .from("api_keys")
    .select("id, user_id, scopes, expires_at")
    .eq("key_hash", hashedKey)
    .maybeSingle();

  if (keyError || !keyRecord) {
    return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });
  }

  // Check key expiration
  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    return NextResponse.json({ error: "API Key expired" }, { status: 401 });
  }

  // Check scopes (must contain write:task:status or similar)
  let scopes: string[] = [];
  if (Array.isArray(keyRecord.scopes)) {
    scopes = keyRecord.scopes;
  } else if (typeof keyRecord.scopes === "string") {
    try { scopes = JSON.parse(keyRecord.scopes); } catch { scopes = []; }
  }

  if (
    !scopes.includes("write:task:status") &&
    !scopes.includes("admin") &&
    !scopes.includes("*")
  ) {
    return NextResponse.json(
      { error: "Insufficient scopes for this action" },
      { status: 403 }
    );
  }

  const { projectId, taskType, taskId, status } = body;

  if (!projectId || !taskType || !taskId || !status) {
    return NextResponse.json(
      { error: "Missing required fields (projectId, taskType, taskId, status)" },
      { status: 400 }
    );
  }

  if (!["task", "subtask"].includes(taskType)) {
    return NextResponse.json(
      { error: "taskType must be 'task' or 'subtask'" },
      { status: 400 }
    );
  }

  if (!["pending", "in_progress", "completed", "failed"].includes(status)) {
    return NextResponse.json(
      { error: "Invalid status value" },
      { status: 400 }
    );
  }

  const tableName = taskType === "task" ? "tasks" : "subtasks";

  try {
    // Verify project belongs to user_id associated with this API key
    const { data: project } = await insforge.database
      .from("projects")
      .select("id")
      .eq("id", projectId)
      .eq("user_id", keyRecord.user_id)
      .maybeSingle();

    if (!project) {
      return NextResponse.json(
        { error: "Project not found or access denied" },
        { status: 404 }
      );
    }

    // Set started_at/completed_at timestamps depending on state
    const updateData: Record<string, any> = {
      status,
    };

    if (status === "in_progress") {
      updateData.started_at = new Date().toISOString();
    } else if (status === "completed" || status === "failed") {
      updateData.completed_at = new Date().toISOString();
    }

    // Perform the status update
    const { data: updatedRow, error: updateError } = await insforge.database
      .from(tableName)
      .update(updateData)
      .eq("id", taskId)
      .eq("project_id", projectId)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedRow) {
      return NextResponse.json(
        { error: `${taskType} not found in this project` },
        { status: 404 }
      );
    }

    // Update last_used_at timestamp on api_keys (non-blocking)
    Promise.resolve(
      insforge.database
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", keyRecord.id)
    ).catch(() => {});

    return NextResponse.json({ success: true, taskId, status });
  } catch (err: any) {
    console.error("update-status api error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update status" },
      { status: 500 }
    );
  }
}
