/**
 * Task tree types + JSON parsing + DB ops.
 *
 * Schema fork: old normalized `features`/`tasks`/`subtasks` tables collapsed
 * into flat `tasks` (project_id, title, description, subtasks jsonb, order).
 * The TaskTree shape (features→tasks→subtasks) is reconstructed from rows:
 * each feature = grouping by convention; here we store one task row per feature
 * with its subtasks as jsonb, since the flat schema has no feature grouping.
 *
 * ponytail: single-row-per-feature is a lossy mapping of the old 3-table model.
 * If feature-level grouping matters, add a `feature` text col to tasks and
 * group by it on read. Sufficient for export (JSON) today.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { advanceStep } from "@/lib/flow-progress";

export interface TaskTree {
  features: Array<{
    name: string;
    tasks: Array<{
      name: string;
      description: string;
      subtasks: Array<{ name: string; description: string; details: string[] }>;
    }>;
  }>;
}

export function parseTaskJson(jsonString: string): TaskTree | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed.features || !Array.isArray(parsed.features) || parsed.features.length === 0) return null;
    for (const feature of parsed.features) {
      if (!feature.name || !Array.isArray(feature.tasks)) return null;
      for (const task of feature.tasks) {
        if (!task.name || !Array.isArray(task.subtasks)) return null;
        for (const subtask of task.subtasks) {
          if (!subtask.name) return null;
          if (subtask.details !== undefined && !Array.isArray(subtask.details)) return null;
          subtask.details = Array.isArray(subtask.details) ? subtask.details : [];
        }
      }
    }
    return parsed as TaskTree;
  } catch {
    return null;
  }
}

/**
 * Save task tree. One `tasks` row per task (not per feature).
 * featureName preserves feature grouping. Each subtask gets status: "pending".
 */
export async function saveTaskTree(
  projectId: string,
  taskTree: TaskTree,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.transaction(async (tx) => {
      await tx.delete(tasks).where(eq(tasks.projectId, projectId));

      let order = 0;
      for (const feature of taskTree.features) {
        for (const task of feature.tasks) {
          const subtaskRows = task.subtasks.map((s) => ({
            name: s.name,
            description: s.description,
            details: s.details ?? [],
            status: "pending" as const,
          }));
          await tx.insert(tasks).values({
            id: crypto.randomUUID(),
            projectId,
            title: task.name,
            description: task.description || null,
            featureName: feature.name,
            status: "pending",
            subtasks: subtaskRows,
            order: order++,
          });
        }
      }

      const [proj] = await tx.select({ step: projects.step }).from(projects).where(eq(projects.id, projectId)).limit(1);
      const updateData: Record<string, unknown> = {
        taskStatus: "completed",
        updatedAt: new Date(),
      };
      const next = advanceStep(proj?.step, "task");
      if (next) updateData.step = next;
      await tx.update(projects).set(updateData).where(eq(projects.id, projectId));
    });
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("saveTaskTree error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Fetch task tree. DB rows are one-per-task with featureName for grouping.
 * Reconstruct features → tasks → subtasks from the flat rows.
 */
export async function getTaskTree(projectId: string): Promise<TaskTree | null> {
  try {
    const rows = await db
      .select({
        title: tasks.title,
        description: tasks.description,
        featureName: tasks.featureName,
        subtasks: tasks.subtasks,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.order));

    if (rows.length === 0) return null;

    const featureMap = new Map<string, TaskTree["features"][number]>();
    for (const row of rows) {
      const fname = row.featureName || "Umum";
      const feature = featureMap.get(fname) ?? (() => {
        const f = { name: fname, tasks: [] as TaskTree["features"][number]["tasks"] };
        featureMap.set(fname, f);
        return f;
      })();

      const subtasks = Array.isArray(row.subtasks)
        ? (row.subtasks as Array<{ name: string; description: string; details?: string[]; status?: string }>)
            .map((s) => ({ name: s.name, description: s.description || "", details: s.details ?? [] }))
        : [];

      // ponytail: feature guaranteed present via lazy-init above; push onto it
      feature.tasks.push({
        name: row.title,
        description: row.description || "",
        subtasks,
      });
    }

    return { features: Array.from(featureMap.values()) };
  } catch (error) {
    console.error("getTaskTree error:", error);
    throw error;
  }
}
