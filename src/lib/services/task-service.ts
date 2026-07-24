/**
 * Task-related database operations.
 * Handles features, tasks, and subtasks CRUD.
 */

// ponytail: InsForge SDK belum expose client types. Ganti dengan typed interface saat tersedia.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsForgeClient = any;

export interface TaskTree {
  features: Array<{
    name: string;
    tasks: Array<{
      name: string;
      description: string;
      subtasks: Array<{
        name: string;
        description: string;
      }>;
    }>;
  }>;
}

/**
 * Parse AI-generated JSON into structured task tree.
 * Validates structure and returns typed data.
 */
export function parseTaskJson(jsonString: string): TaskTree | null {
  try {
    const parsed = JSON.parse(jsonString);

    // Reject empty features — treat as parse failure so the caller surfaces an
    // error instead of silently erasing the prior tree with a "success".
    if (!parsed.features || !Array.isArray(parsed.features) || parsed.features.length === 0) {
      return null;
    }

    for (const feature of parsed.features) {
      if (!feature.name || !Array.isArray(feature.tasks)) {
        return null;
      }
      for (const task of feature.tasks) {
        if (!task.name || !Array.isArray(task.subtasks)) {
          return null;
        }
        for (const subtask of task.subtasks) {
          if (!subtask.name) {
            return null;
          }
        }
      }
    }

    return parsed as TaskTree;
  } catch {
    return null;
  }
}

/**
 * Save task tree to database.
 * ponytail: InsForge SDK has no client-side transaction API, so we delete the
 * OLD tree first, then insert NEW rows, and compensate-delete any partial
 * inserts on failure. A mid-loop failure leaves the project with a partial
 * tree — caller treats this as a retryable error.
 */
export async function saveTaskTree(
  insforge: InsForgeClient,
  projectId: string,
  taskTree: TaskTree,
): Promise<{ success: boolean; error?: string }> {
  const insertedFeatureIds: string[] = [];
  const insertedTaskIds: string[] = [];

  try {
    // Clear existing tree for this project (cascades via FK handle children).
    await insforge.database.from("features").delete().eq("project_id", projectId);

    // Insert new features, tasks, subtasks.
    for (let featureIdx = 0; featureIdx < taskTree.features.length; featureIdx++) {
      const feature = taskTree.features[featureIdx];

      const { data: featureRow, error: featureError } = await insforge.database
        .from("features")
        .insert([{
          project_id: projectId,
          name: feature.name,
          order: featureIdx,
        }])
        .select("id")
        .single();

      if (featureError) throw featureError;
      insertedFeatureIds.push(featureRow.id);

      for (let taskIdx = 0; taskIdx < feature.tasks.length; taskIdx++) {
        const task = feature.tasks[taskIdx];

        const { data: taskRow, error: taskError } = await insforge.database
          .from("tasks")
          .insert([{
            project_id: projectId,
            feature_id: featureRow.id,
            name: task.name,
            description: task.description || null,
            order: taskIdx,
          }])
          .select("id")
          .single();

        if (taskError) throw taskError;
        insertedTaskIds.push(taskRow.id);

        for (let subtaskIdx = 0; subtaskIdx < task.subtasks.length; subtaskIdx++) {
          const subtask = task.subtasks[subtaskIdx];

          const { error: subtaskError } = await insforge.database
            .from("subtasks")
            .insert([{
              project_id: projectId,
              task_id: taskRow.id,
              name: subtask.name,
              description: subtask.description || null,
              order: subtaskIdx,
            }]);

          if (subtaskError) throw subtaskError;
        }
      }
    }

    // Status update — non-fatal if it fails (tree is saved).
    await insforge.database
      .from("projects")
      .update({ task_status: "completed" })
      .eq("id", projectId);

    return { success: true };
  } catch (error) {
    // Compensating cleanup of any partial inserts so stale half-trees don't linger.
    if (insertedTaskIds.length) {
      await insforge.database.from("subtasks").delete().in("task_id", insertedTaskIds)
        .then(() => insforge.database.from("tasks").delete().in("id", insertedTaskIds))
        .catch((e: unknown) => console.error("saveTaskTree cleanup (tasks/subtasks) failed:", e));
    }
    if (insertedFeatureIds.length) {
      await insforge.database.from("features").delete().in("id", insertedFeatureIds)
        .catch((e: unknown) => console.error("saveTaskTree cleanup (features) failed:", e));
    }
    const msg = error instanceof Error ? error.message : String(error);
    console.error("saveTaskTree error:", msg);
    return { success: false, error: msg };
  }
}


/**
 * Get task tree for a project.
 * Returns features with nested tasks and subtasks.
 */
export async function getTaskTree(
  insforge: InsForgeClient,
  projectId: string,
): Promise<TaskTree | null> {
  try {
    const { data: features, error: featuresError } = await insforge.database
      .from("features")
      .select("*")
      .eq("project_id", projectId)
      .order("order", { ascending: true });

    if (featuresError) throw featuresError;
    if (!features || features.length === 0) return null;

    const taskTree: TaskTree = { features: [] };

    for (const feature of features) {
      const { data: tasks, error: tasksError } = await insforge.database
        .from("tasks")
        .select("*")
        .eq("feature_id", feature.id)
        .order("order", { ascending: true });

      if (tasksError) throw tasksError;

      const featureData: TaskTree["features"][number] = {
        name: feature.name,
        tasks: [],
      };

      for (const task of tasks || []) {
        const { data: subtasks, error: subtasksError } = await insforge.database
          .from("subtasks")
          .select("*")
          .eq("task_id", task.id)
          .order("order", { ascending: true });

        if (subtasksError) throw subtasksError;

        featureData.tasks.push({
          name: task.name,
          description: task.description || "",
          subtasks: (subtasks || []).map((st: any) => ({
            name: st.name,
            description: st.description || "",
          })),
        });
      }

      taskTree.features.push(featureData);
    }

    return taskTree;
  } catch (error) {
    // Surface unexpected errors (DB outage, RLS denial) instead of conflating
    // them with "no tree exists" — callers can distinguish via the thrown error.
    console.error("getTaskTree error:", error);
    throw error;
  }
}

