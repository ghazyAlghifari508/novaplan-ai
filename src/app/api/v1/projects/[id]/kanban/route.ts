export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { apiKeyAuth, hasScope, verifyProjectOwnership } from "@/lib/api-key-auth";
import { createServerInsforge } from "@/lib/insforge/server";
import { checkRateLimit, recordRequest } from "@/lib/rate-limit";

interface TaskCard {
  id: string;
  type: "task" | "subtask";
  parentId?: string;
  featureName: string;
  name: string;
  description: string;
  status: string;
  subtaskCount?: number;
  subtaskCompleted?: number;
  subtasks?: Array<{ id: string; name: string; status: string }>;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * GET /api/v1/projects/:id/kanban
 * Get kanban state — same response as GET /api/kanban/[projectId] (PRD-08).
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

  try {
    const insforge = await createServerInsforge();

    const [featuresRes, tasksRes, subtasksRes, acVersionsRes] = await Promise.all([
      insforge.database
        .from("features")
        .select("id, name, order")
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
      insforge.database
        .from("ac_versions")
        .select("created_at")
        .eq("project_id", projectId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (featuresRes.error) throw featuresRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (subtasksRes.error) throw subtasksRes.error;

    const features = featuresRes.data || [];
    const tasks = tasksRes.data || [];
    const subtasks = subtasksRes.data || [];

    const featureMap = new Map<string, string>();
    for (const f of features) featureMap.set(f.id, f.name);

    const taskSubtasksMap = new Map<string, NonNullable<typeof subtasks>>();
    for (const sub of subtasks) {
      if (!taskSubtasksMap.has(sub.task_id)) taskSubtasksMap.set(sub.task_id, []);
      taskSubtasksMap.get(sub.task_id)!.push(sub);
    }

    const columns: Record<string, TaskCard[]> = {
      pending: [], in_progress: [], completed: [], failed: [],
    };

    const getFeatureName = (featureId: string | null) =>
      featureId ? (featureMap.get(featureId) || "Umum") : "Umum";

    // Tasks as cards
    for (const t of tasks) {
      const relatedSubs = taskSubtasksMap.get(t.id) || [];
      let dependencies: string[] = [];
      try {
        if (Array.isArray(t.dependencies)) dependencies = t.dependencies;
        else if (typeof t.dependencies === "string") dependencies = JSON.parse(t.dependencies);
      } catch { /* ignore */ }

      const card: TaskCard = {
        id: t.id, type: "task", parentId: t.feature_id || undefined,
        featureName: getFeatureName(t.feature_id), name: t.name,
        description: t.description || "", status: t.status,
        subtaskCount: relatedSubs.length,
        subtaskCompleted: relatedSubs.filter((s) => s.status === "completed").length,
        subtasks: relatedSubs.map((s) => ({ id: s.id, name: s.name, status: s.status })),
        dependencies, startedAt: t.started_at, completedAt: t.completed_at,
      };
      (columns[t.status] || columns.pending).push(card);
    }

    // Subtasks as cards
    for (const sub of subtasks) {
      const parentTask = tasks.find((t) => t.id === sub.task_id);
      const card: TaskCard = {
        id: sub.id, type: "subtask", parentId: sub.task_id,
        featureName: parentTask ? getFeatureName(parentTask.feature_id) : "Umum",
        name: sub.name, description: sub.description || "", status: sub.status,
        dependencies: [], startedAt: sub.started_at, completedAt: sub.completed_at,
      };
      (columns[sub.status] || columns.pending).push(card);
    }

    const latestAcAt = acVersionsRes?.data?.created_at;
    const tasksGeneratedAt = tasks.length > 0 ? tasks[0].created_at : null;
    const acChanged = Boolean(latestAcAt && tasksGeneratedAt && new Date(latestAcAt) > new Date(tasksGeneratedAt));

    // Record rate limit request (non-blocking)
    recordRequest(auth.userId, "api_call").catch(() => {});

    return NextResponse.json({
      columns, staleness: "live",
      lastUpdateAt: new Date().toISOString(), acChanged,
    }, { headers: _headers });
  } catch (error) {
    console.error("GET /api/v1/kanban error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
