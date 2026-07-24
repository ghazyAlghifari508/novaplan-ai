export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

/**
 * GET /api/v1/projects/:id/tasks
 * List all tasks for a project, optionally filtered by status.
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
  const _rateCheck = await checkRateLimit(auth.userId, "free", "api_call");
  const _headers: Record<string, string> = {
    "X-RateLimit-Remaining": String(_rateCheck.remaining),
    "X-RateLimit-Reset": String(Math.ceil(Date.now() / 1000) + 60),
  };
  if (!_rateCheck.allowed) {
    _headers["Retry-After"] = "60";
    return NextResponse.json({ error: "Rate limited" }, { status: 429, headers: _headers });
  }

  const { id: projectId } = await params;

  if (!await verifyProjectOwnership(auth.userId, projectId)) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const url = new URL(req.url);
  const statusFilter = url.searchParams.get("status");

  try {
    const insforge = await createServerInsforge();

    // Fetch features for name mapping
    const { data: features } = await insforge.database
      .from("features")
      .select("id, name")
      .eq("project_id", projectId);

    const featureMap = new Map<string, string>();
    for (const f of features || []) {
      featureMap.set(f.id, f.name);
    }

    // Fetch tasks
    let tasksQuery = insforge.database
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });

    if (statusFilter) {
      tasksQuery = tasksQuery.eq("status", statusFilter);
    }

    const { data: tasks, error: tasksError } = await tasksQuery;
    if (tasksError) throw tasksError;

    // Fetch subtasks
    const { data: subtasks, error: subtasksError } = await insforge.database
      .from("subtasks")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });

    if (subtasksError) throw subtasksError;

    // Group subtasks by task_id
    const subtasksByTask = new Map<string, NonNullable<typeof subtasks>>();
    for (const sub of subtasks || []) {
      if (!subtasksByTask.has(sub.task_id)) {
        subtasksByTask.set(sub.task_id, []);
      }
      subtasksByTask.get(sub.task_id)!.push(sub);
    }

    const result = (tasks || []).map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      featureName: featureMap.get(t.feature_id) || "Umum",
      dependencies: Array.isArray(t.dependencies) ? t.dependencies : [],
      subtasks: (subtasksByTask.get(t.id) || []).map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
      })),
    }));

    // Record rate limit request (non-blocking)
    recordRequest(auth.userId, "api_call").catch(() => {});

    return NextResponse.json({ tasks: result }, { headers: _headers });
  } catch (error) {
    console.error("GET /api/v1/tasks error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
