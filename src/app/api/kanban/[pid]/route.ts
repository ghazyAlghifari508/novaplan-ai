export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServerInsforge } from "@/lib/insforge/server";

interface TaskCard {
  id: string;
  type: "task" | "subtask";
  parentId?: string;
  featureName: string;
  name: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  subtaskCount?: number;
  subtaskCompleted?: number;
  subtasks?: Array<{ id: string; name: string; status: string }>;
  dependencies: string[];
  startedAt: string | null;
  completedAt: string | null;
}

/**
 * GET /api/kanban/[pid]
 * Fetch all tasks and subtasks for a project, grouped by status column.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pid: string }> }
) {
  const { pid: projectId } = await params;

  const insforge = await createServerInsforge();
  const {
    data: { user },
  } = await insforge.auth.getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify project ownership
  const { data: project } = await insforge.database
    .from("projects")
    .select("id, name, step")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  try {
    // Parallel fetch features, tasks, subtasks, and AC versions
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

    // Create feature map for quick lookup
    const featureMap = new Map<string, string>();
    for (const f of features) {
      featureMap.set(f.id, f.name);
    }

    // Map subtasks to their tasks to compute task counts
    const taskSubtasksMap = new Map<string, typeof subtasks>();
    for (const sub of subtasks) {
      if (!taskSubtasksMap.has(sub.task_id)) {
        taskSubtasksMap.set(sub.task_id, []);
      }
      taskSubtasksMap.get(sub.task_id)!.push(sub);
    }

    const columns: Record<string, TaskCard[]> = {
      pending: [],
      in_progress: [],
      completed: [],
      failed: [],
    };

    // Helper to get feature name for task
    const getFeatureName = (featureId: string | null) => {
      if (!featureId) return "Umum";
      return featureMap.get(featureId) || "Umum";
    };

    // 1. Process Tasks as main cards
    for (const t of tasks) {
      const relatedSubs = taskSubtasksMap.get(t.id) || [];
      const subtaskCount = relatedSubs.length;
      const subtaskCompleted = relatedSubs.filter(
        (s) => s.status === "completed"
      ).length;

      // Extract dependencies safely from JSONB
      let dependencies: string[] = [];
      try {
        if (Array.isArray(t.dependencies)) {
          dependencies = t.dependencies;
        } else if (typeof t.dependencies === "string") {
          dependencies = JSON.parse(t.dependencies);
        }
      } catch {
        // ignore
      }

      const card: TaskCard = {
        id: t.id,
        type: "task",
        parentId: t.feature_id || undefined,
        featureName: getFeatureName(t.feature_id),
        name: t.name,
        description: t.description || "",
        status: t.status,
        subtaskCount,
        subtaskCompleted,
        subtasks: relatedSubs.map(s => ({ id: s.id, name: s.name, status: s.status })),
        dependencies,
        startedAt: t.started_at,
        completedAt: t.completed_at,
      };

      if (columns[t.status]) {
        columns[t.status].push(card);
      } else {
        columns.pending.push(card);
      }
    }

    // 2. Process Subtasks if they are marked separately (Wait, PRD says:
    // "all tasks/subtasks as cards... cards grouped by feature (feature header within column)"
    // Let's check: if we treat subtasks as separate cards, does it have parents?
    // Parent of a subtask is a task, so we should map featureName of its task.
    // If we only nest them, we don't return subtasks as standalone cards.
    // Let's return them as cards too if status is updateable. But wait!
    // If they are nested, return them inside task card or return as standalone cards?
    // Let's check API contract:
    // columns: { pending: TaskCard[], ... }
    // type: 'task' | 'subtask', parentId?: string (feature_id for tasks, task_id for subtasks)
    // The contract clearly has parentId as task_id for subtasks, meaning they ARE returned as cards!
    // Let's map subtasks as standalone cards too.
    for (const sub of subtasks) {
      const parentTask = tasks.find((t) => t.id === sub.task_id);
      const featureName = parentTask ? getFeatureName(parentTask.feature_id) : "Umum";

      const card: TaskCard = {
        id: sub.id,
        type: "subtask",
        parentId: sub.task_id,
        featureName,
        name: sub.name,
        description: sub.description || "",
        status: sub.status,
        dependencies: [], // subtasks don't have explicit dependencies list in DB
        startedAt: sub.started_at,
        completedAt: sub.completed_at,
      };

      if (columns[sub.status]) {
        columns[sub.status].push(card);
      } else {
        columns.pending.push(card);
      }
    }

    // Check if AC was updated after task tree was generated
    const latestAcAt = acVersionsRes?.data?.created_at;
    const tasksGeneratedAt = tasks.length > 0 ? tasks[0].created_at : null;
    const acChanged = Boolean(
      latestAcAt && tasksGeneratedAt && new Date(latestAcAt) > new Date(tasksGeneratedAt)
    );

    return NextResponse.json({
      columns,
      staleness: "live",
      lastUpdateAt: new Date().toISOString(),
      acChanged,
    });
  } catch (error) {
    console.error("GET kanban error:", error);
    return NextResponse.json(
      { error: "Gagal memuat data kanban" },
      { status: 500 }
    );
  }
}
