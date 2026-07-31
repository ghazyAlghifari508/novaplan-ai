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

export interface TaskTree {
  features: Array<{
    name: string;
    tasks: Array<{
      name: string;
      description: string;
      subtasks: Array<{ name: string; description: string }>;
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
        }
      }
    }
    return parsed as TaskTree;
  } catch {
    return null;
  }
}

/**
 * Save task tree. Each feature becomes one `tasks` row; its tasks' subtasks
 * are flattened into the row's jsonb `subtasks`. Status update non-fatal.
 */
export async function saveTaskTree(
  projectId: string,
  taskTree: TaskTree,
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.delete(tasks).where(eq(tasks.projectId, projectId));

    for (let i = 0; i < taskTree.features.length; i++) {
      const feature = taskTree.features[i];
      const subtasks = feature.tasks.flatMap((t) =>
        t.subtasks.map((s) => ({ name: s.name, description: s.description, parent: t.name })),
      );
      await db.insert(tasks).values({
        id: crypto.randomUUID(),
        projectId,
        title: feature.name,
        description: feature.tasks.map((t) => t.description).join("\n\n") || null,
        subtasks,
        order: i,
      });
    }

    await db.update(projects).set({ taskStatus: "completed", updatedAt: new Date() }).where(eq(projects.id, projectId));
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("saveTaskTree error:", msg);
    return { success: false, error: msg };
  }
}

/**
 * Reconstruct TaskTree from flat tasks rows. Each row = one feature.
 */
export async function getTaskTree(projectId: string): Promise<TaskTree | null> {
  try {
    const rows = await db
      .select({
        title: tasks.title,
        description: tasks.description,
        subtasks: tasks.subtasks,
      })
      .from(tasks)
      .where(eq(tasks.projectId, projectId))
      .orderBy(asc(tasks.order));

    if (rows.length === 0) return null;

    const features: TaskTree["features"] = rows.map((row) => {
      const subtasks = Array.isArray(row.subtasks)
        ? (row.subtasks as Array<{ name: string; description: string; parent?: string }>)
        : [];
      // Group subtasks by parent task name to rebuild the tasks→subtasks nesting.
      const byParent = new Map<string, { name: string; description: string; subtasks: Array<{ name: string; description: string }> }>();
      for (const s of subtasks) {
        const parent = s.parent || s.name;
        if (!byParent.has(parent)) byParent.set(parent, { name: parent, description: "", subtasks: [] });
        byParent.get(parent)!.subtasks.push({ name: s.name, description: s.description });
      }
      return {
        name: row.title,
        tasks: Array.from(byParent.values()),
      };
    });

    return { features };
  } catch (error) {
    console.error("getTaskTree error:", error);
    throw error;
  }
}
